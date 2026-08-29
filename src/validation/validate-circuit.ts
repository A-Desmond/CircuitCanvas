import { getPinDefinition } from "@/domain/component-definitions";
import {
  findConnectedControllerPin,
  getConnectionsForComponent,
  hasGroundPath,
  pathContainsComponentKind,
} from "@/domain/graph";
import type { CircuitProject, ValidationIssue, ValidationReport, ValidationSeverity } from "@/domain/types";
import { deriveFirmwareBindings, parseManagedBindings } from "@/firmware/managed-region";

const PENALTIES: Record<ValidationSeverity, number> = { critical: 35, high: 15, warning: 5, info: 1 };

function issue(
  ruleId: string,
  severity: ValidationSeverity,
  title: string,
  message: string,
  componentIds: string[],
  connectionIds: string[] = [],
  suggestedFix?: ValidationIssue["suggestedFix"],
): ValidationIssue {
  return {
    id: `${ruleId}:${componentIds.join(",") || connectionIds.join(",") || "project"}`,
    ruleId,
    severity,
    title,
    message,
    explanation: message,
    componentIds,
    connectionIds,
    suggestedFix,
  };
}

export function validateCircuit(project: CircuitProject): ValidationReport {
  const issues: ValidationIssue[] = [];
  const leds = Object.values(project.components).filter((component) => component.kind === "led");
  const buttons = Object.values(project.components).filter((component) => component.kind === "push-button");

  for (const led of leds) {
    const anode = { componentId: led.id, pinId: "ANODE" };
    const cathode = { componentId: led.id, pinId: "CATHODE" };
    const controllerPath = findConnectedControllerPin(project, anode);
    const reverseControllerPath = findConnectedControllerPin(project, cathode);
    const anodeGrounded = hasGroundPath(project, anode);
    const cathodeGrounded = hasGroundPath(project, cathode);

    if (!controllerPath || !pathContainsComponentKind(project, controllerPath.path, "resistor")) {
      issues.push(issue(
        "led-missing-resistor",
        "high",
        "LED needs a series resistor",
        `${led.name} is connected to the ESP32 without a current-limiting resistor. Add a resistor in series; 220–330 Ω is a common beginner starting range, but the appropriate value depends on the LED and supply.`,
        [led.id],
        [],
        { action: "add-resistor", data: { resistanceOhms: 220 } },
      ));
    }

    if (controllerPath) {
      const controller = project.components[controllerPath.endpoint.componentId];
      const pin = getPinDefinition(controller.kind, controllerPath.endpoint.pinId);
      if (pin?.inputOnly || !pin?.capabilities.includes("digital-output")) {
        issues.push(issue(
          "output-pin-capability",
          "high",
          "Output connected to an input-only GPIO",
          `${controllerPath.endpoint.pinId} cannot drive ${led.name} because this ESP32 pin is input-only. Choose an output-capable GPIO such as GPIO18 or GPIO19.`,
          [controller.id, led.id],
          [],
          { action: "choose-output-pin", data: { compatiblePins: ["GPIO18", "GPIO19"] } },
        ));
      }
    }

    if (!cathodeGrounded) {
      issues.push(issue(
        "led-missing-ground",
        "high",
        "LED has no ground path",
        `${led.name}'s cathode does not reach an ESP32 ground pin in the supported circuit pattern.`,
        [led.id],
        [],
        { action: "add-ground" },
      ));
    }

    if (reverseControllerPath && anodeGrounded && !cathodeGrounded) {
      issues.push(issue(
        "led-polarity",
        "high",
        "LED polarity is reversed",
        `${led.name}'s cathode points toward the controller while its anode reaches ground. Reverse the LED connections.`,
        [led.id],
        [],
        { action: "reverse-led" },
      ));
    }
  }

  for (const button of buttons) {
    const a = { componentId: button.id, pinId: "A" };
    const b = { componentId: button.id, pinId: "B" };
    const gpio = findConnectedControllerPin(project, a) ?? findConnectedControllerPin(project, b);
    const grounded = hasGroundPath(project, a) || hasGroundPath(project, b);
    if (!gpio || !grounded || getConnectionsForComponent(project, button.id).length < 2) {
      issues.push(issue(
        "button-topology",
        "warning",
        "Button circuit is incomplete",
        `${button.name} needs one path to an ESP32 input GPIO and one path to ground for the INPUT_PULLUP pattern.`,
        [button.id],
        [],
        { action: "reconnect" },
      ));
    }
  }

  for (const connection of Object.values(project.connections)) {
    const endpoints = [connection.source, connection.target];
    const capabilities = endpoints.map((endpoint) => {
      const component = project.components[endpoint.componentId];
      return component ? getPinDefinition(component.kind, endpoint.pinId)?.capabilities ?? [] : [];
    });
    const hasPower = capabilities.some((value) => value.includes("power-3v3") || value.includes("power-5v"));
    const hasGround = capabilities.some((value) => value.includes("ground"));
    if (hasPower && hasGround) {
      issues.push(issue(
        "direct-power-ground",
        "critical",
        "Power is directly connected to ground",
        "A power pin is directly connected to ground in the logical circuit. Remove the direct connection before continuing.",
        endpoints.map((endpoint) => endpoint.componentId),
        [connection.id],
        { action: "reconnect" },
      ));
    }
  }

  for (const component of Object.values(project.components)) {
    if (getConnectionsForComponent(project, component.id).length === 0) {
      issues.push(issue(
        "disconnected-component",
        component.kind === "esp32-devkitc-v4" ? "info" : "warning",
        `${component.name} is disconnected`,
        `${component.name} has no electrical connections.`,
        [component.id],
      ));
    }
  }

  const derivedBindings = deriveFirmwareBindings(project);
  const parsed = parseManagedBindings(project.firmware.code);
  for (const binding of derivedBindings) {
    const codePin = parsed.values[binding.symbolName];
    if (codePin !== undefined && `GPIO${codePin}` !== binding.controllerPinId) {
      issues.push(issue(
        "firmware-mismatch",
        "warning",
        "Firmware binding does not match the circuit",
        `${binding.symbolName} points to GPIO${codePin}, while the canonical circuit uses ${binding.controllerPinId}.`,
        [binding.componentId, binding.controllerComponentId],
      ));
    }
  }

  const score = Math.max(0, 100 - issues.reduce((total, value) => total + PENALTIES[value.severity], 0));
  return { valid: !issues.some((value) => value.severity === "critical" || value.severity === "high"), score, issues };
}

export function withValidation(project: CircuitProject): CircuitProject {
  return {
    ...project,
    validation: { report: validateCircuit(project), lastRunAt: new Date().toISOString() },
  };
}
