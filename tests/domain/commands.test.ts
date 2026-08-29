import { describe, expect, it } from "vitest";
import { applyDomainCommand } from "@/domain/commands";
import { createBlankProject, createHeroProject } from "@/domain/project";

describe("domain commands", () => {
  it("adds a component with defaults without mutating the source project", () => {
    const project = createBlankProject();
    const result = applyDomainCommand(project, { type: "add-component", kind: "led" });
    expect(result.ok).toBe(true);
    expect(Object.keys(project.components)).toHaveLength(0);
    if (!result.ok) return;
    const component = result.data.data as { kind: string; properties: Record<string, unknown> };
    expect(component.kind).toBe("led");
    expect(component.properties).toMatchObject({ color: "red", forwardVoltageReference: 2 });
    expect(Object.values(result.data.project.components)).toHaveLength(1);
  });

  it("removes attached connections with a component", () => {
    const project = createHeroProject();
    const result = applyDomainCommand(project, { type: "remove-component", componentId: "cmp_resistor" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.project.components.cmp_resistor).toBeUndefined();
    expect(Object.values(result.data.project.connections).some((connection) =>
      connection.source.componentId === "cmp_resistor" || connection.target.componentId === "cmp_resistor")).toBe(false);
  });

  it("rejects movement of a locked component without changing state", () => {
    const project = createHeroProject();
    project.components.cmp_esp32.locked = true;
    const result = applyDomainCommand(project, {
      type: "move-component",
      componentId: "cmp_esp32",
      space: "schematic",
      x: 900,
      y: 900,
    });
    expect(result).toMatchObject({ ok: false, error: { code: "COMPONENT_LOCKED" } });
    expect(project.components.cmp_esp32.schematic.x).not.toBe(900);
  });

  it("rejects exact duplicate connections", () => {
    const project = createHeroProject();
    const result = applyDomainCommand(project, {
      type: "connect-pins",
      source: { componentId: "cmp_resistor", pinId: "A" },
      target: { componentId: "cmp_esp32", pinId: "GPIO18" },
    });
    expect(result).toMatchObject({ ok: false, error: { code: "DUPLICATE_CONNECTION" } });
  });

  it("rebinds only the controller endpoint and preserves the connection ID", () => {
    const project = createHeroProject();
    const result = applyDomainCommand(project, {
      type: "rebind-controller-pin",
      componentId: "cmp_led",
      role: "led",
      newPinId: "GPIO19",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.project.connections.conn_led_signal.source.pinId).toBe("GPIO19");
    expect(result.data.project.connections.conn_led_signal.id).toBe("conn_led_signal");
    expect(result.data.project.components.cmp_resistor).toEqual(project.components.cmp_resistor);
  });
});
