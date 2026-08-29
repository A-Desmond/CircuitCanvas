export type ComponentId = string;
export type PinId = string;
export type ConnectionId = string;

export type ComponentKind =
  | "esp32-devkitc-v4"
  | "led"
  | "resistor"
  | "push-button"
  | "capacitor"
  | "diode"
  | "potentiometer"
  | "buzzer"
  | "servo"
  | "photoresistor"
  | "npn-transistor"
  | "power-3v3"
  | "power-5v"
  | "ground";

export type PinCapability =
  | "power-3v3"
  | "power-5v"
  | "ground"
  | "digital-input"
  | "digital-output"
  | "pwm-output"
  | "analog-input"
  | "positive"
  | "negative"
  | "passive-terminal";

export interface PinDefinition {
  id: PinId;
  label: string;
  aliases?: string[];
  capabilities: PinCapability[];
  inputOnly?: boolean;
  outputOnly?: boolean;
  voltage?: { nominal?: number; min?: number; max?: number };
  schematicAnchor: {
    side: "left" | "right" | "top" | "bottom";
    order: number;
  };
  physicalAnchor: { x: number; y: number; z: number };
  notes?: string[];
}

export interface ComponentDefinition {
  kind: ComponentKind;
  displayName: string;
  category: "controller" | "output" | "passive" | "input" | "power";
  description: string;
  pins: PinDefinition[];
  defaultProperties: Record<string, unknown>;
  firmwareRole?: { supported: boolean; defaultSymbolPrefix?: string };
  visual: { schematicType: ComponentKind; physicalType: ComponentKind };
  reference?: { manufacturer?: string; docsUrl?: string };
}

export interface CircuitComponent {
  id: ComponentId;
  kind: ComponentKind;
  name: string;
  schematic: { x: number; y: number; rotation: 0 | 90 | 180 | 270 };
  physical: { x: number; y: number; z: number; rotationY: number };
  properties: Record<string, unknown>;
  locked: boolean;
}

export interface Endpoint {
  componentId: ComponentId;
  pinId: PinId;
}

export interface CircuitConnection {
  id: ConnectionId;
  source: Endpoint;
  target: Endpoint;
  role: "power" | "ground" | "signal" | "unknown";
  wireStyle: { semanticColor: "power" | "ground" | "signal" | "neutral" };
}

export type FirmwareSyncStatus = "synced" | "dirty" | "conflict";

export interface FirmwareSyncIssue {
  code: "UNSUPPORTED_BINDING" | "INVALID_PIN" | "FIRMWARE_MISMATCH";
  message: string;
  symbolName?: "LED_PIN" | "BUTTON_PIN";
}

export interface FirmwareBinding {
  id: string;
  role: "led" | "button";
  componentId: ComponentId;
  controllerComponentId: ComponentId;
  controllerPinId: PinId;
  symbolName: "LED_PIN" | "BUTTON_PIN";
  mode: "OUTPUT" | "INPUT" | "INPUT_PULLUP";
}

export interface FirmwareState {
  target: "esp32-arduino";
  code: string;
  bindings: FirmwareBinding[];
  sync: { status: FirmwareSyncStatus; issues: FirmwareSyncIssue[] };
  generatedRevision: number;
  generatedHash?: string;
}

export type ValidationSeverity = "info" | "warning" | "high" | "critical";

export interface ValidationIssue {
  id: string;
  ruleId: string;
  severity: ValidationSeverity;
  title: string;
  message: string;
  explanation: string;
  componentIds: ComponentId[];
  connectionIds: ConnectionId[];
  suggestedFix?: {
    action: "add-resistor" | "reconnect" | "choose-output-pin" | "add-ground" | "reverse-led";
    data?: Record<string, unknown>;
  };
}

export interface ValidationReport {
  valid: boolean;
  score: number;
  issues: ValidationIssue[];
}

export interface ProjectUIState {
  activeView: "schematic" | "3d" | "code";
  selectedComponentId?: ComponentId;
  selectedConnectionId?: ConnectionId;
  highlightedComponentIds: ComponentId[];
  simulation: {
    status: "stopped" | "running" | "error";
    message?: string;
    energizedComponentIds: ComponentId[];
    componentLevels: Record<ComponentId, number>;
    inputs: Record<string, boolean | number>;
    lastRunAt?: string;
  };
}

export interface CircuitProject {
  schemaVersion: 1;
  id: string;
  name: string;
  components: Record<ComponentId, CircuitComponent>;
  connections: Record<ConnectionId, CircuitConnection>;
  firmware: FirmwareState;
  validation: { report?: ValidationReport; lastRunAt?: string };
  ui: ProjectUIState;
  metadata: { createdAt: string; updatedAt: string };
}

export type DomainErrorCode =
  | "COMPONENT_NOT_FOUND"
  | "PIN_NOT_FOUND"
  | "COMPONENT_LOCKED"
  | "CONNECTION_NOT_FOUND"
  | "DUPLICATE_CONNECTION"
  | "INVALID_PROPERTY"
  | "INVALID_PIN_BINDING"
  | "UNSUPPORTED_OPERATION";

export type CommandResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: DomainErrorCode; message: string } };

export type ChangeOrigin =
  | "human-schematic"
  | "human-3d"
  | "human-code"
  | "webmcp"
  | "system-sync"
  | "undo-redo";

export interface CommandMeta {
  origin: ChangeOrigin;
  actor: "human" | "agent" | "system";
  description?: string;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  actor: "agent";
  toolName: string;
  status: "running" | "success" | "failed";
  summary: string;
  relatedComponentIds?: string[];
}
