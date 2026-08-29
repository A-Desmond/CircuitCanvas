import { beforeEach, describe, expect, it } from "vitest";
import { createBlankProject, createHeroProject } from "@/domain/project";
import { syncCircuitToFirmware } from "@/firmware/managed-region";
import { simulateFirmware } from "@/firmware/simulate-firmware";
import { useProjectStore } from "@/store/project-store";

describe("firmware synchronization", () => {
  beforeEach(() => {
    useProjectStore.setState({ project: createBlankProject(), past: [], future: [], activities: [] });
  });

  it("derives hero bindings from canonical topology", () => {
    const project = createHeroProject();
    expect(project.firmware.code).toContain("#define LED_PIN 18");
    expect(project.firmware.code).toContain("#define BUTTON_PIN 27");
    expect(project.firmware.code).toContain("pinMode(LED_PIN, OUTPUT);");
  });

  it("runs a direct setup HIGH output without executing commented examples", () => {
    const project = createHeroProject();
    project.firmware.code = project.firmware.code
      .replace("#define LED_PIN 18", "#define LED_PIN 19")
      .replace("pinMode(LED_PIN, OUTPUT);", "pinMode(LED_PIN, OUTPUT);\n  digitalWrite(LED_PIN, HIGH);");
    project.firmware.bindings = project.firmware.bindings.map((binding) => binding.symbolName === "LED_PIN" ? { ...binding, controllerPinId: "GPIO19" } : binding);
    expect(simulateFirmware(project).energizedComponentIds).toContain("cmp_led");
  });

  it("preserves user code outside managed blocks", () => {
    const project = createHeroProject();
    project.firmware.code += "\n// student note\n";
    project.connections.conn_led_signal.source.pinId = "GPIO19";
    const synced = syncCircuitToFirmware(project);
    expect(synced.firmware.code).toContain("#define LED_PIN 19");
    expect(synced.firmware.code).toContain("// student note");
  });

  it("applies a code pin edit to the circuit as one history step", () => {
    useProjectStore.getState().loadExample();
    const code = useProjectStore.getState().project.firmware.code.replace("#define LED_PIN 18", "#define LED_PIN 19");
    const result = useProjectStore.getState().applyFirmwareCode(code);
    expect(result.ok).toBe(true);
    const state = useProjectStore.getState();
    expect(state.project.connections.conn_led_signal.source.pinId).toBe("GPIO19");
    expect(state.project.validation.report?.valid).toBe(true);
    expect(state.past).toHaveLength(1);
  });

  it("rejects GPIO34 and leaves canonical topology unchanged", () => {
    useProjectStore.getState().loadExample();
    const code = useProjectStore.getState().project.firmware.code.replace("#define LED_PIN 18", "#define LED_PIN 34");
    const result = useProjectStore.getState().applyFirmwareCode(code);
    expect(result.ok).toBe(false);
    const project = useProjectStore.getState().project;
    expect(project.connections.conn_led_signal.source.pinId).toBe("GPIO18");
    expect(project.firmware.sync.status).toBe("conflict");
  });

  it("undoes code and circuit changes together", () => {
    useProjectStore.getState().loadExample();
    const code = useProjectStore.getState().project.firmware.code.replace("#define LED_PIN 18", "#define LED_PIN 19");
    useProjectStore.getState().applyFirmwareCode(code);
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().project.connections.conn_led_signal.source.pinId).toBe("GPIO18");
    expect(useProjectStore.getState().project.firmware.code).toContain("#define LED_PIN 18");
  });
});
