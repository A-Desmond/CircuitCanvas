import { createComponent } from "./component-definitions";
import type { CircuitConnection, CircuitProject, Endpoint } from "./types";
import { createBlankFirmware, syncCircuitToFirmware } from "@/firmware/managed-region";
import { withValidation } from "@/validation/validate-circuit";
import { createId } from "@/lib/ids";

export function createBlankProject(name = "Untitled Circuit"): CircuitProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: createId("project"),
    name,
    components: {},
    connections: {},
    firmware: createBlankFirmware(),
    validation: {},
    ui: { activeView: "schematic", highlightedComponentIds: [], simulation: { status: "stopped", energizedComponentIds: [], componentLevels: {}, inputs: {} } },
    metadata: { createdAt: now, updatedAt: now },
  };
}

function connection(id: string, source: Endpoint, target: Endpoint, role: CircuitConnection["role"]): CircuitConnection {
  return {
    id,
    source,
    target,
    role,
    wireStyle: { semanticColor: role === "ground" ? "ground" : role === "power" ? "power" : "signal" },
  };
}

export function createHeroProject(): CircuitProject {
  const project = createBlankProject("Push Button LED");
  const esp32 = createComponent("esp32-devkitc-v4", project.components, { id: "cmp_esp32", name: "ESP32" });
  const resistor = createComponent("resistor", { [esp32.id]: esp32 }, { id: "cmp_resistor", name: "R1" });
  const led = createComponent("led", { [esp32.id]: esp32, [resistor.id]: resistor }, { id: "cmp_led", name: "LED1" });
  const button = createComponent(
    "push-button",
    { [esp32.id]: esp32, [resistor.id]: resistor, [led.id]: led },
    { id: "cmp_button", name: "BUTTON1" },
  );

  project.components = { [esp32.id]: esp32, [resistor.id]: resistor, [led.id]: led, [button.id]: button };
  project.connections = {
    conn_led_signal: connection("conn_led_signal", { componentId: esp32.id, pinId: "GPIO18" }, { componentId: resistor.id, pinId: "A" }, "signal"),
    conn_resistor_led: connection("conn_resistor_led", { componentId: resistor.id, pinId: "B" }, { componentId: led.id, pinId: "ANODE" }, "signal"),
    conn_led_ground: connection("conn_led_ground", { componentId: led.id, pinId: "CATHODE" }, { componentId: esp32.id, pinId: "GND_1" }, "ground"),
    conn_button_signal: connection("conn_button_signal", { componentId: esp32.id, pinId: "GPIO27" }, { componentId: button.id, pinId: "A" }, "signal"),
    conn_button_ground: connection("conn_button_ground", { componentId: button.id, pinId: "B" }, { componentId: esp32.id, pinId: "GND_2" }, "ground"),
  };
  return withValidation(syncCircuitToFirmware(project));
}
