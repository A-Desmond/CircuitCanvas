import { COMPONENT_DEFINITIONS, createComponent, getPinDefinition } from "./component-definitions";
import { endpointKey, findConnectedControllerPin } from "./graph";
import type {
  CircuitConnection,
  CircuitProject,
  CommandResult,
  ComponentKind,
  Endpoint,
} from "./types";
import { createId } from "@/lib/ids";
import { validateCircuit } from "@/validation/validate-circuit";
import { simulateFirmware } from "@/firmware/simulate-firmware";

export type DomainCommand =
  | { type: "add-component"; kind: ComponentKind; name?: string; x?: number; y?: number }
  | { type: "remove-component"; componentId: string }
  | { type: "move-component"; componentId: string; space: "schematic" | "physical"; x: number; y: number; z?: number }
  | { type: "connect-pins"; source: Endpoint; target: Endpoint }
  | { type: "disconnect-connection"; connectionId: string }
  | { type: "update-component-property"; componentId: string; property: string; value: unknown }
  | { type: "rebind-controller-pin"; componentId: string; role: "led" | "button"; newPinId: string }
  | { type: "select-component"; componentId?: string }
  | { type: "select-connection"; connectionId?: string }
  | { type: "highlight-components"; componentIds: string[] }
  | { type: "set-active-view"; view: "schematic" | "3d" | "code" }
  | { type: "set-component-lock"; componentId: string; locked: boolean }
  | { type: "run-simulation" }
  | { type: "stop-simulation" }
  | { type: "set-simulation-input"; key: string; value: boolean | number }
  | { type: "set-project-name"; name: string };

export interface AppliedCommand {
  project: CircuitProject;
  data: unknown;
  historical: boolean;
  electrical: boolean;
}

function fail(code: Parameters<typeof makeError>[0], message: string): CommandResult<AppliedCommand> {
  return { ok: false, error: makeError(code, message) };
}

function makeError(
  code:
    | "COMPONENT_NOT_FOUND"
    | "PIN_NOT_FOUND"
    | "COMPONENT_LOCKED"
    | "CONNECTION_NOT_FOUND"
    | "DUPLICATE_CONNECTION"
    | "INVALID_PROPERTY"
    | "INVALID_PIN_BINDING"
    | "UNSUPPORTED_OPERATION",
  message: string,
) {
  return { code, message } as const;
}

function classifyConnection(project: CircuitProject, source: Endpoint, target: Endpoint): Pick<CircuitConnection, "role" | "wireStyle"> {
  const capabilities = [source, target].flatMap((endpoint) => {
    const component = project.components[endpoint.componentId];
    return component ? getPinDefinition(component.kind, endpoint.pinId)?.capabilities ?? [] : [];
  });
  if (capabilities.includes("ground")) return { role: "ground", wireStyle: { semanticColor: "ground" } };
  if (capabilities.includes("power-3v3") || capabilities.includes("power-5v")) {
    return { role: "power", wireStyle: { semanticColor: "power" } };
  }
  return { role: "signal", wireStyle: { semanticColor: "signal" } };
}

function validateEndpoint(project: CircuitProject, endpoint: Endpoint): CommandResult<true> {
  const component = project.components[endpoint.componentId];
  if (!component) return { ok: false, error: makeError("COMPONENT_NOT_FOUND", `Component ${endpoint.componentId} was not found.`) };
  if (!getPinDefinition(component.kind, endpoint.pinId)) {
    return { ok: false, error: makeError("PIN_NOT_FOUND", `Pin ${endpoint.pinId} does not exist on ${component.name}.`) };
  }
  return { ok: true, data: true };
}

function withUpdatedAt(project: CircuitProject): CircuitProject {
  return { ...project, metadata: { ...project.metadata, updatedAt: new Date().toISOString() } };
}

export function applyDomainCommand(project: CircuitProject, command: DomainCommand): CommandResult<AppliedCommand> {
  switch (command.type) {
    case "add-component": {
      if (command.kind === "esp32-devkitc-v4" && Object.values(project.components).some((component) => component.kind === command.kind)) {
        return fail("UNSUPPORTED_OPERATION", "The MVP supports one ESP32 controller per project.");
      }
      const component = createComponent(command.kind, project.components, command);
      const next = withUpdatedAt({ ...project, components: { ...project.components, [component.id]: component } });
      return { ok: true, data: { project: next, data: component, historical: true, electrical: true } };
    }
    case "remove-component": {
      const component = project.components[command.componentId];
      if (!component) return fail("COMPONENT_NOT_FOUND", `Component ${command.componentId} was not found.`);
      if (component.locked) return fail("COMPONENT_LOCKED", `${component.name} is locked and cannot be removed.`);
      const components = { ...project.components };
      delete components[component.id];
      const connections = Object.fromEntries(
        Object.entries(project.connections).filter(([, connection]) =>
          connection.source.componentId !== component.id && connection.target.componentId !== component.id),
      );
      const next = withUpdatedAt({
        ...project,
        components,
        connections,
        ui: {
          ...project.ui,
          selectedComponentId: project.ui.selectedComponentId === component.id ? undefined : project.ui.selectedComponentId,
          highlightedComponentIds: project.ui.highlightedComponentIds.filter((id) => id !== component.id),
        },
      });
      return { ok: true, data: { project: next, data: component, historical: true, electrical: true } };
    }
    case "move-component": {
      const component = project.components[command.componentId];
      if (!component) return fail("COMPONENT_NOT_FOUND", `Component ${command.componentId} was not found.`);
      if (component.locked) return fail("COMPONENT_LOCKED", `${component.name} is locked and cannot be moved.`);
      const moved = command.space === "schematic"
        ? { ...component, schematic: { ...component.schematic, x: command.x, y: command.y } }
        : { ...component, physical: { ...component.physical, x: command.x, y: command.y, z: command.z ?? component.physical.z } };
      const next = withUpdatedAt({ ...project, components: { ...project.components, [component.id]: moved } });
      return { ok: true, data: { project: next, data: moved, historical: true, electrical: false } };
    }
    case "connect-pins": {
      const sourceValid = validateEndpoint(project, command.source);
      if (!sourceValid.ok) return sourceValid;
      const targetValid = validateEndpoint(project, command.target);
      if (!targetValid.ok) return targetValid;
      if (endpointKey(command.source) === endpointKey(command.target)) {
        return fail("DUPLICATE_CONNECTION", "A pin cannot be connected to itself.");
      }
      const duplicate = Object.values(project.connections).some((connection) => {
        const existing = [endpointKey(connection.source), endpointKey(connection.target)].sort().join("|");
        const requested = [endpointKey(command.source), endpointKey(command.target)].sort().join("|");
        return existing === requested;
      });
      if (duplicate) return fail("DUPLICATE_CONNECTION", "That exact connection already exists.");
      const id = createId("conn");
      const connection: CircuitConnection = {
        id,
        source: command.source,
        target: command.target,
        ...classifyConnection(project, command.source, command.target),
      };
      const next = withUpdatedAt({ ...project, connections: { ...project.connections, [id]: connection } });
      return { ok: true, data: { project: next, data: connection, historical: true, electrical: true } };
    }
    case "disconnect-connection": {
      const connection = project.connections[command.connectionId];
      if (!connection) return fail("CONNECTION_NOT_FOUND", `Connection ${command.connectionId} was not found.`);
      const connections = { ...project.connections };
      delete connections[connection.id];
      const next = withUpdatedAt({ ...project, connections, ui: { ...project.ui, selectedConnectionId: project.ui.selectedConnectionId === connection.id ? undefined : project.ui.selectedConnectionId } });
      return { ok: true, data: { project: next, data: connection, historical: true, electrical: true } };
    }
    case "update-component-property": {
      const component = project.components[command.componentId];
      if (!component) return fail("COMPONENT_NOT_FOUND", `Component ${command.componentId} was not found.`);
      const allowed = Object.keys(COMPONENT_DEFINITIONS[component.kind].defaultProperties);
      if (!allowed.includes(command.property)) return fail("INVALID_PROPERTY", `${command.property} is not editable on ${component.name}.`);
      if (command.property === "resistanceOhms" && (typeof command.value !== "number" || command.value <= 0 || command.value > 10_000_000)) {
        return fail("INVALID_PROPERTY", "Resistance must be a positive number no greater than 10,000,000 Ω.");
      }
      const numericRanges: Record<string, { min: number; max: number; label: string }> = {
        capacitanceUf: { min: 0.001, max: 1_000_000, label: "Capacitance" },
        frequencyHz: { min: 20, max: 20_000, label: "Frequency" },
        angle: { min: 0, max: 180, label: "Servo angle" },
        lightLevel: { min: 0, max: 100, label: "Light level" },
        positionPercent: { min: 0, max: 100, label: "Wiper position" },
      };
      const range = numericRanges[command.property];
      if (range && (typeof command.value !== "number" || command.value < range.min || command.value > range.max)) {
        return fail("INVALID_PROPERTY", `${range.label} must be between ${range.min} and ${range.max}.`);
      }
      const updated = { ...component, properties: { ...component.properties, [command.property]: command.value } };
      const next = withUpdatedAt({ ...project, components: { ...project.components, [component.id]: updated } });
      return { ok: true, data: { project: next, data: updated, historical: true, electrical: true } };
    }
    case "rebind-controller-pin": {
      const component = project.components[command.componentId];
      if (!component) return fail("COMPONENT_NOT_FOUND", `Component ${command.componentId} was not found.`);
      const controller = Object.values(project.components).find((candidate) => candidate.kind === "esp32-devkitc-v4");
      if (!controller) return fail("COMPONENT_NOT_FOUND", "The project has no ESP32 controller.");
      const pin = getPinDefinition(controller.kind, command.newPinId);
      if (!pin) return fail("PIN_NOT_FOUND", `${command.newPinId} is not exposed by the ESP32 beginner profile.`);
      const requiredCapability = command.role === "led" ? "digital-output" : "digital-input";
      if (!pin.capabilities.includes(requiredCapability) || (command.role === "led" && pin.inputOnly)) {
        return fail("INVALID_PIN_BINDING", `${command.newPinId} cannot be used as the ${command.role} ${requiredCapability} pin.`);
      }
      const startPin = command.role === "led" ? "ANODE" : "A";
      const trace = findConnectedControllerPin(project, { componentId: component.id, pinId: startPin })
        ?? (command.role === "button" ? findConnectedControllerPin(project, { componentId: component.id, pinId: "B" }) : undefined);
      if (!trace) return fail("INVALID_PIN_BINDING", `No controller-side ${command.role} connection could be rebound.`);
      const connection = Object.values(project.connections).find((candidate) =>
        (candidate.source.componentId === controller.id && candidate.source.pinId === trace.endpoint.pinId)
        || (candidate.target.componentId === controller.id && candidate.target.pinId === trace.endpoint.pinId));
      if (!connection) return fail("CONNECTION_NOT_FOUND", "The controller-side connection was not found.");
      const updated: CircuitConnection = {
        ...connection,
        source: connection.source.componentId === controller.id ? { ...connection.source, pinId: command.newPinId } : connection.source,
        target: connection.target.componentId === controller.id ? { ...connection.target, pinId: command.newPinId } : connection.target,
      };
      const next = withUpdatedAt({
        ...project,
        connections: { ...project.connections, [connection.id]: { ...updated, ...classifyConnection(project, updated.source, updated.target) } },
      });
      return { ok: true, data: { project: next, data: updated, historical: true, electrical: true } };
    }
    case "select-component": {
      if (command.componentId && !project.components[command.componentId]) {
        return fail("COMPONENT_NOT_FOUND", `Component ${command.componentId} was not found.`);
      }
      return {
        ok: true,
        data: {
          project: { ...project, ui: { ...project.ui, selectedComponentId: command.componentId, selectedConnectionId: undefined } },
          data: command.componentId,
          historical: false,
          electrical: false,
        },
      };
    }
    case "select-connection": {
      if (command.connectionId && !project.connections[command.connectionId]) {
        return fail("CONNECTION_NOT_FOUND", `Connection ${command.connectionId} was not found.`);
      }
      return {
        ok: true,
        data: {
          project: { ...project, ui: { ...project.ui, selectedConnectionId: command.connectionId, selectedComponentId: undefined } },
          data: command.connectionId,
          historical: false,
          electrical: false,
        },
      };
    }
    case "highlight-components": {
      const componentIds = command.componentIds.filter((id) => Boolean(project.components[id]));
      return {
        ok: true,
        data: { project: { ...project, ui: { ...project.ui, highlightedComponentIds: componentIds } }, data: componentIds, historical: false, electrical: false },
      };
    }
    case "set-active-view":
      return {
        ok: true,
        data: { project: { ...project, ui: { ...project.ui, activeView: command.view } }, data: command.view, historical: false, electrical: false },
      };
    case "set-component-lock": {
      const component = project.components[command.componentId];
      if (!component) return fail("COMPONENT_NOT_FOUND", `Component ${command.componentId} was not found.`);
      const updated = { ...component, locked: command.locked };
      const next = withUpdatedAt({ ...project, components: { ...project.components, [component.id]: updated } });
      return { ok: true, data: { project: next, data: updated, historical: true, electrical: false } };
    }
    case "run-simulation": {
      const report = validateCircuit(project);
      if (!report.valid) {
        const firstIssue = report.issues.find((item) => item.severity === "critical" || item.severity === "high") ?? report.issues[0];
        const next = { ...project, validation: { report, lastRunAt: new Date().toISOString() }, ui: { ...project.ui, simulation: {
          status: "error" as const,
          message: firstIssue ? firstIssue.title : "Circuit needs attention before it can run.",
          energizedComponentIds: [], componentLevels: {}, inputs: project.ui.simulation.inputs,
          lastRunAt: new Date().toISOString(),
        } } };
        return { ok: true, data: { project: next, data: next.ui.simulation, historical: false, electrical: false } };
      }
      const firmwareResult = simulateFirmware(project);
      const next = { ...project, validation: { report, lastRunAt: new Date().toISOString() }, ui: { ...project.ui, simulation: {
        status: "running" as const,
        message: firmwareResult.message,
        energizedComponentIds: firmwareResult.energizedComponentIds,
        componentLevels: firmwareResult.componentLevels,
        inputs: project.ui.simulation.inputs,
        lastRunAt: new Date().toISOString(),
      } } };
      return { ok: true, data: { project: next, data: next.ui.simulation, historical: false, electrical: false } };
    }
    case "stop-simulation": {
      const next = { ...project, ui: { ...project.ui, simulation: { status: "stopped" as const, message: "Circuit stopped", energizedComponentIds: [], componentLevels: {}, inputs: project.ui.simulation.inputs } } };
      return { ok: true, data: { project: next, data: next.ui.simulation, historical: false, electrical: false } };
    }
    case "set-simulation-input": {
      const next = { ...project, ui: { ...project.ui, simulation: { ...project.ui.simulation, inputs: { ...project.ui.simulation.inputs, [command.key]: command.value } } } };
      const rerun = next.ui.simulation.status === "running" ? applyDomainCommand(next, { type: "run-simulation" }) : { ok: true as const, data: { project: next } as AppliedCommand };
      if (!rerun.ok) return rerun;
      return { ok: true, data: { ...rerun.data, historical: false, electrical: false } };
    }
    case "set-project-name": {
      const name = command.name.trim();
      if (!name) return fail("INVALID_PROPERTY", "Project name cannot be empty.");
      return { ok: true, data: { project: withUpdatedAt({ ...project, name }), data: name, historical: true, electrical: false } };
    }
    default: {
      const exhaustive: never = command;
      return fail("UNSUPPORTED_OPERATION", `Unsupported command: ${String(exhaustive)}`);
    }
  }
}
