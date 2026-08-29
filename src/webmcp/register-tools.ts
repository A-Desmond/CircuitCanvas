import { circuitToolHandlers } from "./tools";
import { useProjectStore } from "@/store/project-store";

interface ModelContextTool {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute(input: unknown, context?: { signal?: AbortSignal }): unknown | Promise<unknown>;
}

interface ModelContext {
  registerTool(tool: ModelContextTool, options?: { signal?: AbortSignal }): void | Promise<void>;
}

declare global {
  interface Document { modelContext?: ModelContext }
}

export function hasWebMCP(): boolean {
  return typeof document !== "undefined" && Boolean(document.modelContext);
}

const empty = { type: "object", properties: {}, additionalProperties: false };
const componentId = {
  type: "object",
  properties: { componentId: { type: "string", minLength: 1 } },
  required: ["componentId"],
  additionalProperties: false,
};

function withActivity(
  name: string,
  summary: string,
  handler: (input: unknown) => unknown | Promise<unknown>,
) {
  return async (input: unknown) => {
    const id = useProjectStore.getState().activityStart(name, summary);
    try {
      const result = await handler(input);
      useProjectStore.getState().activityFinish(id, "success", summary);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "The operation could not be completed.";
      useProjectStore.getState().activityFinish(id, "failed", message);
      throw new Error(message);
    }
  };
}

function tool(
  name: string,
  title: string,
  description: string,
  inputSchema: Record<string, unknown>,
  readOnly: boolean,
  handler: (input: unknown) => unknown,
): ModelContextTool {
  return {
    name,
    title,
    description,
    inputSchema,
    annotations: { readOnlyHint: readOnly, untrustedContentHint: false },
    execute: withActivity(name, title, handler),
  };
}

export const CIRCUITCANVAS_TOOL_NAMES = [
  "get_circuit_summary",
  "get_component_details",
  "get_available_pins",
  "add_component",
  "remove_component",
  "connect_components",
  "disconnect_components",
  "update_component_property",
  "move_component",
  "select_component",
  "select_connection",
  "set_component_lock",
  "update_firmware",
  "validate_circuit",
  "run_simulation",
  "stop_simulation",
  "save_project", "list_saved_projects", "load_saved_project", "set_project_name",
  "set_potentiometer_wiper", "set_simulation_input", "get_simulation_state", "clear_selection",
  "highlight_component",
  "set_view",
  "load_project",
  "export_project",
  "undo_last_action",
] as const;

export function createCircuitCanvasTools(): ModelContextTool[] {
  return [
    tool("get_circuit_summary", "Read current circuit", "Read a compact summary of the current CircuitCanvas project before diagnosing, explaining, or modifying it.", empty, true, circuitToolHandlers.getCircuitSummary),
    tool("get_component_details", "Read component details", "Read exact pins, properties, connections, issues, and lock state for one component ID.", componentId, true, circuitToolHandlers.getComponentDetails),
    tool("get_available_pins", "Find compatible ESP32 pins", "List controller pins matching a capability so a compatible pin can be chosen without guessing.", {
      type: "object",
      properties: {
        controllerComponentId: { type: "string" },
        capability: { type: "string", enum: ["digital-input", "digital-output", "pwm-output", "analog-input"] },
        excludeUsed: { type: "boolean", default: true },
      },
      required: ["controllerComponentId", "capability"],
      additionalProperties: false,
    }, true, circuitToolHandlers.getAvailablePins),
    tool("add_component", "Add a circuit component", "Add one supported component to the current project through the shared domain command layer.", {
      type: "object",
      properties: {
        kind: { type: "string", enum: COMPONENT_KINDS_FOR_SCHEMA },
        name: { type: "string" }, x: { type: "number" }, y: { type: "number" },
      },
      required: ["kind"], additionalProperties: false,
    }, false, circuitToolHandlers.addComponent),
    tool("remove_component", "Remove a circuit component", "Remove one unlocked component and its attached connections by exact component ID.", componentId, false, circuitToolHandlers.removeComponent),
    tool("connect_components", "Connect component pins", "Connect two exact component pin endpoints in the canonical circuit.", {
      type: "object",
      properties: {
        sourceComponentId: { type: "string" }, sourcePinId: { type: "string" },
        targetComponentId: { type: "string" }, targetPinId: { type: "string" },
      },
      required: ["sourceComponentId", "sourcePinId", "targetComponentId", "targetPinId"], additionalProperties: false,
    }, false, circuitToolHandlers.connectComponents),
    tool("disconnect_components", "Disconnect component pins", "Remove one canonical connection by exact connection ID.", {
      type: "object", properties: { connectionId: { type: "string" } }, required: ["connectionId"], additionalProperties: false,
    }, false, circuitToolHandlers.disconnectComponents),
    tool("update_component_property", "Update a component property", "Update one supported component property, such as resistance, capacitance, tone, servo angle, or sensor level, through validated domain commands.", {
      type: "object",
      properties: { componentId: { type: "string" }, property: { type: "string" }, value: { type: ["string", "number", "boolean"] } },
      required: ["componentId", "property", "value"], additionalProperties: false,
    }, false, circuitToolHandlers.updateComponentProperty),
    tool("move_component", "Move a component", "Move one unlocked component in schematic or physical coordinates through the shared domain command layer.", {
      type: "object",
      properties: { componentId: { type: "string" }, space: { type: "string", enum: ["schematic", "physical"] }, x: { type: "number" }, y: { type: "number" }, z: { type: "number" } },
      required: ["componentId", "space", "x", "y"], additionalProperties: false,
    }, false, circuitToolHandlers.moveComponent),
    tool("select_component", "Select a component", "Select one component by exact ID, or clear the current selection when componentId is omitted.", {
      type: "object", properties: { componentId: { type: "string" } }, additionalProperties: false,
    }, false, circuitToolHandlers.selectComponent),
    tool("select_connection", "Select a connection", "Select one connection by exact ID so the human-facing delete-line action is available, or clear the selection when connectionId is omitted.", {
      type: "object", properties: { connectionId: { type: "string" } }, additionalProperties: false,
    }, false, circuitToolHandlers.selectConnection),
    tool("set_component_lock", "Lock or unlock a component", "Set the lock state of one component. Locked components cannot be moved or removed by a human or agent.", {
      type: "object", properties: { componentId: { type: "string" }, locked: { type: "boolean" } }, required: ["componentId", "locked"], additionalProperties: false,
    }, false, circuitToolHandlers.setComponentLock),
    tool("update_firmware", "Update firmware source", "Apply complete firmware text through the same managed-region parser used by the human code editor. Code outside managed markers is preserved by subsequent circuit sync.", {
      type: "object", properties: { code: { type: "string", maxLength: 200000 } }, required: ["code"], additionalProperties: false,
    }, false, circuitToolHandlers.updateFirmware),
    tool("validate_circuit", "Validate current circuit", "Run deterministic beginner circuit checks and return health and exact issues.", empty, true, circuitToolHandlers.validateCircuit),
    tool("run_simulation", "Run circuit", "Run the validated circuit and energize connected outputs in the schematic and 3D preview.", empty, false, circuitToolHandlers.runSimulation),
    tool("stop_simulation", "Stop circuit", "Stop the live circuit simulation and clear energized outputs.", empty, false, circuitToolHandlers.stopSimulation),
    tool("save_project", "Save project", "Save the current project snapshot locally.", empty, false, circuitToolHandlers.saveProject),
    tool("list_saved_projects", "List saved projects", "List locally saved CircuitCanvas projects.", empty, true, circuitToolHandlers.listSavedProjects),
    tool("load_saved_project", "Load saved project", "Load a saved project by exact project ID.", { type: "object", properties: { projectId: { type: "string" } }, required: ["projectId"], additionalProperties: false }, false, circuitToolHandlers.loadSavedProject),
    tool("set_project_name", "Rename project", "Set the current project name.", { type: "object", properties: { name: { type: "string" } }, required: ["name"], additionalProperties: false }, false, circuitToolHandlers.setProjectName),
    tool("set_potentiometer_wiper", "Set potentiometer wiper", "Set a potentiometer position from 0 to 100 percent.", { type: "object", properties: { componentId: { type: "string" }, positionPercent: { type: "number", minimum: 0, maximum: 100 } }, required: ["componentId", "positionPercent"], additionalProperties: false }, false, circuitToolHandlers.setPotentiometerWiper),
    tool("set_simulation_input", "Set simulation input", "Set a simulated input such as BUTTON_PIN to true or false.", { type: "object", properties: { key: { type: "string" }, value: { type: ["boolean", "number"] } }, required: ["key", "value"], additionalProperties: false }, false, circuitToolHandlers.setSimulationInput),
    tool("get_simulation_state", "Read simulation state", "Read running status, output levels, and simulated inputs.", empty, true, circuitToolHandlers.getSimulationState),
    tool("clear_selection", "Clear selection", "Clear the current component and connection selection.", empty, false, circuitToolHandlers.clearSelection),
    tool("highlight_component", "Highlight a component", "Visibly highlight one exact component in schematic, 3D, and inspector while explaining it.", {
      type: "object", properties: { componentId: { type: "string" }, durationMs: { type: "integer", minimum: 500, maximum: 10000 } },
      required: ["componentId"], additionalProperties: false,
    }, false, circuitToolHandlers.highlightComponent),
    tool("set_view", "Open an editor view", "Switch the visible CircuitCanvas view to schematic, 3D, or code.", {
      type: "object", properties: { view: { type: "string", enum: ["schematic", "3d", "code"] } }, required: ["view"], additionalProperties: false,
    }, false, circuitToolHandlers.setView),
    tool("load_project", "Load a project fixture", "Load the blank project, the Push Button LED hero circuit, or the expanded dummy test circuit.", {
      type: "object", properties: { project: { type: "string", enum: ["blank", "hero", "dummy"] } }, required: ["project"], additionalProperties: false,
    }, false, circuitToolHandlers.loadProject),
    tool("export_project", "Export the circuit", "Download the current canonical circuit as Project JSON or a standalone schematic SVG.", {
      type: "object", properties: { format: { type: "string", enum: ["json", "svg"] } }, required: ["format"], additionalProperties: false,
    }, false, circuitToolHandlers.exportProject),
    tool("undo_last_action", "Undo last project action", "Undo the most recent project mutation, whether it came from a person or agent.", empty, false, circuitToolHandlers.undoLastAction),
  ];
}

const COMPONENT_KINDS_FOR_SCHEMA = [
  "esp32-devkitc-v4",
  "led",
  "resistor",
  "push-button",
  "capacitor",
  "diode",
  "potentiometer",
  "buzzer",
  "servo",
  "photoresistor",
  "npn-transistor",
  "power-3v3",
  "power-5v",
  "ground",
];

export async function registerCircuitCanvasTools(signal: AbortSignal): Promise<boolean> {
  if (!hasWebMCP() || !document.modelContext) return false;
  await Promise.all(createCircuitCanvasTools().map((definition) => document.modelContext?.registerTool(definition, { signal })));
  return true;
}
