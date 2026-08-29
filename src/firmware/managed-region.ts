import { getPinDefinition } from "@/domain/component-definitions";
import { findConnectedControllerPin, hasGroundPath } from "@/domain/graph";
import type {
  CircuitProject,
  FirmwareBinding,
  FirmwareState,
  FirmwareSyncIssue,
} from "@/domain/types";

const BINDINGS_START = "// <circuitcanvas:bindings>";
const BINDINGS_END = "// </circuitcanvas:bindings>";
const SETUP_START = "// <circuitcanvas:setup>";
const SETUP_END = "// </circuitcanvas:setup>";

export const STARTER_CODE = `// CircuitCanvas ESP32 starter project

${BINDINGS_START}
// Bindings appear when the circuit is connected.
${BINDINGS_END}

void setup() {
  ${SETUP_START}
  // Pin modes appear when bindings are available.
  ${SETUP_END}
}

void loop() {
  if (digitalRead(BUTTON_PIN) == LOW) {
    digitalWrite(LED_PIN, HIGH);
  } else {
    digitalWrite(LED_PIN, LOW);
  }
}
`;

export function createBlankFirmware(): FirmwareState {
  return {
    target: "esp32-arduino",
    code: STARTER_CODE,
    bindings: [],
    sync: { status: "synced", issues: [] },
    generatedRevision: 0,
    generatedHash: hashManagedRegions(STARTER_CODE),
  };
}

export function replaceManagedRegion(code: string, start: string, end: string, body: string): string {
  const startIndex = code.indexOf(start);
  const endIndex = code.indexOf(end);
  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) return code;
  const contentStart = startIndex + start.length;
  return `${code.slice(0, contentStart)}\n${body}\n${code.slice(endIndex)}`;
}

function managedText(code: string): string {
  const extract = (start: string, end: string) => {
    const from = code.indexOf(start);
    const to = code.indexOf(end);
    return from >= 0 && to >= 0 ? code.slice(from, to + end.length) : "missing";
  };
  return `${extract(BINDINGS_START, BINDINGS_END)}|${extract(SETUP_START, SETUP_END)}`;
}

export function hashManagedRegions(code: string): string {
  let hash = 5381;
  for (const char of managedText(code)) hash = ((hash << 5) * hash) ^ char.charCodeAt(0);
  return (hash >>> 0).toString(16);
}

export function deriveFirmwareBindings(project: CircuitProject): FirmwareBinding[] {
  const controller = Object.values(project.components).find((component) => component.kind === "esp32-devkitc-v4");
  if (!controller) return [];
  const bindings: FirmwareBinding[] = [];

  const led = Object.values(project.components).find((component) => component.kind === "led");
  if (led) {
    const connection = findConnectedControllerPin(project, { componentId: led.id, pinId: "ANODE" });
    const pin = connection && getPinDefinition(controller.kind, connection.endpoint.pinId);
    if (connection && pin?.capabilities.includes("digital-output") && connection.path.some((point) => project.components[point.componentId]?.kind === "resistor")) {
      bindings.push({
        id: `binding_led_${led.id}`,
        role: "led",
        componentId: led.id,
        controllerComponentId: controller.id,
        controllerPinId: connection.endpoint.pinId,
        symbolName: "LED_PIN",
        mode: "OUTPUT",
      });
    }
  }

  const button = Object.values(project.components).find((component) => component.kind === "push-button");
  if (button) {
    const signal = findConnectedControllerPin(project, { componentId: button.id, pinId: "A" })
      ?? findConnectedControllerPin(project, { componentId: button.id, pinId: "B" });
    const grounded = hasGroundPath(project, { componentId: button.id, pinId: "A" })
      || hasGroundPath(project, { componentId: button.id, pinId: "B" });
    const pin = signal && getPinDefinition(controller.kind, signal.endpoint.pinId);
    if (signal && grounded && pin?.capabilities.includes("digital-input")) {
      bindings.push({
        id: `binding_button_${button.id}`,
        role: "button",
        componentId: button.id,
        controllerComponentId: controller.id,
        controllerPinId: signal.endpoint.pinId,
        symbolName: "BUTTON_PIN",
        mode: "INPUT_PULLUP",
      });
    }
  }

  return bindings;
}

export function renderBindingsRegion(bindings: FirmwareBinding[]): string {
  return bindings.length
    ? bindings.map((binding) => `#define ${binding.symbolName} ${binding.controllerPinId.replace("GPIO", "")}`).join("\n")
    : "// Bindings appear when the circuit is connected.";
}

export function renderSetupRegion(bindings: FirmwareBinding[]): string {
  return bindings.length
    ? bindings.map((binding) => `pinMode(${binding.symbolName}, ${binding.mode});`).join("\n  ")
    : "// Pin modes appear when bindings are available.";
}

export function syncCircuitToFirmware(project: CircuitProject): CircuitProject {
  const bindings = deriveFirmwareBindings(project);
  let code = project.firmware.code || STARTER_CODE;
  code = replaceManagedRegion(code, BINDINGS_START, BINDINGS_END, renderBindingsRegion(bindings));
  code = replaceManagedRegion(code, SETUP_START, SETUP_END, renderSetupRegion(bindings));
  return {
    ...project,
    firmware: {
      ...project.firmware,
      code,
      bindings,
      sync: { status: "synced", issues: [] },
      generatedRevision: project.firmware.generatedRevision + 1,
      generatedHash: hashManagedRegions(code),
    },
  };
}

export function parseManagedBindings(code: string): {
  values: Partial<Record<"LED_PIN" | "BUTTON_PIN", number>>;
  issues: FirmwareSyncIssue[];
} {
  const start = code.indexOf(BINDINGS_START);
  const end = code.indexOf(BINDINGS_END);
  if (start < 0 || end < 0 || end <= start) {
    return { values: {}, issues: [{ code: "UNSUPPORTED_BINDING", message: "The managed bindings markers are missing." }] };
  }
  const region = code.slice(start + BINDINGS_START.length, end);
  const values: Partial<Record<"LED_PIN" | "BUTTON_PIN", number>> = {};
  const issues: FirmwareSyncIssue[] = [];
  for (const symbol of ["LED_PIN", "BUTTON_PIN"] as const) {
    const line = region.match(new RegExp(`^\\s*#define\\s+${symbol}\\s+(.+?)\\s*$`, "m"));
    if (!line) continue;
    if (!/^\d+$/.test(line[1])) {
      issues.push({ code: "UNSUPPORTED_BINDING", symbolName: symbol, message: `${symbol} must be a plain GPIO number.` });
    } else {
      values[symbol] = Number(line[1]);
    }
  }
  return { values, issues };
}
