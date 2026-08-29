import { describe, expect, it } from "vitest";
import { applyDomainCommand } from "@/domain/commands";
import {
  buildAdjacency,
  findConnectedControllerPin,
  hasGroundPath,
  pathContainsComponentKind,
} from "@/domain/graph";
import { createHeroProject } from "@/domain/project";

describe("electrical graph", () => {
  it("builds adjacency including passive component terminals", () => {
    const project = createHeroProject();
    const adjacency = buildAdjacency(project);
    expect(adjacency.get("cmp_resistor:A")).toContain("cmp_resistor:B");
    expect(adjacency.get("cmp_esp32:GPIO18")).toContain("cmp_resistor:A");
  });

  it("finds the LED controller path through the resistor", () => {
    const project = createHeroProject();
    const trace = findConnectedControllerPin(project, { componentId: "cmp_led", pinId: "ANODE" });
    expect(trace?.endpoint.pinId).toBe("GPIO18");
    expect(trace && pathContainsComponentKind(project, trace.path, "resistor")).toBe(true);
  });

  it("finds the LED ground path and loses it after deletion", () => {
    const project = createHeroProject();
    const cathode = { componentId: "cmp_led", pinId: "CATHODE" };
    expect(hasGroundPath(project, cathode)).toBe(true);
    delete project.connections.conn_led_ground;
    expect(hasGroundPath(project, cathode)).toBe(false);
  });

  it("treats expanded two-terminal parts as graph elements", () => {
    const project = createHeroProject();
    const capacitor = Object.values(project.components).find((component) => component.kind === "capacitor");
    expect(capacitor).toBeUndefined();
    const result = applyDomainCommand(project, { type: "add-component", kind: "photoresistor" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const photo = Object.values(result.data.project.components).find((component) => component.kind === "photoresistor");
    expect(photo).toBeDefined();
    if (!photo) return;
    const next = applyDomainCommand(result.data.project, {
      type: "connect-pins", source: { componentId: "cmp_esp32", pinId: "GPIO19" }, target: { componentId: photo.id, pinId: "A" },
    });
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    const other = buildAdjacency(next.data.project);
    expect(other.get(`${photo.id}:A`)).toContain(`${photo.id}:B`);
  });
});
