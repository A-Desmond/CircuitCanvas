import { describe, expect, it } from "vitest";
import { applyDomainCommand } from "@/domain/commands";
import { COMPONENT_DEFINITIONS, COMPONENT_KINDS } from "@/domain/component-definitions";
import { createBlankProject } from "@/domain/project";
import type { ComponentKind } from "@/domain/types";

const expandedKinds: ComponentKind[] = [
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

describe("expanded component catalog", () => {
  it("registers every requested beginner component with unique exact pins", () => {
    expect(COMPONENT_KINDS).toHaveLength(14);
    for (const kind of expandedKinds) {
      const definition = COMPONENT_DEFINITIONS[kind];
      expect(definition.kind).toBe(kind);
      expect(definition.displayName.length).toBeGreaterThan(0);
      expect(definition.pins.length).toBeGreaterThan(0);
      expect(new Set(definition.pins.map((pin) => pin.id)).size).toBe(definition.pins.length);
      for (const pin of definition.pins) {
        expect(pin.capabilities.length).toBeGreaterThan(0);
        expect(pin.schematicAnchor.side).toMatch(/left|right|top|bottom/);
      }
    }
  });

  it.each(expandedKinds)("adds %s through the shared domain command", (kind) => {
    const result = applyDomainCommand(createBlankProject(), { type: "add-component", kind });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.values(result.data.project.components)[0]).toMatchObject({ kind, locked: false });
  });

  it("validates editable servo and sensor ranges", () => {
    const added = applyDomainCommand(createBlankProject(), { type: "add-component", kind: "servo" });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const servo = Object.values(added.data.project.components)[0];
    const invalid = applyDomainCommand(added.data.project, {
      type: "update-component-property",
      componentId: servo.id,
      property: "angle",
      value: 220,
    });
    expect(invalid).toMatchObject({ ok: false, error: { code: "INVALID_PROPERTY" } });
  });
});
