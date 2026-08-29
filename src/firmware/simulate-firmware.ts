import type { CircuitProject, ComponentId } from "@/domain/types";
import { hasPath } from "@/domain/graph";

export interface FirmwareSimulationResult {
  energizedComponentIds: ComponentId[];
  outputStates: Record<string, boolean>;
  componentLevels: Record<ComponentId, number>;
  message: string;
}

/** Executes the safe, intentionally small Arduino subset used by CircuitCanvas examples. */
export function simulateFirmware(project: CircuitProject): FirmwareSimulationResult {
  // Ignore comments so disabled example code cannot override live statements.
  const code = project.firmware.code.replace(/\/\/[^\n]*/g, "");
  const outputStates: Record<string, boolean> = {};
  const bindings = Object.fromEntries(project.firmware.bindings.map((binding) => [binding.symbolName, binding]));
  const inputValues: Record<string, boolean> = {};
  for (const binding of project.firmware.bindings) if (binding.mode !== "OUTPUT") inputValues[binding.symbolName] = Boolean(project.ui.simulation.inputs[binding.symbolName] ?? false);

  const write = /digitalWrite\s*\(\s*([A-Z_][A-Z0-9_]*)\s*,\s*(HIGH|LOW)\s*\)/g;
  const writes = [...code.matchAll(write)];
  for (const match of writes) {
    const symbol = match[1];
    const before = code.slice(Math.max(0, (match.index ?? 0) - 180), match.index ?? 0);
    const conditional = before.match(/digitalRead\s*\(\s*([A-Z_][A-Z0-9_]*)\s*\)\s*==\s*(LOW|HIGH)/);
    if (conditional && inputValues[conditional[1]] !== undefined) {
      const expected = conditional[2] === "HIGH";
      const inElseBranch = /\}\s*else\s*\{?\s*$/.test(before);
      const branchMatches = inElseBranch ? inputValues[conditional[1]] !== expected : inputValues[conditional[1]] === expected;
      if (!branchMatches) continue;
    }
    outputStates[symbol] = match[2] === "HIGH";
  }

  const energizedComponentIds = Object.entries(outputStates)
    .filter(([, high]) => high)
    .map(([symbol]) => bindings[symbol]?.componentId)
    .filter((id): id is ComponentId => Boolean(id));
  const componentLevels: Record<ComponentId, number> = {};
  for (const id of energizedComponentIds) componentLevels[id] = 1;
  const led = Object.values(project.components).find((component) => component.kind === "led");
  const potentiometer = Object.values(project.components).find((component) => component.kind === "potentiometer");
  if (led && potentiometer && energizedComponentIds.includes(led.id) && hasPath(project, { componentId: led.id, pinId: "ANODE" }, { componentId: potentiometer.id, pinId: "WIPER" })) {
    // A larger series resistance limits current, so brightness falls as the wiper value rises.
    componentLevels[led.id] = Math.max(0, Math.min(1, 1 - Number(potentiometer.properties.positionPercent ?? 50) / 100));
  }
  const active = energizedComponentIds.length;
  return {
    energizedComponentIds: [...new Set(active ? energizedComponentIds : [])],
    componentLevels,
    outputStates,
    message: active ? "Firmware running · outputs energized" : "Firmware running · all outputs LOW",
  };
}
