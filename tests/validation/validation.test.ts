import { describe, expect, it } from "vitest";
import { createHeroProject } from "@/domain/project";
import { validateCircuit } from "@/validation/validate-circuit";

describe("circuit validation", () => {
  it("marks the hero circuit healthy", () => {
    const report = validateCircuit(createHeroProject());
    expect(report).toMatchObject({ valid: true, score: 100, issues: [] });
  });

  it("detects a missing resistor after component removal", () => {
    const project = createHeroProject();
    delete project.components.cmp_resistor;
    delete project.connections.conn_led_signal;
    delete project.connections.conn_resistor_led;
    const report = validateCircuit(project);
    expect(report.issues.map((issue) => issue.ruleId)).toContain("led-missing-resistor");
  });

  it("detects input-only GPIO output misuse", () => {
    const project = createHeroProject();
    project.connections.conn_led_signal.source.pinId = "GPIO34";
    const report = validateCircuit(project);
    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: "output-pin-capability", severity: "high" }),
    ]));
  });

  it("detects missing ground", () => {
    const project = createHeroProject();
    delete project.connections.conn_led_ground;
    expect(validateCircuit(project).issues.map((issue) => issue.ruleId)).toContain("led-missing-ground");
  });

  it("detects reversed LED polarity", () => {
    const project = createHeroProject();
    project.connections.conn_resistor_led.target.pinId = "CATHODE";
    project.connections.conn_led_ground.source.pinId = "ANODE";
    expect(validateCircuit(project).issues.map((issue) => issue.ruleId)).toContain("led-polarity");
  });

  it("detects incomplete button topology", () => {
    const project = createHeroProject();
    delete project.connections.conn_button_ground;
    expect(validateCircuit(project).issues.map((issue) => issue.ruleId)).toContain("button-topology");
  });

  it("detects direct power to ground", () => {
    const project = createHeroProject();
    project.connections.conn_short = {
      id: "conn_short",
      source: { componentId: "cmp_esp32", pinId: "3V3" },
      target: { componentId: "cmp_esp32", pinId: "GND_1" },
      role: "power",
      wireStyle: { semanticColor: "power" },
    };
    expect(validateCircuit(project).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: "direct-power-ground", severity: "critical" }),
    ]));
  });
});
