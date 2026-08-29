import type {
  CircuitComponent,
  ComponentDefinition,
  ComponentKind,
  PinDefinition,
  PinId,
} from "./types";
import { createId } from "@/lib/ids";

const gpioCapabilities = ["digital-input", "digital-output", "pwm-output"] as const;
const inputOnlyCapabilities = ["digital-input", "analog-input"] as const;

const exposedGpios = [
  "GPIO18",
  "GPIO19",
  "GPIO21",
  "GPIO22",
  "GPIO23",
  "GPIO25",
  "GPIO26",
  "GPIO27",
  "GPIO32",
  "GPIO33",
  "GPIO34",
  "GPIO35",
] as const;

function espPin(
  id: string,
  side: "left" | "right",
  order: number,
  inputOnly = false,
): PinDefinition {
  const pinNumber = id.replace("GPIO", "");
  const z = -1.35 + order * 0.255;
  return {
    id,
    label: id,
    aliases: [pinNumber, `IO${pinNumber}`],
    capabilities: inputOnly ? [...inputOnlyCapabilities] : [...gpioCapabilities],
    inputOnly,
    voltage: { nominal: 3.3, min: 0, max: 3.3 },
    schematicAnchor: { side, order },
    physicalAnchor: { x: side === "left" ? -1.02 : 1.02, y: 0.16, z },
    notes: inputOnly ? ["Input-only GPIO on the ESP32 profile."] : undefined,
  };
}

const esp32Pins: PinDefinition[] = [
  {
    id: "3V3",
    label: "3V3",
    capabilities: ["power-3v3"],
    voltage: { nominal: 3.3 },
    schematicAnchor: { side: "left", order: 0 },
    physicalAnchor: { x: -1.02, y: 0.16, z: -1.53 },
  },
  {
    id: "GND_1",
    label: "GND",
    aliases: ["GND"],
    capabilities: ["ground"],
    schematicAnchor: { side: "left", order: 1 },
    physicalAnchor: { x: -1.02, y: 0.16, z: 1.53 },
  },
  {
    id: "GND_2",
    label: "GND",
    capabilities: ["ground"],
    schematicAnchor: { side: "right", order: 0 },
    physicalAnchor: { x: 1.02, y: 0.16, z: 1.53 },
  },
  {
    id: "5V",
    label: "5V",
    aliases: ["VIN"],
    capabilities: ["power-5v"],
    voltage: { nominal: 5 },
    schematicAnchor: { side: "right", order: 1 },
    physicalAnchor: { x: 1.02, y: 0.16, z: -1.53 },
  },
  ...exposedGpios.map((id, index) =>
    espPin(id, index % 2 === 0 ? "left" : "right", Math.floor(index / 2) + 2, id === "GPIO34" || id === "GPIO35"),
  ),
];

function terminal(
  id: string,
  label: string,
  side: "left" | "right",
  order: number,
  capabilities: PinDefinition["capabilities"] = ["passive-terminal"],
): PinDefinition {
  return {
    id,
    label,
    capabilities,
    schematicAnchor: { side, order },
    physicalAnchor: { x: side === "left" ? -0.45 : 0.45, y: -0.37, z: (order - 0.5) * 0.22 },
  };
}

export const COMPONENT_DEFINITIONS: Record<ComponentKind, ComponentDefinition> = {
  "esp32-devkitc-v4": {
    kind: "esp32-devkitc-v4",
    displayName: "ESP32 DevKitC V4",
    category: "controller",
    description: "A beginner-focused ESP32 controller profile with a deliberately small GPIO set.",
    pins: esp32Pins,
    defaultProperties: { board: "ESP32-DevKitC V4" },
    firmwareRole: { supported: true, defaultSymbolPrefix: "ESP32" },
    visual: { schematicType: "esp32-devkitc-v4", physicalType: "esp32-devkitc-v4" },
    reference: {
      manufacturer: "Espressif",
      docsUrl: "https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html",
    },
  },
  led: {
    kind: "led",
    displayName: "LED",
    category: "output",
    description: "A two-lead light-emitting diode with explicit anode and cathode pins.",
    pins: [
      {
        id: "ANODE",
        label: "Anode (+)",
        capabilities: ["positive"],
        schematicAnchor: { side: "left", order: 0 },
        physicalAnchor: { x: -0.16, y: -0.45, z: 0 },
      },
      {
        id: "CATHODE",
        label: "Cathode (-)",
        capabilities: ["negative"],
        schematicAnchor: { side: "right", order: 0 },
        physicalAnchor: { x: 0.16, y: -0.36, z: 0 },
      },
    ],
    defaultProperties: { color: "red", forwardVoltageReference: 2 },
    firmwareRole: { supported: true, defaultSymbolPrefix: "LED" },
    visual: { schematicType: "led", physicalType: "led" },
  },
  resistor: {
    kind: "resistor",
    displayName: "Resistor",
    category: "passive",
    description: "A two-terminal resistor used as the LED current-limiting element.",
    pins: [
      {
        id: "A",
        label: "A",
        capabilities: ["passive-terminal"],
        schematicAnchor: { side: "left", order: 0 },
        physicalAnchor: { x: -0.54, y: 0, z: 0 },
      },
      {
        id: "B",
        label: "B",
        capabilities: ["passive-terminal"],
        schematicAnchor: { side: "right", order: 0 },
        physicalAnchor: { x: 0.54, y: 0, z: 0 },
      },
    ],
    defaultProperties: { resistanceOhms: 220 },
    visual: { schematicType: "resistor", physicalType: "resistor" },
  },
  "push-button": {
    kind: "push-button",
    displayName: "Push button",
    category: "input",
    description: "A simplified educational two-terminal, normally-open push button.",
    pins: [
      {
        id: "A",
        label: "A",
        capabilities: ["passive-terminal"],
        schematicAnchor: { side: "left", order: 0 },
        physicalAnchor: { x: -0.38, y: -0.38, z: 0 },
      },
      {
        id: "B",
        label: "B",
        capabilities: ["passive-terminal"],
        schematicAnchor: { side: "right", order: 0 },
        physicalAnchor: { x: 0.38, y: -0.38, z: 0 },
      },
    ],
    defaultProperties: { normallyOpen: true },
    firmwareRole: { supported: true, defaultSymbolPrefix: "BUTTON" },
    visual: { schematicType: "push-button", physicalType: "push-button" },
  },
  capacitor: {
    kind: "capacitor",
    displayName: "Capacitor",
    category: "passive",
    description: "A polarized electrolytic capacitor for filtering and timing circuits.",
    pins: [
      terminal("POSITIVE", "Positive (+)", "left", 0, ["positive"]),
      terminal("NEGATIVE", "Negative (-)", "right", 0, ["negative"]),
    ],
    defaultProperties: { capacitanceUf: 100 },
    visual: { schematicType: "capacitor", physicalType: "capacitor" },
  },
  diode: {
    kind: "diode",
    displayName: "Diode",
    category: "passive",
    description: "A rectifier diode with explicit anode and cathode orientation.",
    pins: [
      terminal("ANODE", "Anode", "left", 0, ["positive"]),
      terminal("CATHODE", "Cathode", "right", 0, ["negative"]),
    ],
    defaultProperties: { model: "1N4007" },
    visual: { schematicType: "diode", physicalType: "diode" },
  },
  potentiometer: {
    kind: "potentiometer",
    displayName: "Potentiometer",
    category: "input",
    description: "A three-terminal adjustable resistor suitable for analog input experiments.",
    pins: [
      terminal("A", "End A", "left", 0),
      terminal("WIPER", "Wiper", "right", 0, ["analog-input", "passive-terminal"]),
      terminal("B", "End B", "left", 1),
    ],
    defaultProperties: { resistanceOhms: 10000, positionPercent: 50 },
    visual: { schematicType: "potentiometer", physicalType: "potentiometer" },
  },
  buzzer: {
    kind: "buzzer",
    displayName: "Active buzzer",
    category: "output",
    description: "A polarity-sensitive active buzzer controlled by a digital output.",
    pins: [
      terminal("POSITIVE", "Positive (+)", "left", 0, ["positive", "digital-output"]),
      terminal("NEGATIVE", "Negative (-)", "right", 0, ["negative"]),
    ],
    defaultProperties: { frequencyHz: 2000 },
    visual: { schematicType: "buzzer", physicalType: "buzzer" },
  },
  servo: {
    kind: "servo",
    displayName: "Micro servo",
    category: "output",
    description: "A three-wire hobby servo with power, ground, and PWM signal pins.",
    pins: [
      terminal("SIGNAL", "Signal", "left", 0, ["digital-input", "pwm-output"]),
      terminal("VCC", "VCC (5V)", "left", 1, ["power-5v"]),
      terminal("GND", "Ground", "right", 0, ["ground"]),
    ],
    defaultProperties: { angle: 90 },
    visual: { schematicType: "servo", physicalType: "servo" },
  },
  photoresistor: {
    kind: "photoresistor",
    displayName: "Photoresistor",
    category: "input",
    description: "A light-dependent resistor for beginner analog light sensing.",
    pins: [terminal("A", "A", "left", 0), terminal("B", "B", "right", 0)],
    defaultProperties: { lightLevel: 50 },
    visual: { schematicType: "photoresistor", physicalType: "photoresistor" },
  },
  "npn-transistor": {
    kind: "npn-transistor",
    displayName: "NPN transistor",
    category: "passive",
    description: "A general-purpose NPN transistor for switching loads from an ESP32 GPIO.",
    pins: [
      terminal("BASE", "Base", "left", 0, ["digital-input"]),
      terminal("COLLECTOR", "Collector", "right", 0, ["passive-terminal"]),
      terminal("EMITTER", "Emitter", "right", 1, ["passive-terminal"]),
    ],
    defaultProperties: { model: "2N2222" },
    visual: { schematicType: "npn-transistor", physicalType: "npn-transistor" },
  },
  "power-3v3": {
    kind: "power-3v3",
    displayName: "3.3V power",
    category: "power",
    description: "A schematic power reference for the ESP32 3.3V rail.",
    pins: [terminal("3V3", "3.3V", "right", 0, ["power-3v3"])],
    defaultProperties: { voltage: 3.3 },
    visual: { schematicType: "power-3v3", physicalType: "power-3v3" },
  },
  "power-5v": {
    kind: "power-5v",
    displayName: "5V power",
    category: "power",
    description: "A schematic 5V power reference for servos and other supported loads.",
    pins: [terminal("5V", "5V", "right", 0, ["power-5v"])],
    defaultProperties: { voltage: 5 },
    visual: { schematicType: "power-5v", physicalType: "power-5v" },
  },
  ground: {
    kind: "ground",
    displayName: "Ground",
    category: "power",
    description: "A schematic ground reference for return paths and shared power.",
    pins: [terminal("GND", "Ground", "left", 0, ["ground"])],
    defaultProperties: {},
    visual: { schematicType: "ground", physicalType: "ground" },
  },
};

export const COMPONENT_KINDS = Object.keys(COMPONENT_DEFINITIONS) as ComponentKind[];

const DEFAULT_POSITIONS: Record<ComponentKind, { schematic: [number, number]; physical: [number, number, number] }> = {
  "esp32-devkitc-v4": { schematic: [120, 190], physical: [-1.6, 0.28, 0] },
  "push-button": { schematic: [430, 390], physical: [-0.4, 0.24, 1.5] },
  resistor: { schematic: [470, 140], physical: [0.55, 0.24, -0.8] },
  led: { schematic: [720, 140], physical: [1.65, 0.35, -0.8] },
  capacitor: { schematic: [600, 285], physical: [1.1, 0.24, 0.5] },
  diode: { schematic: [790, 285], physical: [1.7, 0.24, 0.5] },
  potentiometer: { schematic: [390, 300], physical: [-1.1, 0.24, 1.55] },
  buzzer: { schematic: [760, 260], physical: [2.4, 0.28, 0.5] },
  servo: { schematic: [760, 330], physical: [2.25, 0.35, 1.45] },
  photoresistor: { schematic: [280, 315], physical: [-1.75, 0.24, 1.55] },
  "npn-transistor": { schematic: [570, 330], physical: [0.2, 0.24, 1.55] },
  "power-3v3": { schematic: [240, 80], physical: [-2.7, 0.2, -1.7] },
  "power-5v": { schematic: [410, 80], physical: [-2.1, 0.2, -1.7] },
  ground: { schematic: [840, 650], physical: [2.75, 0.2, -1.7] },
};

const NAME_PREFIX: Record<ComponentKind, string> = {
  "esp32-devkitc-v4": "ESP32",
  led: "LED",
  resistor: "R",
  "push-button": "BUTTON",
  capacitor: "C",
  diode: "D",
  potentiometer: "POT",
  buzzer: "BZ",
  servo: "SERVO",
  photoresistor: "LDR",
  "npn-transistor": "Q",
  "power-3v3": "3V3",
  "power-5v": "5V",
  ground: "GND",
};

export function getPinDefinition(kind: ComponentKind, pinId: PinId): PinDefinition | undefined {
  return COMPONENT_DEFINITIONS[kind].pins.find((pin) => pin.id === pinId || pin.aliases?.includes(pinId));
}

export function normalizeESP32Pin(input: string | number): PinId | undefined {
  const text = String(input).trim().toUpperCase();
  const canonical = /^\d+$/.test(text) ? `GPIO${text}` : text.startsWith("IO") ? `GPIO${text.slice(2)}` : text;
  return esp32Pins.some((pin) => pin.id === canonical) ? canonical : undefined;
}

export function nextComponentName(kind: ComponentKind, components: Record<string, CircuitComponent>): string {
  const prefix = NAME_PREFIX[kind];
  if (["esp32-devkitc-v4", "power-3v3", "power-5v", "ground"].includes(kind)
    && !Object.values(components).some((component) => component.kind === kind)) return prefix;
  let index = 1;
  while (Object.values(components).some((component) => component.name === `${prefix}${index}`)) index += 1;
  return `${prefix}${index}`;
}

export function createComponent(
  kind: ComponentKind,
  components: Record<string, CircuitComponent>,
  options: { id?: string; name?: string; x?: number; y?: number } = {},
): CircuitComponent {
  const defaults = DEFAULT_POSITIONS[kind];
  const kindIndex = Object.values(components).filter((component) => component.kind === kind).length;
  const placementOffset = kindIndex * 0.42;
  return {
    id: options.id ?? createId("cmp"),
    kind,
    name: options.name?.trim() || nextComponentName(kind, components),
    schematic: {
      x: options.x ?? defaults.schematic[0] + kindIndex * 34,
      y: options.y ?? defaults.schematic[1] + kindIndex * 28,
      rotation: 0,
    },
    physical: {
      x: defaults.physical[0] + placementOffset,
      y: defaults.physical[1],
      z: defaults.physical[2] + placementOffset,
      rotationY: 0,
    },
    properties: { ...COMPONENT_DEFINITIONS[kind].defaultProperties },
    locked: false,
  };
}
