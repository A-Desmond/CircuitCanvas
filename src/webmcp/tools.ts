import { z } from "zod";
import { COMPONENT_DEFINITIONS, COMPONENT_KINDS } from "@/domain/component-definitions";
import { getConnectionsForComponent } from "@/domain/graph";
import type { ComponentKind, PinCapability } from "@/domain/types";
import { useProjectStore } from "@/store/project-store";
import { exportProjectJson, exportSchematicSvg } from "@/lib/export-project";

const emptySchema = z.object({}).strict();
const componentIdSchema = z.object({ componentId: z.string().min(1) }).strict();
const addSchema = z.object({
  kind: z.enum(COMPONENT_KINDS as [ComponentKind, ...ComponentKind[]]),
  name: z.string().min(1).optional(),
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
}).strict();
const connectSchema = z.object({
  sourceComponentId: z.string().min(1),
  sourcePinId: z.string().min(1),
  targetComponentId: z.string().min(1),
  targetPinId: z.string().min(1),
}).strict();
const disconnectSchema = z.object({ connectionId: z.string().min(1) }).strict();
const propertySchema = z.object({
  componentId: z.string().min(1),
  property: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()]),
}).strict();
const pinSchema = z.object({
  controllerComponentId: z.string().min(1),
  capability: z.enum(["digital-input", "digital-output", "pwm-output", "analog-input"]),
  excludeUsed: z.boolean().default(true),
}).strict();
const highlightSchema = z.object({ componentId: z.string().min(1), durationMs: z.number().int().optional() }).strict();
const viewSchema = z.object({ view: z.enum(["schematic", "3d", "code"]) }).strict();
const moveSchema = z.object({ componentId: z.string().min(1), space: z.enum(["schematic", "physical"]), x: z.number().finite(), y: z.number().finite(), z: z.number().finite().optional() }).strict();
const selectSchema = z.object({ componentId: z.string().min(1).optional() }).strict();
const selectConnectionSchema = z.object({ connectionId: z.string().min(1).optional() }).strict();
const lockSchema = z.object({ componentId: z.string().min(1), locked: z.boolean() }).strict();
const firmwareSchema = z.object({ code: z.string().max(200_000) }).strict();
const loadProjectSchema = z.object({ project: z.enum(["blank", "hero", "dummy"]) }).strict();
const exportSchema = z.object({ format: z.enum(["json", "svg"]) }).strict();
const nameSchema = z.object({ name: z.string().trim().min(1).max(120) }).strict();
const savedProjectSchema = z.object({ projectId: z.string().min(1) }).strict();
const potSchema = z.object({ componentId: z.string().min(1), positionPercent: z.number().min(0).max(100) }).strict();
const inputSchema = z.object({ key: z.string().min(1), value: z.union([z.boolean(), z.number()]) }).strict();

function assertResult<T>(result: { ok: true; data: T } | { ok: false; error: { code: string; message: string } }): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}

export function getPublicCircuitSummary() {
  const project = useProjectStore.getState().project;
  return {
    projectName: project.name,
    activeView: project.ui.activeView,
    components: Object.values(project.components).map(({ id, kind, name }) => ({ id, kind, name })),
    connections: Object.values(project.connections).map((connection) => ({
      id: connection.id,
      from: `${project.components[connection.source.componentId]?.name}.${connection.source.pinId}`,
      to: `${project.components[connection.target.componentId]?.name}.${connection.target.pinId}`,
      role: connection.role,
    })),
    firmwareBindings: Object.fromEntries(
      project.firmware.bindings.map((binding) => [binding.symbolName, Number(binding.controllerPinId.replace("GPIO", ""))]),
    ),
    healthScore: project.validation.report?.score ?? null,
    valid: project.validation.report?.valid ?? null,
    issues: project.validation.report?.issues.map(({ id, ruleId, severity, title, message, componentIds }) => ({
      id, ruleId, severity, title, message, componentIds,
    })) ?? [],
    selectedComponentId: project.ui.selectedComponentId ?? null,
    lockedComponentIds: Object.values(project.components).filter((component) => component.locked).map((component) => component.id),
    simulation: project.ui.simulation,
  };
}

export const circuitToolHandlers = {
  getCircuitSummary(input: unknown) {
    emptySchema.parse(input);
    return getPublicCircuitSummary();
  },
  getComponentDetails(input: unknown) {
    const { componentId } = componentIdSchema.parse(input);
    const project = useProjectStore.getState().project;
    const component = project.components[componentId];
    if (!component) throw new Error(`COMPONENT_NOT_FOUND: Component ${componentId} was not found.`);
    const definition = COMPONENT_DEFINITIONS[component.kind];
    return {
      id: component.id,
      name: component.name,
      kind: component.kind,
      description: definition.description,
      properties: component.properties,
      pins: definition.pins.map(({ id, label, capabilities, inputOnly }) => ({ id, label, capabilities, inputOnly: Boolean(inputOnly) })),
      connections: getConnectionsForComponent(project, component.id).map((connection) => ({
        id: connection.id,
        from: `${project.components[connection.source.componentId]?.name}.${connection.source.pinId}`,
        to: `${project.components[connection.target.componentId]?.name}.${connection.target.pinId}`,
      })),
      issues: project.validation.report?.issues.filter((issue) => issue.componentIds.includes(component.id)) ?? [],
      locked: component.locked,
    };
  },
  getAvailablePins(input: unknown) {
    const { controllerComponentId, capability, excludeUsed } = pinSchema.parse(input);
    const project = useProjectStore.getState().project;
    const controller = project.components[controllerComponentId];
    if (!controller || controller.kind !== "esp32-devkitc-v4") throw new Error("COMPONENT_NOT_FOUND: ESP32 controller was not found.");
    const used = new Set(Object.values(project.connections).flatMap((connection) => [connection.source, connection.target])
      .filter((endpoint) => endpoint.componentId === controller.id).map((endpoint) => endpoint.pinId));
    const pins = COMPONENT_DEFINITIONS[controller.kind].pins;
    return {
      pins: pins.filter((pin) => pin.capabilities.includes(capability as PinCapability) && (!excludeUsed || !used.has(pin.id)))
        .map(({ id, label, capabilities }) => ({ id, label, capabilities })),
      excluded: pins.filter((pin) => pin.inputOnly && capability === "digital-output")
        .map((pin) => ({ id: pin.id, reason: "Input-only pin" })),
    };
  },
  addComponent(input: unknown) {
    const value = addSchema.parse(input);
    const result = useProjectStore.getState().executeCommand(
      { type: "add-component", ...value },
      { origin: "webmcp", actor: "agent", description: `Added ${value.kind}` },
    );
    const component = assertResult(result) as { id: string; name: string; kind: ComponentKind };
    return { componentId: component.id, name: component.name, kind: component.kind };
  },
  removeComponent(input: unknown) {
    const { componentId } = componentIdSchema.parse(input);
    const component = assertResult(useProjectStore.getState().executeCommand(
      { type: "remove-component", componentId },
      { origin: "webmcp", actor: "agent", description: "Removed component" },
    )) as { id: string; name: string; kind: ComponentKind };
    return { componentId: component.id, name: component.name, kind: component.kind, removed: true };
  },
  connectComponents(input: unknown) {
    const value = connectSchema.parse(input);
    const connection = assertResult(useProjectStore.getState().executeCommand(
      {
        type: "connect-pins",
        source: { componentId: value.sourceComponentId, pinId: value.sourcePinId },
        target: { componentId: value.targetComponentId, pinId: value.targetPinId },
      },
      { origin: "webmcp", actor: "agent", description: "Connected component pins" },
    )) as { id: string; source: unknown; target: unknown };
    return { connectionId: connection.id, source: connection.source, target: connection.target };
  },
  disconnectComponents(input: unknown) {
    const { connectionId } = disconnectSchema.parse(input);
    const connection = assertResult(useProjectStore.getState().executeCommand(
      { type: "disconnect-connection", connectionId },
      { origin: "webmcp", actor: "agent", description: "Disconnected component pins" },
    )) as { id: string; source: unknown; target: unknown };
    return { connectionId: connection.id, source: connection.source, target: connection.target, disconnected: true };
  },
  updateComponentProperty(input: unknown) {
    const value = propertySchema.parse(input);
    const component = assertResult(useProjectStore.getState().executeCommand(
      { type: "update-component-property", ...value },
      { origin: "webmcp", actor: "agent", description: `Updated ${value.property}` },
    )) as { id: string; name: string; properties: Record<string, unknown> };
    return { componentId: component.id, name: component.name, property: value.property, value: component.properties[value.property] };
  },
  moveComponent(input: unknown) {
    const value = moveSchema.parse(input);
    const component = assertResult(useProjectStore.getState().executeCommand(
      { type: "move-component", ...value },
      { origin: "webmcp", actor: "agent", description: `Moved component in ${value.space}` },
    )) as { id: string; name: string; schematic: unknown; physical: unknown };
    return { componentId: component.id, name: component.name, space: value.space, position: value.space === "schematic" ? component.schematic : component.physical };
  },
  selectComponent(input: unknown) {
    const value = selectSchema.parse(input);
    const selected = assertResult(useProjectStore.getState().executeCommand(
      { type: "select-component", componentId: value.componentId },
      { origin: "webmcp", actor: "agent", description: value.componentId ? "Selected component" : "Cleared component selection" },
    )) as string | undefined;
    return { selectedComponentId: selected ?? null };
  },
  selectConnection(input: unknown) {
    const value = selectConnectionSchema.parse(input);
    const selected = assertResult(useProjectStore.getState().executeCommand(
      { type: "select-connection", connectionId: value.connectionId },
      { origin: "webmcp", actor: "agent", description: value.connectionId ? "Selected connection" : "Cleared connection selection" },
    )) as string | undefined;
    return { selectedConnectionId: selected ?? null };
  },
  setComponentLock(input: unknown) {
    const value = lockSchema.parse(input);
    const component = assertResult(useProjectStore.getState().executeCommand(
      { type: "set-component-lock", ...value },
      { origin: "webmcp", actor: "agent", description: `${value.locked ? "Locked" : "Unlocked"} component` },
    )) as { id: string; name: string; locked: boolean };
    return { componentId: component.id, name: component.name, locked: component.locked };
  },
  updateFirmware(input: unknown) {
    const { code } = firmwareSchema.parse(input);
    const result = useProjectStore.getState().applyFirmwareCode(code, { origin: "webmcp", actor: "agent", description: "Updated firmware source" });
    const firmware = assertResult(result) as { sync: unknown; bindings: unknown };
    return { sync: firmware.sync, bindings: firmware.bindings };
  },
  validateCircuit(input: unknown) {
    emptySchema.parse(input);
    useProjectStore.getState().validate();
    const report = useProjectStore.getState().project.validation.report;
    return { valid: report?.valid ?? false, healthScore: report?.score ?? 0, issues: report?.issues ?? [] };
  },
  runSimulation(input: unknown) {
    emptySchema.parse(input);
    const simulation = assertResult(useProjectStore.getState().executeCommand(
      { type: "run-simulation" },
      { origin: "webmcp", actor: "agent", description: "Ran circuit simulation" },
    )) as { status: string; message?: string; energizedComponentIds: string[] };
    return simulation;
  },
  stopSimulation(input: unknown) {
    emptySchema.parse(input);
    assertResult(useProjectStore.getState().executeCommand(
      { type: "stop-simulation" },
      { origin: "webmcp", actor: "agent", description: "Stopped circuit simulation" },
    ));
    return useProjectStore.getState().project.ui.simulation;
  },
  saveProject(input: unknown) { emptySchema.parse(input); useProjectStore.getState().saveProject(); return { saved: true, projectId: useProjectStore.getState().project.id, projectName: useProjectStore.getState().project.name }; },
  listSavedProjects(input: unknown) { emptySchema.parse(input); return { projects: useProjectStore.getState().listSavedProjects() }; },
  loadSavedProject(input: unknown) { const { projectId } = savedProjectSchema.parse(input); if (!useProjectStore.getState().loadSavedProject(projectId)) throw new Error("PROJECT_NOT_FOUND: Saved project was not found."); return { loaded: true, summary: getPublicCircuitSummary() }; },
  setProjectName(input: unknown) { const { name } = nameSchema.parse(input); assertResult(useProjectStore.getState().executeCommand({ type: "set-project-name", name }, { origin: "webmcp", actor: "agent", description: "Renamed project" })); return { name }; },
  setPotentiometerWiper(input: unknown) { const value = potSchema.parse(input); const component = useProjectStore.getState().project.components[value.componentId]; if (!component || component.kind !== "potentiometer") throw new Error("COMPONENT_NOT_FOUND: Potentiometer was not found."); assertResult(useProjectStore.getState().executeCommand({ type: "update-component-property", componentId: value.componentId, property: "positionPercent", value: value.positionPercent }, { origin: "webmcp", actor: "agent", description: "Adjusted potentiometer wiper" })); return { componentId: value.componentId, positionPercent: value.positionPercent }; },
  setSimulationInput(input: unknown) { const value = inputSchema.parse(input); assertResult(useProjectStore.getState().executeCommand({ type: "set-simulation-input", ...value }, { origin: "webmcp", actor: "agent", description: `Set simulation input ${value.key}` })); return useProjectStore.getState().project.ui.simulation; },
  getSimulationState(input: unknown) { emptySchema.parse(input); return useProjectStore.getState().project.ui.simulation; },
  clearSelection(input: unknown) { emptySchema.parse(input); assertResult(useProjectStore.getState().executeCommand({ type: "select-component", componentId: undefined }, { origin: "webmcp", actor: "agent", description: "Cleared selection" })); return { selectedComponentId: null, selectedConnectionId: null }; },
  highlightComponent(input: unknown) {
    const { componentId, durationMs } = highlightSchema.parse(input);
    const project = useProjectStore.getState().project;
    if (!project.components[componentId]) throw new Error(`COMPONENT_NOT_FOUND: Component ${componentId} was not found.`);
    const duration = Math.min(10_000, Math.max(500, durationMs ?? 4_000));
    assertResult(useProjectStore.getState().executeCommand(
      { type: "highlight-components", componentIds: [componentId] },
      { origin: "webmcp", actor: "agent", description: "Highlighted component" },
    ));
    globalThis.setTimeout(() => {
      useProjectStore.getState().executeCommand(
        { type: "highlight-components", componentIds: [] },
        { origin: "system-sync", actor: "system" },
      );
    }, duration);
    return { componentId, durationMs: duration, highlighted: true };
  },
  setView(input: unknown) {
    const { view } = viewSchema.parse(input);
    assertResult(useProjectStore.getState().executeCommand(
      { type: "set-active-view", view },
      { origin: "webmcp", actor: "agent", description: `Opened ${view} view` },
    ));
    return { activeView: view };
  },
  loadProject(input: unknown) {
    const { project } = loadProjectSchema.parse(input);
    const store = useProjectStore.getState();
    if (project === "blank") store.resetProject();
    else if (project === "hero") store.loadExample();
    else store.loadDummy();
    return { project: project === "hero" ? "hero" : project, summary: getPublicCircuitSummary() };
  },
  exportProject(input: unknown) {
    const { format } = exportSchema.parse(input);
    const project = useProjectStore.getState().project;
    if (typeof document === "undefined") throw new Error("UNSUPPORTED_OPERATION: Export is only available in a browser context.");
    const content = format === "json" ? exportProjectJson(project) : exportSchematicSvg(project);
    return { format, projectName: project.name, exported: true, content };
  },
  undoLastAction(input: unknown) {
    emptySchema.parse(input);
    assertResult(useProjectStore.getState().undo({ origin: "webmcp", actor: "agent", description: "Undid last project mutation" }));
    return { undone: true, summary: getPublicCircuitSummary() };
  },
};
