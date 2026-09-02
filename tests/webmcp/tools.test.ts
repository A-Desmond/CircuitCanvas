import { beforeEach, describe, expect, it } from "vitest";
import { createBlankProject } from "@/domain/project";
import { useProjectStore } from "@/store/project-store";
import { circuitToolHandlers } from "@/webmcp/tools";
import { createCircuitCanvasTools } from "@/webmcp/register-tools";

describe("WebMCP tool handlers", () => {
  beforeEach(() => {
    useProjectStore.setState({ project: createBlankProject(), past: [], future: [], activities: [] });
  });

  it("exposes the full human-parity tool set", () => {
    expect(createCircuitCanvasTools().map((tool) => tool.name)).toEqual([
      "get_circuit_summary", "get_component_details", "get_available_pins", "add_component",
      "remove_component", "connect_components", "disconnect_components", "update_component_property",
      "move_component", "select_component", "select_connection", "set_component_lock", "update_firmware",
      "validate_circuit", "run_simulation", "stop_simulation", "save_project", "list_saved_projects", "load_saved_project", "set_project_name", "set_potentiometer_wiper", "set_simulation_input", "get_simulation_state", "clear_selection", "highlight_component", "set_view", "load_project", "export_project", "undo_last_action",
    ]);
  });

  it("adds through the same domain store and returns compact output", () => {
    const output = circuitToolHandlers.addComponent({ kind: "resistor", name: "R1" });
    expect(output).toMatchObject({ name: "R1", kind: "resistor" });
    expect(useProjectStore.getState().project.components[output.componentId]).toBeDefined();
    expect(useProjectStore.getState().past).toHaveLength(1);
  });

  it("rejects extra schema fields", () => {
    expect(() => circuitToolHandlers.addComponent({ kind: "led", unexpected: true })).toThrow();
  });

  it("returns compatible pins and excludes input-only outputs", () => {
    const controller = circuitToolHandlers.addComponent({ kind: "esp32-devkitc-v4" });
    const output = circuitToolHandlers.getAvailablePins({
      controllerComponentId: controller.componentId,
      capability: "digital-output",
      excludeUsed: true,
    });
    expect(output.pins.map((pin) => pin.id)).toContain("GPIO18");
    expect(output.excluded.map((pin) => pin.id)).toEqual(expect.arrayContaining(["GPIO34", "GPIO35"]));
  });

  it("updates the visible active view", () => {
    expect(circuitToolHandlers.setView({ view: "3d" })).toEqual({ activeView: "3d" });
    expect(useProjectStore.getState().project.ui.activeView).toBe("3d");
  });

  it("moves, selects, and locks through the shared command layer", () => {
    const added = circuitToolHandlers.addComponent({ kind: "led" });
    const moved = circuitToolHandlers.moveComponent({ componentId: added.componentId, space: "schematic", x: 440, y: 260 });
    expect(moved.position).toMatchObject({ x: 440, y: 260 });
    expect(circuitToolHandlers.selectComponent({ componentId: added.componentId })).toEqual({ selectedComponentId: added.componentId });
    expect(circuitToolHandlers.setComponentLock({ componentId: added.componentId, locked: true })).toMatchObject({ locked: true });
    expect(() => circuitToolHandlers.moveComponent({ componentId: added.componentId, space: "schematic", x: 10, y: 10 })).toThrow(/COMPONENT_LOCKED/);
  });

});
