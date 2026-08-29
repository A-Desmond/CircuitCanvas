# CircuitCanvas Hackathon MVP
## Codex Implementation Specification
### ESP32 + LED + Resistor + Button + Schematic ↔ 3D ↔ Code Synchronization + Validation + WebMCP

**Status:** Implementation-ready  
**Audience:** OpenAI Codex / autonomous coding agent + human reviewer  
**Scope:** Hackathon MVP only  
**Primary objective:** Build one extremely polished, deeply synchronized electronics workflow rather than a broad electronics simulator.

---

# 1. Product definition

CircuitCanvas is an **agent-native educational electronics workspace**.

A student works with one circuit project that has three synchronized views:

1. **Schematic view** — visual electrical topology.
2. **3D physical view** — simplified breadboard-style physical representation.
3. **Code view** — ESP32 Arduino-style firmware with managed pin bindings.

The project also contains:

4. **Validation engine** — deterministic beginner-level circuit checks.
5. **WebMCP tool layer** — exposes the current project and editing actions to browser agents.
6. **Agent activity log** — visibly shows what the agent inspected or modified.
7. **Undo/redo** — human and agent edits use the same history.

The product thesis is:

> A human and a browser agent should be able to collaborate on the exact same structured electronics project. A change made in the schematic, 3D view, firmware bindings, or through WebMCP must propagate to the same canonical circuit model.

This is **not**:

- a SPICE simulator;
- a PCB editor;
- a professional electrical-safety tool;
- a full Arduino emulator;
- a general CAD environment;
- a chatbot that merely generates circuit images.

---

# 2. Codex operating instructions

Codex must follow these instructions throughout implementation.

## 2.1 Read before coding

Before writing code:

1. Read this entire document.
2. Inspect the existing repository.
3. Identify the existing framework, package manager, conventions, linting rules, and component system.
4. Reuse existing infrastructure where practical.
5. Do not replace a working project structure simply because this spec shows a suggested one.
6. Create a short internal milestone checklist.
7. Implement milestone-by-milestone.

## 2.2 No big-bang implementation

Do **not** try to implement the entire specification in one pass.

For every milestone:

1. implement the smallest vertical slice;
2. run type checking;
3. run linting;
4. run relevant tests;
5. manually verify the acceptance criteria where browser behavior matters;
6. fix regressions;
7. only then proceed.

If a milestone does not satisfy its acceptance criteria, do not build the next major layer on top of it.

## 2.3 Preserve working behavior

When modifying a working feature:

- do not rewrite unrelated files;
- do not introduce alternate stores;
- do not create duplicated circuit state;
- do not bypass domain commands;
- do not silently remove tests;
- do not disable TypeScript errors to proceed;
- do not use `any` across the domain model unless absolutely unavoidable at a browser API boundary;
- do not suppress errors with blanket ESLint disables.

## 2.4 Prefer simple deterministic code

This hackathon rewards a working demo.

Prefer:

- explicit mappings;
- typed unions;
- deterministic validation;
- small pure functions;
- clear command handlers;
- controlled managed-code regions;
- procedural 3D geometry.

Avoid:

- premature plugin systems;
- generic graph engines unless needed;
- arbitrary C++ AST parsing;
- physics;
- WebGL tricks that do not improve the demo;
- complicated databases;
- auth;
- billing;
- collaboration backends.

## 2.5 Report after each milestone

At the end of each milestone, Codex should report:

```text
Milestone:
Implemented:
Files changed:
Tests run:
Manual checks:
Known limitations:
Next milestone:
```

---

# 3. Demo-first definition of done

The MVP is complete only when this scenario works repeatedly.

## Scenario

1. Open a blank CircuitCanvas project.
2. Add:
   - one ESP32;
   - one push button;
   - one resistor;
   - one LED.
3. Wire a valid push-button-controlled LED project.
4. View the same project in schematic mode.
5. Switch to 3D mode and see the same components and electrical connections.
6. Switch to code mode and see synchronized bindings such as:

```cpp
#define LED_PIN 18
#define BUTTON_PIN 27
```

7. Change `LED_PIN` from `18` to `19` in the managed code region.
8. CircuitCanvas validates GPIO19.
9. The canonical connection changes from GPIO18 to GPIO19.
10. Schematic wire moves.
11. 3D jumper wire moves.
12. Validation runs and remains valid.
13. Manually remove the resistor from the circuit.
14. Validation detects a missing current-limiting resistor.
15. Browser agent uses WebMCP to inspect and validate the current project.
16. User asks agent to fix it.
17. Agent adds/reconnects the resistor through WebMCP.
18. Schematic and 3D update live.
19. Validation returns healthy.
20. Ask agent to explain the circuit.
21. Agent reads project state and highlights the button, ESP32, resistor, and LED as it explains them.
22. Undo reverts the last agent change.

If this sequence is not stable, do not spend time adding more electronics components.

---

# 4. Core architecture rule

## 4.1 One canonical domain model

There must be **one and only one source of truth**:

```text
                           CircuitProject
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
          Schematic View     3D View         Code View
                │               │               │
                └───────────────┼───────────────┘
                                │
                     Validation / WebMCP
```

The following must **not** become authoritative state:

- React Flow `nodes`;
- React Flow `edges`;
- Three.js object positions;
- Monaco editor models;
- WebMCP tool-local state.

Those systems receive projections of the canonical project.

## 4.2 Shared command layer

All mutations pass through domain commands:

```text
Human schematic action ─┐
Human code action ──────┤
Human 3D action ────────┤
WebMCP action ──────────┼──> Domain Command Layer ──> CircuitProject
Undo/redo ──────────────┘
```

Never implement a WebMCP tool that mutates Zustand directly if the equivalent human command goes through another function.

---

# 5. Recommended stack

Use compatible current stable versions.

## App

- Next.js App Router
- React
- TypeScript
- Tailwind CSS

## State and validation

- Zustand
- Zod
- Immer optional

## Schematic

- `@xyflow/react`

React Flow currently supports custom nodes with multiple uniquely identified handles. Use one handle ID per electronic pin.

## 3D

- `three`
- `@react-three/fiber`
- `@react-three/drei`

Use procedural models for most MVP components. Use `.glb` only where it saves time.

## Code

- `@monaco-editor/react`
- `monaco-editor` if required by the wrapper/bundler

## Utilities

- `lucide-react`
- `nanoid` or `crypto.randomUUID()`

## Testing

- Vitest
- Testing Library
- Playwright

## WebMCP

Use the current imperative API with:

```ts
document.modelContext
```

Use current TypeScript typings from `webmcp-types` if compatible.

Do not use deprecated:

```ts
navigator.modelContext
```

---

# 6. Suggested dependency installation

Codex should first inspect existing packages. If absent, install equivalent current stable versions.

Example:

```bash
npm install zustand zod @xyflow/react three @react-three/fiber @react-three/drei @monaco-editor/react lucide-react
npm install -D vitest @testing-library/react @testing-library/jest-dom playwright webmcp-types
```

If the app already has test tooling, reuse it.

Do not blindly install duplicate packages.

---

# 7. Suggested project structure

Adapt if the repository already has strong conventions.

```text
src/
  app/
    page.tsx
    editor/
      page.tsx

  components/
    layout/
      EditorShell.tsx
      Header.tsx
      ViewTabs.tsx
      StatusBar.tsx

    library/
      ComponentLibrary.tsx
      ComponentLibraryItem.tsx

    schematic/
      SchematicView.tsx
      nodes/
        ESP32Node.tsx
        LEDNode.tsx
        ResistorNode.tsx
        ButtonNode.tsx
        PinHandle.tsx
      CircuitEdge.tsx
      SchematicToolbar.tsx

    physical/
      Physical3DView.tsx
      BreadboardScene.tsx
      models/
        ESP32Model.tsx
        LEDModel.tsx
        ResistorModel.tsx
        ButtonModel.tsx
        BreadboardModel.tsx
      Wire3D.tsx
      PinAnchorDebug.tsx
      CameraFocusController.tsx

    code/
      CodeView.tsx
      FirmwareEditor.tsx
      SyncBadge.tsx
      SyncConflictPanel.tsx

    inspector/
      Inspector.tsx
      ComponentInspector.tsx
      PinInspector.tsx

    validation/
      ValidationPanel.tsx
      ValidationIssue.tsx
      CircuitHealth.tsx

    agent/
      AgentActivityPanel.tsx
      ActivityRow.tsx

  domain/
    types.ts
    component-definitions.ts
    pin-capabilities.ts
    commands/
      add-component.ts
      remove-component.ts
      move-component.ts
      connect-pins.ts
      disconnect-connection.ts
      update-component-property.ts
      rebind-controller-pin.ts
      select-component.ts
      highlight-components.ts
      set-active-view.ts
      lock-component.ts
      undo.ts
      redo.ts
    graph/
      adjacency.ts
      paths.ts
      topology.ts
    selectors/
      components.ts
      connections.ts
      bindings.ts

  store/
    project-store.ts
    history.ts
    persistence.ts
    migrations.ts

  validation/
    validate-circuit.ts
    score.ts
    rules/
      led-missing-resistor.ts
      direct-power-ground.ts
      led-polarity.ts
      missing-ground.ts
      output-pin-capability.ts
      floating-button.ts
      disconnected-component.ts
      firmware-mismatch.ts

  firmware/
    firmware-types.ts
    templates.ts
    binding-derivation.ts
    managed-region.ts
    parse-managed-region.ts
    sync-circuit-to-code.ts
    sync-code-to-circuit.ts

  physical/
    layout.ts
    anchors.ts
    wire-routing.ts

  webmcp/
    register-tools.ts
    tool-types.ts
    tool-output.ts
    activity.ts
    tools/
      get-circuit-summary.ts
      get-component-details.ts
      get-available-pins.ts
      add-component.ts
      remove-component.ts
      connect-components.ts
      disconnect-components.ts
      update-component-property.ts
      validate-circuit.ts
      highlight-component.ts
      set-view.ts
      undo-last-action.ts

  lib/
    ids.ts
    result.ts

public/
  assets/
    models/
    attribution/

tests/
  domain/
  validation/
  firmware/
  webmcp/
  e2e/
```

---

# 8. Domain data model

## 8.1 IDs

Use branded strings if convenient, but plain strings are acceptable.

```ts
export type ComponentId = string;
export type PinId = string;
export type ConnectionId = string;
```

## 8.2 Component kinds

For the hackathon MVP:

```ts
export type ComponentKind =
  | "esp32-devkitc-v4"
  | "led"
  | "resistor"
  | "push-button";
```

Do not add more until the full demo flow works.

## 8.3 Pin capabilities

```ts
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
```

## 8.4 Pin definition

```ts
export interface PinDefinition {
  id: PinId;
  label: string;
  aliases?: string[];

  capabilities: PinCapability[];

  inputOnly?: boolean;
  outputOnly?: boolean;

  voltage?: {
    nominal?: number;
    min?: number;
    max?: number;
  };

  schematicAnchor: {
    side: "left" | "right" | "top" | "bottom";
    order: number;
  };

  physicalAnchor: {
    x: number;
    y: number;
    z: number;
  };

  notes?: string[];
}
```

## 8.5 Component definition

Static metadata:

```ts
export interface ComponentDefinition<
  TProperties extends Record<string, unknown> =
    Record<string, unknown>
> {
  kind: ComponentKind;
  displayName: string;
  category:
    | "controller"
    | "output"
    | "passive"
    | "input";

  description: string;

  pins: PinDefinition[];

  defaultProperties: TProperties;

  firmwareRole?: {
    supported: boolean;
    defaultSymbolPrefix?: string;
  };

  visual: {
    schematicType: ComponentKind;
    physicalType: ComponentKind;
  };

  reference?: {
    manufacturer?: string;
    docsUrl?: string;
  };
}
```

## 8.6 Instance

```ts
export interface CircuitComponent {
  id: ComponentId;
  kind: ComponentKind;
  name: string;

  schematic: {
    x: number;
    y: number;
    rotation: 0 | 90 | 180 | 270;
  };

  physical: {
    x: number;
    y: number;
    z: number;
    rotationY: number;
  };

  properties: Record<string, unknown>;

  locked: boolean;
}
```

## 8.7 Connection

```ts
export interface Endpoint {
  componentId: ComponentId;
  pinId: PinId;
}

export interface CircuitConnection {
  id: ConnectionId;

  source: Endpoint;
  target: Endpoint;

  role:
    | "power"
    | "ground"
    | "signal"
    | "unknown";

  wireStyle: {
    semanticColor:
      | "power"
      | "ground"
      | "signal"
      | "neutral";
  };
}
```

## 8.8 Firmware state

```ts
export type FirmwareSyncStatus =
  | "synced"
  | "dirty"
  | "conflict";

export interface FirmwareBinding {
  id: string;

  role: "led" | "button";

  componentId: ComponentId;
  controllerComponentId: ComponentId;

  controllerPinId: PinId;
  symbolName: "LED_PIN" | "BUTTON_PIN";

  mode:
    | "OUTPUT"
    | "INPUT"
    | "INPUT_PULLUP";
}

export interface FirmwareState {
  target: "esp32-arduino";

  code: string;

  bindings: FirmwareBinding[];

  sync: {
    status: FirmwareSyncStatus;
    issues: FirmwareSyncIssue[];
  };

  generatedRevision: number;
  generatedHash?: string;
}
```

## 8.9 Validation

```ts
export type ValidationSeverity =
  | "info"
  | "warning"
  | "high"
  | "critical";

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
    action:
      | "add-resistor"
      | "reconnect"
      | "choose-output-pin"
      | "add-ground"
      | "reverse-led";
    data?: Record<string, unknown>;
  };
}

export interface ValidationReport {
  valid: boolean;
  score: number;
  issues: ValidationIssue[];
}
```

## 8.10 UI state

```ts
export interface ProjectUIState {
  activeView: "schematic" | "3d" | "code";

  selectedComponentId?: ComponentId;
  selectedConnectionId?: ConnectionId;

  highlightedComponentIds: ComponentId[];
}
```

## 8.11 Project

```ts
export interface CircuitProject {
  schemaVersion: 1;

  id: string;
  name: string;

  components: Record<ComponentId, CircuitComponent>;
  connections: Record<ConnectionId, CircuitConnection>;

  firmware: FirmwareState;

  validation: {
    report?: ValidationReport;
    lastRunAt?: string;
  };

  ui: ProjectUIState;

  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}
```

---

# 9. ESP32 definition

Target board: **ESP32-DevKitC V4**.

Use Espressif's official documentation as the source of truth:

https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html

Official documentation identifies:
- board header mapping;
- input-only pins;
- internally used flash pins;
- power pins;
- board dimensions and related documents.

For the MVP expose a deliberately small educational set.

```ts
export const ESP32_BEGINNER_PINS = [
  "3V3",
  "GND_1",
  "GND_2",
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
```

### Important metadata

GPIO34 and GPIO35:
- input only;
- valid for input;
- invalid for LED output.

Espressif documentation also warns that GPIO6–GPIO11 are used internally for flash on relevant ESP32 modules. Do not expose them in beginner mode.

For the demo:
- default LED pin: GPIO18;
- alternate LED pin for synchronization demo: GPIO19;
- default button pin: GPIO27.

Do not assert that these are the only possible pins. They are simply CircuitCanvas defaults.

---

# 10. LED definition

Simplify to two pins:

```ts
const ledPins = [
  {
    id: "ANODE",
    label: "Anode (+)",
    capabilities: ["positive"],
  },
  {
    id: "CATHODE",
    label: "Cathode (-)",
    capabilities: ["negative"],
  },
];
```

Properties:

```ts
{
  color: "red",
  forwardVoltageReference: 2.0
}
```

Do not implement real current calculations for the MVP.

The forward-voltage field is explanatory metadata only.

---

# 11. Resistor definition

Pins:

```text
A
B
```

Both:

```ts
capabilities: ["passive-terminal"]
```

Property:

```ts
{
  resistanceOhms: 220
}
```

Inspector:
- numeric input;
- presets: 220 Ω, 330 Ω, 1 kΩ, 10 kΩ.

For the demo use 220 Ω.

---

# 12. Push button definition

Use a simplified educational **two-terminal button** rather than modeling four internally paired breadboard pins.

Pins:

```text
A
B
```

Properties:

```ts
{
  normallyOpen: true
}
```

This dramatically simplifies topology and 3D wiring.

The 3D shape may visually resemble a tactile switch, but the domain model intentionally exposes only two logical terminals.

Document this as a simplified educational representation.

---

# 13. Domain command system

Create a result type:

```ts
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
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: {
        code: DomainErrorCode;
        message: string;
      };
    };
```

Every command:
1. reads current project;
2. validates structural input;
3. produces new project;
4. records history;
5. records activity;
6. marks updated timestamp;
7. invokes synchronization coordinator;
8. returns typed result.

Required commands:

```text
addComponent
removeComponent
moveComponent
connectPins
disconnectConnection
updateComponentProperty
rebindControllerPin
selectComponent
highlightComponents
setActiveView
lockComponent
unlockComponent
undo
redo
```

---

# 14. History model

For hackathon simplicity, snapshots are acceptable because the project is tiny.

```ts
interface HistoryState {
  past: CircuitProject[];
  present: CircuitProject;
  future: CircuitProject[];
}
```

Rules:
- cap past at 100;
- UI-only selection changes do not need history;
- electrical/project mutations do;
- WebMCP mutations do;
- generated sync updates resulting from one command should be part of the same history transaction.

Example:

Changing code:

```cpp
#define LED_PIN 18
```

to:

```cpp
#define LED_PIN 19
```

should generate **one undo step**, even though it causes:
- code state change;
- domain rebind;
- schematic update;
- 3D wire update;
- validation update.

---

# 15. Zustand store

Recommended:

```ts
interface ProjectStore {
  project: CircuitProject;

  past: CircuitProject[];
  future: CircuitProject[];

  executeCommand<T>(
    command: DomainCommand<T>,
    meta?: CommandMeta
  ): CommandResult<T>;

  loadProject(project: CircuitProject): void;
  resetProject(): void;

  undo(): void;
  redo(): void;
}
```

Metadata:

```ts
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
```

---

# 16. Initial project state

Blank project should contain no electronic components.

However, provide a one-click example/template called:

> Push Button LED

Template:

```text
Button:
one terminal → GND
other terminal → GPIO27

LED:
GPIO18 → resistor → LED anode
LED cathode → GND
```

Firmware can use:

```cpp
pinMode(BUTTON_PIN, INPUT_PULLUP);
```

and treat LOW as pressed.

---

# 17. Schematic editor

Use `@xyflow/react`.

## 17.1 Projection

Never save React Flow nodes as the circuit.

```ts
const flowNodes = selectReactFlowNodes(project);
const flowEdges = selectReactFlowEdges(project);
```

## 17.2 Custom nodes

Build exactly four node renderers:

```text
ESP32Node
LEDNode
ResistorNode
ButtonNode
```

Use common:

```text
NodeShell
PinHandle
```

## 17.3 React Flow handles

Every electrical pin is represented by a unique handle ID.

Example:

```tsx
<Handle
  id="GPIO18"
  type="source"
  position={Position.Right}
/>
```

Use:

```tsx
connectionMode={ConnectionMode.Loose}
```

if that gives a cleaner bidirectional wiring UX.

React Flow supports multiple handles and unique handle IDs. Edges should map source/target handles to exact pin IDs.

## 17.4 Do not over-block invalid electrical wiring

The editor is educational.

Allow the user to create many electrically incorrect circuits so validation can explain them.

Reject only structurally invalid operations:

- nonexistent component;
- nonexistent pin;
- exact duplicate edge;
- connecting a locked component if lock policy forbids rewiring.

Electrical errors should normally be warnings from validation rather than UI refusal.

## 17.5 Node movement

Use drag stop:

```ts
onNodeDragStop={(_, node) => {
  executeCommand(
    moveComponent({
      componentId: node.id,
      x: node.position.x,
      y: node.position.y,
    }),
    {
      origin: "human-schematic",
      actor: "human",
    }
  );
}}
```

Do not persist dozens of history snapshots during every drag frame.

## 17.6 Selection

On node click:

```ts
selectComponent(componentId)
```

Selection must drive:
- inspector;
- schematic highlight;
- 3D highlight;
- code binding info;
- WebMCP state.

## 17.7 Edge deletion

Deleting a React Flow edge dispatches:

```ts
disconnectConnection(connectionId)
```

## 17.8 Visual design

Aim for a clean editor, not a realistic breadboard in 2D.

### ESP32
Simplified dark PCB:
- USB block;
- ESP module block;
- two pin columns;
- visible labels for exposed beginner pins.

### LED
- classic LED symbol/shape;
- clearly labeled anode/cathode.

### Resistor
- rectangular/zig-zag visual;
- `220 Ω` label.

### Button
- tactile switch/iconic button visual;
- A and B terminals.

Use original SVG/React shapes.

---

# 18. 2D asset rules

Do not use product photos.

Preferred:
- React/SVG geometry authored in project;
- Lucide icons for ordinary interface controls.

References:
- ESP32 pinout: Espressif official documentation.
- LED/resistor/button: generic original vector representations.

Store no Google Images downloads.

If Codex needs reference imagery during development, reference official pages in comments/docs but do not hotlink those images into the runtime UI.

---

# 19. Schematic edge rendering

Each edge color should be determined from connection role.

Suggested semantic CSS variables:

```css
--wire-power: ...;
--wire-ground: ...;
--wire-signal: ...;
--wire-warning: ...;
```

Do not hard-code unrelated inline colors everywhere.

Connection role classification:

```ts
function classifyConnection(
  project: CircuitProject,
  connection: CircuitConnection
): CircuitConnection["role"] {
  // If either endpoint is GND → ground.
  // If endpoint is 3V3 → power.
  // Otherwise signal unless unknown.
}
```

---

# 20. Graph utilities

Build graph logic independent of React Flow.

Create endpoint key:

```ts
function endpointKey(endpoint: Endpoint) {
  return `${endpoint.componentId}:${endpoint.pinId}`;
}
```

Build adjacency:

```ts
Map<string, Set<string>>
```

Required functions:

```text
buildAdjacency
getConnectedEndpoints
getConnectionsForComponent
getConnectionsForPin
hasPath
findPaths
hasGroundPath
findConnectedControllerPin
pathContainsComponentKind
findSeriesPath
```

Validation uses these functions.

Do not implement validation by walking React Flow edges.

---

# 21. 3D view philosophy

The 3D view communicates:

> "How could this exact logical circuit look physically?"

It does not claim precise breadboard manufacturing accuracy.

The fastest high-quality approach is:

- simplified breadboard/work surface;
- simplified procedural ESP32;
- procedural LED;
- procedural resistor;
- procedural push button;
- jumper wires derived from the same connection graph.

No physical simulation is required.

---

# 22. 3D scene implementation

Use React Three Fiber.

Structure:

```tsx
<Canvas>
  <ambientLight />
  <directionalLight />

  <BreadboardModel />

  <ESP32Model />
  <LEDModel />
  <ResistorModel />
  <ButtonModel />

  {connections.map(connection => (
    <Wire3D
      key={connection.id}
      connection={connection}
    />
  ))}

  <CameraFocusController />
  <OrbitControls />
</Canvas>
```

Add a neutral floor/workbench.

Use shadows only if performance is acceptable.

---

# 23. Physical coordinate system

Define one system and document it.

Recommended:

```text
X = left/right
Y = height
Z = front/back
```

`component.physical` stores coordinates in a normalized board space.

Example:

```ts
const WORLD_SCALE = 0.1;

function toWorld(
  physical: { x: number; y: number; z: number }
): [number, number, number] {
  return [
    physical.x * WORLD_SCALE,
    physical.y * WORLD_SCALE,
    physical.z * WORLD_SCALE,
  ];
}
```

Do not reuse schematic X/Y as physical placement.

---

# 24. 3D component models

## 24.1 ESP32

For MVP, model it procedurally.

Required visual elements:
- PCB board rectangle;
- ESP module metal can;
- Micro-USB connector;
- left/right header strips;
- tiny dark pin holes/pins;
- board label "ESP32";
- no need for manufacturer logo.

Why procedural:
- no licensing issue;
- fast;
- lightweight;
- exact pin anchors can be aligned with your own geometry.

Official reference:
https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html

Espressif provides board layout and related dimension documents from that page. Use them as reference, but the MVP model can remain visually simplified.

## 24.2 LED

Procedural:
- translucent/emissive rounded top;
- body;
- two leads;
- anode/cathode anchor points.

## 24.3 Resistor

Procedural:
- cylindrical or rounded body;
- two leads;
- simplified bands or plain 220 Ω text label.

Do not waste time creating electrically exact resistor color bands unless trivial.

## 24.4 Button

Procedural:
- square body;
- elevated cap;
- two logical connection posts.

Even if a real tactile switch has four physical leads, keep two logical terminals because the MVP domain is simplified.

## 24.5 Breadboard

Procedural:
- white rectangular body;
- power rail markings;
- repeated hole geometry via `InstancedMesh`;
- enough holes to visually ground the scene.

The domain does not need to model every breadboard hole.

---

# 25. Optional GLB assets

Only use GLB if procedural ESP32 becomes visually insufficient.

Three.js currently recommends glTF/GLB for runtime 3D asset delivery.

Reference:
https://threejs.org/manual/en/loading-3d-models.html

Loader:
https://threejs.org/docs/pages/GLTFLoader.html

If using external model:
1. verify exact license;
2. verify redistribution;
3. record author;
4. include license;
5. add attribution;
6. convert to GLB;
7. optimize;
8. do not depend on remote model URLs at runtime.

For this MVP, original procedural models are preferred.

---

# 26. 3D pin anchors

This is critical.

Each component definition must have local 3D anchor coordinates for every logical pin.

Example:

```ts
{
  id: "GPIO18",
  physicalAnchor: {
    x: 0.52,
    y: 0.08,
    z: 0.16
  }
}
```

Do **not** copy these example numbers blindly.

Calibrate against the actual procedural model.

## Debug mode

Create:

```ts
showPinAnchors: boolean
```

When true:
- draw small spheres on every logical pin;
- show pin label;
- highlight selected pin.

This must exist during development.

Pin anchor calibration workflow:

1. render board;
2. render debug anchors;
3. compare anchors to header positions;
4. adjust component definition;
5. connect test wires;
6. verify from multiple camera angles;
7. turn debug UI off in production.

---

# 27. 3D wire rendering

For every canonical connection:

1. resolve source component;
2. resolve source pin local anchor;
3. transform to world coordinates;
4. resolve target;
5. create elevated curve;
6. render line/tube.

Pseudo-code:

```ts
function makeWirePoints(
  source: Vector3,
  target: Vector3
) {
  const lift = Math.max(
    0.15,
    source.distanceTo(target) * 0.15
  );

  return [
    source,
    source.clone().add(new Vector3(0, lift, 0)),
    target.clone().add(new Vector3(0, lift, 0)),
    target,
  ];
}
```

Use:
- `CatmullRomCurve3`;
- `TubeGeometry`;
or a performant line abstraction from Drei.

Wire color derives from semantic connection role.

No wire physics.

---

# 28. Physical layout

When adding a component, assign both:
- schematic position;
- physical position.

Implement simple fixed zones.

Example:

```text
ESP32    center-left
Button   lower-left
Resistor center-right
LED      upper-right
```

This makes the hero circuit visually clean.

For agent-created components without explicit position:
- use deterministic auto-placement.

Do not attempt a general-purpose physical auto-layout algorithm.

---

# 29. 2D ↔ 3D selection synchronization

One selected ID:

```ts
project.ui.selectedComponentId
```

2D click:
- sets selected ID;
- 3D renders outline/emphasis.

3D click:
- sets same selected ID;
- schematic emphasizes node.

WebMCP `highlight_component`:
- adds to `highlightedComponentIds`;
- both views highlight it.

No duplicated selection state.

---

# 30. Code editor implementation

Use `@monaco-editor/react`.

Load dynamically/client-side in Next.js if required.

The Monaco package supports React usage and Next.js integration.

The code view contains:
- editor;
- sync badge;
- binding chips;
- warning/conflict banner;
- short text explaining managed region.

---

# 31. Managed firmware philosophy

Do not parse arbitrary C++.

CircuitCanvas owns specific managed markers.

Example:

```cpp
// CircuitCanvas ESP32 starter project

// <circuitcanvas:bindings>
#define LED_PIN 18
#define BUTTON_PIN 27
// </circuitcanvas:bindings>

void setup() {
  // <circuitcanvas:setup>
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  // </circuitcanvas:setup>
}

void loop() {
  bool pressed = digitalRead(BUTTON_PIN) == LOW;
  digitalWrite(LED_PIN, pressed ? HIGH : LOW);
}
```

The student can freely edit outside the managed bindings/setup blocks.

MVP synchronization only guarantees:
- `LED_PIN`;
- `BUTTON_PIN`;
- generated `pinMode` calls.

---

# 32. Firmware binding derivation

Bindings are based on **canonical circuit topology**, not text.

Need functions:

```ts
deriveLedBinding(project)
deriveButtonBinding(project)
deriveFirmwareBindings(project)
```

LED binding:
1. find LED;
2. trace from LED anode through resistor;
3. find connected ESP32 GPIO;
4. ensure that pin supports digital output;
5. return LED binding.

Button:
1. find button;
2. find its signal-side ESP32 connection;
3. find GND on other terminal;
4. bind to digital input;
5. use `INPUT_PULLUP` for hero topology.

---

# 33. Circuit → code synchronization

Any electrical command affecting bindings triggers:

```ts
syncCircuitToFirmware(project)
```

Algorithm:

```text
Canonical circuit
      ↓
derive bindings
      ↓
render managed blocks
      ↓
replace only managed regions
      ↓
store code + bindings
```

Required managed-region utilities:

```text
findManagedRegion
replaceManagedRegion
renderBindingsRegion
renderSetupRegion
hashManagedRegion
```

Do not regenerate the entire file.

Preserve all user code outside the managed markers byte-for-byte where possible.

---

# 34. Code → circuit synchronization

User edits:

```cpp
#define LED_PIN 18
```

to:

```cpp
#define LED_PIN 19
```

CircuitCanvas should rebind the LED signal path.

## 34.1 Parsing scope

Parse only exact supported patterns inside the bindings block.

Required:

```cpp
#define LED_PIN <integer>
#define BUTTON_PIN <integer>
```

No arbitrary expression parsing.

Reject:

```cpp
#define LED_PIN someVariable
```

as unsupported managed binding.

## 34.2 Debounce

Debounce parsing:

```text
300–500 ms
```

after Monaco changes.

## 34.3 Validation before mutation

For `LED_PIN`:
- pin exists;
- pin belongs to ESP32;
- pin supports digital output;
- pin not input-only;
- no lock conflict.

For `BUTTON_PIN`:
- pin exists;
- pin supports digital input.

Example invalid:

```cpp
#define LED_PIN 34
```

ESP32 GPIO34 is input-only according to Espressif documentation.

Result:
- do not mutate canonical circuit;
- firmware sync state becomes `conflict`;
- show:

```text
GPIO34 cannot drive the LED because this pin is input-only on ESP32.
Choose an output-capable GPIO such as GPIO18 or GPIO19.
```

---

# 35. Rebinding an LED pin

Suppose circuit:

```text
ESP32 GPIO18 → R1 → LED
```

and user changes code to GPIO19.

Do not delete resistor or LED.

Find connection that attaches controller to resistor/LED path and change only controller endpoint.

Pseudo-code:

```ts
rebindControllerPin({
  componentId: ledId,
  role: "led",
  oldPin: "GPIO18",
  newPin: "GPIO19",
})
```

The operation should:
1. identify ESP32-side connection;
2. verify topology;
3. rewrite endpoint;
4. preserve connection ID if possible;
5. update firmware bindings;
6. run validation;
7. appear as one history item.

---

# 36. Preventing synchronization loops

This is mandatory.

Without protection:

```text
code edit
→ circuit mutation
→ regenerate code
→ Monaco change
→ circuit mutation
→ ...
```

Use revision/hash + origin.

Example:

```ts
interface SyncContext {
  origin: ChangeOrigin;
  revision: number;
}
```

When system regenerates code:
1. increment `generatedRevision`;
2. store managed-region hash;
3. Monaco receives code;
4. onChange parses;
5. if parsed managed hash equals last generated hash, ignore as self-generated.

Alternative:
- use `isApplyingGeneratedCodeRef`.

Prefer hash/revision because it is easier to debug.

---

# 37. Validation philosophy

CircuitCanvas provides **educational checks**, not professional certification.

UI disclaimer:

> CircuitCanvas checks supported beginner circuit patterns. It is not a substitute for professional electrical design or safety review.

Validation must be deterministic and testable.

No LLM is used to decide whether a circuit is valid.

---

# 38. Validation rule 1 — missing LED resistor

Goal:
Detect direct controller-output → LED path with no series resistor.

Invalid:

```text
GPIO18 → LED anode
LED cathode → GND
```

Valid:

```text
GPIO18 → resistor → LED anode
LED cathode → GND
```

Implementation:
- find path from LED anode toward ESP32;
- determine whether path contains `resistor`;
- if no resistor, issue.

Severity:
`high`.

Suggested message:

> LED1 is connected to the ESP32 without a current-limiting resistor. Add a resistor in series. For many beginner low-voltage LED examples, 220–330 Ω is a common starting range, but the appropriate value depends on the LED and supply.

Do not claim 220 Ω is universally correct.

---

# 39. Validation rule 2 — ESP32 output pin capability

If LED path resolves to:
- GPIO34;
- GPIO35;
- or another input-only pin in the exposed metadata;

issue:

```text
HIGH — Output connected to an input-only GPIO
```

The rule must use metadata:

```ts
pin.inputOnly === true
```

not hard-coded checks scattered around the app.

---

# 40. Validation rule 3 — LED ground path

LED cathode should ultimately reach an ESP32 GND endpoint in the simplified hero topology.

If not:
- high warning;
- highlight relevant endpoint.

---

# 41. Validation rule 4 — LED polarity

If:
- cathode is connected toward controller output/resistor;
- anode is connected toward GND;

flag reversed polarity.

The topology representation is simplified, so implement only deterministic known cases.

---

# 42. Validation rule 5 — button topology

Expected hero topology:

```text
GND → Button → GPIO27
```

with code:

```cpp
pinMode(BUTTON_PIN, INPUT_PULLUP);
```

If button:
- has only one connection;
- has no GPIO path;
- or no GND path;

flag incomplete button circuit.

---

# 43. Validation rule 6 — direct power-ground connection

If canonical graph contains a direct connection:

```text
3V3 → GND
```

with no component separating endpoints:
- critical issue.

Do not calculate current.

Message:

> A power pin is directly connected to ground in the logical circuit. Remove the direct connection before continuing.

---

# 44. Validation rule 7 — disconnected components

If a component has no connections:
- info/warning depending on component.

This helps agents understand partially built circuits.

---

# 45. Validation rule 8 — firmware mismatch

If canonical circuit says:

```text
LED → GPIO19
```

but parsed managed binding says:

```cpp
#define LED_PIN 18
```

flag a synchronization issue.

Normally sync should prevent this; this rule detects corruption/manual edits.

---

# 46. Circuit health score

Keep simple:

```text
critical = -35
high     = -15
warning  = -5
info     = -1
```

Clamp 0–100.

Label:

> Beginner Circuit Health

Never:
> Electrical Safety Score

---

# 47. Validation timing

Run validation:
- when user clicks Validate;
- after electrical mutations;
- after accepted code-to-circuit rebind;
- after WebMCP edit sequence;
- after undo/redo.

Debounce automatic validation slightly if needed.

Do not rerun expensive graph analysis every mouse-move frame.

---

# 48. WebMCP architecture

Use the current imperative WebMCP API.

Official documentation:
https://developer.chrome.com/docs/ai/webmcp

Current imperative API:
https://developer.chrome.com/docs/ai/webmcp/imperative-api

Current official docs state:
- WebMCP is a proposed web standard for structured tools;
- tool registration uses `document.modelContext`;
- tools use JSON Schema;
- `registerTool()` accepts an optional `AbortSignal` for lifecycle cleanup;
- `navigator.modelContext` is deprecated;
- the `webmcp-types` package is recommended for TypeScript typing;
- tools can carry annotations such as read-only hints.

WebMCP must be isolated in `src/webmcp`.

Do not spread browser API calls through React components.

---

# 49. WebMCP availability detection

```ts
export function hasWebMCP(): boolean {
  return (
    typeof document !== "undefined" &&
    "modelContext" in document &&
    !!document.modelContext
  );
}
```

UI states:

```text
● Agent tools ready
```

or:

```text
○ Agent tools unavailable in this browser
```

The app must still work normally when WebMCP is unavailable.

---

# 50. WebMCP registration lifecycle

Register once when editor/store are ready.

Use AbortController:

```ts
useEffect(() => {
  if (!hasWebMCP()) return;

  const controller = new AbortController();

  registerCircuitCanvasTools({
    signal: controller.signal,
    deps,
  });

  return () => {
    controller.abort();
  };
}, [deps]);
```

Ensure `deps` is stable so React rerenders do not duplicate tools.

If necessary create a single `WebMCPProvider`.

---

# 51. WebMCP tool rules

Every tool must:

1. have a clear verb-based name;
2. explain when to use it;
3. have strict JSON Schema;
4. set `additionalProperties: false`;
5. perform one logical operation;
6. call the shared domain layer;
7. respect locks;
8. return compact structured results;
9. log visible agent activity;
10. not expose massive raw project structures.

---

# 52. Required WebMCP tools

For this MVP implement these **12 tools**.

```text
get_circuit_summary
get_component_details
get_available_pins
add_component
remove_component
connect_components
disconnect_components
update_component_property
validate_circuit
highlight_component
set_view
undo_last_action
```

Do not add more until these are reliable.

---

# 53. Tool: get_circuit_summary

Read only.

Description:

> Read a compact summary of the current CircuitCanvas project. Use this before diagnosing, explaining, or modifying a circuit when you need to understand its components, electrical connections, current validation status, firmware pin bindings, selected item, or locked items.

Input:

```json
{
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```

Output example:

```json
{
  "projectName": "Push Button LED",
  "activeView": "schematic",
  "components": [
    {
      "id": "cmp_esp32",
      "kind": "esp32-devkitc-v4",
      "name": "ESP32"
    },
    {
      "id": "cmp_led",
      "kind": "led",
      "name": "LED1"
    }
  ],
  "connections": [
    {
      "id": "conn_1",
      "from": "ESP32.GPIO18",
      "to": "R1.A"
    }
  ],
  "firmwareBindings": {
    "LED_PIN": 18,
    "BUTTON_PIN": 27
  },
  "healthScore": 100,
  "issues": [],
  "selectedComponentId": null,
  "lockedComponentIds": []
}
```

Annotation:
- read only.

---

# 54. Tool: get_component_details

Input:

```json
{
  "componentId": "cmp_led"
}
```

Output:
- ID;
- name;
- kind;
- properties;
- pin list;
- current connections;
- validation issues;
- locked state.

Use exact component IDs.

---

# 55. Tool: get_available_pins

Purpose:
Help agent choose a valid controller pin rather than guessing.

Input:

```json
{
  "controllerComponentId": "cmp_esp32",
  "capability": "digital-output",
  "excludeUsed": true
}
```

Output:

```json
{
  "pins": [
    {
      "id": "GPIO18",
      "label": "GPIO18",
      "capabilities": [
        "digital-input",
        "digital-output"
      ]
    },
    {
      "id": "GPIO19",
      "label": "GPIO19",
      "capabilities": [
        "digital-input",
        "digital-output"
      ]
    }
  ],
  "excluded": [
    {
      "id": "GPIO34",
      "reason": "Input-only pin"
    }
  ]
}
```

---

# 56. Tool: add_component

Input:

```json
{
  "kind": "resistor",
  "name": "R1",
  "x": 500,
  "y": 250
}
```

`x`/`y` optional.

Allowed kinds:
- esp32-devkitc-v4
- led
- resistor
- push-button

Output:
- component ID;
- name;
- kind.

This invokes `addComponent` domain command.

---

# 57. Tool: remove_component

Input:
```json
{
  "componentId": "cmp_resistor"
}
```

If locked, return:

```json
{
  "ok": false,
  "error": {
    "code": "COMPONENT_LOCKED",
    "message": "R1 is locked and cannot be removed."
  }
}
```

---

# 58. Tool: connect_components

Require explicit pins.

Input:

```json
{
  "sourceComponentId": "cmp_esp32",
  "sourcePinId": "GPIO18",
  "targetComponentId": "cmp_r1",
  "targetPinId": "A"
}
```

Do not make this tool accept vague natural language like:
- `"source": "the board"`.

Agent should first call state/detail/pin tools if unsure.

---

# 59. Tool: disconnect_components

Input:

```json
{
  "connectionId": "conn_1"
}
```

Return:
- disconnected endpoints;
- current validation summary optionally.

---

# 60. Tool: update_component_property

For the MVP primarily resistor value.

Input:

```json
{
  "componentId": "cmp_r1",
  "property": "resistanceOhms",
  "value": 220
}
```

Use component-specific Zod validation.

Do not allow arbitrary object injection into properties.

---

# 61. Tool: validate_circuit

Input empty.

Output:

```json
{
  "valid": false,
  "healthScore": 75,
  "issues": [
    {
      "id": "issue_1",
      "severity": "high",
      "ruleId": "led-missing-resistor",
      "title": "LED needs a series resistor",
      "componentIds": ["cmp_led"],
      "message": "..."
    }
  ]
}
```

This tool must not mutate the circuit except storing latest validation report.

---

# 62. Tool: highlight_component

Input:

```json
{
  "componentId": "cmp_led",
  "durationMs": 4000
}
```

Clamp duration:
- min 500;
- max 10000.

Highlight in:
- schematic;
- 3D;
- inspector.

Useful for explanations.

---

# 63. Tool: set_view

Input:

```json
{
  "view": "3d"
}
```

Enum:
- schematic
- 3d
- code

This is a visible UI action and useful in demo prompts such as:

> Show me how it looks physically.

---

# 64. Tool: undo_last_action

Input empty.

Undo most recent project mutation.

Return summary.

---

# 65. WebMCP activity log

Every WebMCP call must be visible.

```ts
interface ActivityEntry {
  id: string;
  timestamp: string;

  actor: "agent";

  toolName: string;

  status:
    | "running"
    | "success"
    | "failed";

  summary: string;

  relatedComponentIds?: string[];
}
```

Example:

```text
AGENT ACTIVITY

✓ get_circuit_summary
✓ validate_circuit
  Found 1 high issue

✓ add_component
  Added R1 (220 Ω)

✓ connect_components
  GPIO18 → R1.A

✓ connect_components
  R1.B → LED1.ANODE

✓ validate_circuit
  Health 100/100
```

This panel should remain visible in the demo.

---

# 66. WebMCP tool implementation example

Use current `document.modelContext.registerTool`.

Illustrative:

```ts
export async function registerCircuitCanvasTools(
  deps: WebMCPDependencies,
  signal: AbortSignal
) {
  const modelContext = document.modelContext;

  await modelContext.registerTool(
    {
      name: "get_circuit_summary",

      description:
        "Read a compact summary of the current CircuitCanvas project, including electronic components, exact pin connections, validation status, firmware pin bindings, selected component, and locks. Use this before diagnosing, explaining, or modifying an unfamiliar circuit.",

      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },

      annotations: {
        readOnlyHint: true,
        untrustedContentHint: false,
      },

      execute: async () => {
        deps.activity.start("get_circuit_summary");

        try {
          const result = deps.getCircuitSummary();
          deps.activity.success(
            "get_circuit_summary",
            "Read current circuit"
          );
          return result;
        } catch (error) {
          deps.activity.fail(
            "get_circuit_summary",
            toPublicError(error)
          );
          throw error;
        }
      },
    },
    { signal }
  );
}
```

For mutation tools:
- `readOnlyHint: false`.

Do not assume browser typings if they differ; use the official `webmcp-types` package or isolate compatibility in one file.

---

# 67. WebMCP local testing

According to current Chrome WebMCP documentation, local development can use:

```text
chrome://flags/#enable-webmcp-testing
```

Process:

1. open Chrome;
2. open flag;
3. enable;
4. relaunch;
5. run CircuitCanvas;
6. verify `document.modelContext` exists;
7. verify registered tools;
8. manually execute tools;
9. test natural-language agent prompts.

Current docs also reference the Model Context Tool Inspector extension for inspecting tools and calling them manually. Use it if available.

Do not make hackathon implementation dependent on that extension.

---

# 68. WebMCP eval prompts

Create an eval file or documented test set.

## Direct prompts

```text
Add an LED.
Add a 220 ohm resistor.
Connect GPIO18 to the resistor.
Validate the circuit.
Show the circuit in 3D.
Show me the code.
Undo the last change.
```

## Contextual prompts

```text
My LED is not safe. Check the circuit.
The LED stopped working after my change.
Use a different output-capable GPIO for the LED.
Explain what is connected to GPIO18.
Show me where the resistor is physically.
Fix the missing resistor without moving the ESP32.
```

## Expected tool sequences

Example:

Prompt:
> My LED is not safe. Check the circuit.

Expected:
```text
get_circuit_summary
validate_circuit
```

Prompt:
> Show me where the resistor is physically.

Expected:
```text
get_circuit_summary or get_component_details
set_view("3d")
highlight_component(resistorId)
```

---

# 69. Component locking

Implement lock toggle in inspector.

If ESP32 is locked:
- cannot move;
- cannot delete;
- cannot change its component identity;
- connections may optionally still be changed.

For hackathon phrasing:

> Fix the circuit without moving the ESP32.

Movement lock is enough.

If connection locking is desired, add separate policy later.

Do not overcomplicate lock semantics.

---

# 70. Explain mode

There is no built-in chatbot required.

Browser agent can:
1. call `get_circuit_summary`;
2. call `get_component_details`;
3. use `highlight_component`;
4. describe current state conversationally.

CircuitCanvas itself only exposes tool capabilities.

This demonstrates WebMCP more cleanly than embedding an unrelated LLM API.

---

# 71. Suggested editor UI

Desktop-first.

```text
┌────────────────────────────────────────────────────────────────────┐
│ CircuitCanvas  Push Button LED   ● Agent Ready   Undo Redo Validate│
│                          Schematic | 3D | Code                     │
├──────────────┬─────────────────────────────────────┬───────────────┤
│ COMPONENTS   │                                     │ INSPECTOR     │
│              │                                     │               │
│ ESP32        │                                     │ LED1          │
│ LED          │             MAIN VIEW               │ Pin state     │
│ Resistor     │                                     │ Connections   │
│ Button       │                                     │ Locked        │
│              │                                     │ Issues        │
├──────────────┴─────────────────────────────────────┴───────────────┤
│ AGENT ACTIVITY                          Beginner Health: 100/100    │
└────────────────────────────────────────────────────────────────────┘
```

---

# 72. UI polish priorities

High:
- excellent spacing;
- readable pins;
- clear wire paths;
- fast view switching;
- selected states;
- validation badge;
- smooth 3D camera;
- activity log;
- empty state.

Medium:
- animations;
- gradients;
- shadows;
- fancy loading.

Low:
- auth;
- onboarding carousel;
- marketing pages.

---

# 73. Empty state

Display:

```text
Start your first circuit

Add components manually or ask your browser agent:

"Build an ESP32 circuit where pressing a button turns on an LED."
```

Buttons:
- Start blank
- Load Push Button LED example

---

# 74. Inspector behavior

ESP32 selected:
- board name;
- pins currently in use;
- unused output-capable pins;
- lock toggle;
- focus in 3D.

LED selected:
- name;
- anode connection;
- cathode connection;
- validation issues;
- focus in 3D.

Resistor:
- resistance;
- connections;
- edit value.

Button:
- terminal connections;
- mode explanation.

---

# 75. Code sync UI

Top of Code view:

```text
Firmware bindings     ● Synced

LED_PIN      GPIO18
BUTTON_PIN   GPIO27
```

Conflict:

```text
Firmware sync conflict

LED_PIN = 34 cannot be applied.
GPIO34 is input-only on the ESP32 profile.

Circuit was not changed.
```

Actions:
- Revert code binding
- Choose compatible pin

For MVP, "Choose compatible pin" can present dropdown rather than agent action.

---

# 76. Auto-save

Persist project using IndexedDB or localStorage.

Because the project is small, localStorage is sufficient for MVP.

Key:

```text
circuitcanvas:project:v1
```

Debounce ~500 ms.

Never persist:
- Three.js scene objects;
- React Flow internals;
- Monaco editor instance;
- WebMCP objects.

Persist only `CircuitProject`.

---

# 77. Asset sources and creation instructions

## 77.1 ESP32 visual reference

Official:
https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html

Use it to understand:
- header pin order;
- physical board layout;
- connector location;
- input-only GPIOs;
- board overview.

Create original 2D/3D representations.

Do not copy a screenshot into the product.

## 77.2 LED

Create original SVG and procedural Three.js model.

No external image needed.

## 77.3 Resistor

Create original SVG and procedural Three.js model.

No external image needed.

## 77.4 Button

Create original simplified visual.

No external image needed.

## 77.5 Icons

Use Lucide:
https://lucide.dev/

## 77.6 3D external models

Avoid unless necessary.

If needed:
- prefer GLB/glTF;
- verify license;
- save local;
- attribute.

Three.js recommends glTF/GLB for runtime model delivery:
https://threejs.org/manual/en/loading-3d-models.html

---

# 78. Asset attribution

Create:

```text
public/assets/ATTRIBUTION.md
```

Even if all component geometry is original, include:

```md
# CircuitCanvas asset attribution

## Original assets

ESP32 simplified 2D illustration
- Created for CircuitCanvas.
- Based on publicly documented board layout/pin reference from Espressif.
- Reference: ...

ESP32 simplified procedural 3D model
- Created for CircuitCanvas.
- Reference: ...

LED, resistor, push button
- Original procedural/vector assets.
```

If third-party assets are ever added:
- exact author;
- source;
- license;
- modifications.

---

# 79. README content

README must explain WebMCP value, not only product features.

Include:

## What it is

> CircuitCanvas is an agent-native beginner electronics workspace where schematic, physical 3D, and firmware pin bindings share one circuit state.

## Why WebMCP matters

Without WebMCP:
- an agent would need DOM/pixel actuation;
- component IDs/pins/current topology would be ambiguous.

With WebMCP:
- site exposes exact structured operations;
- agent reads current electrical state;
- agent mutates same project as user;
- visible UI updates immediately.

## Architecture

Diagram:

```text
Browser Agent
     ↓
WebMCP tools
     ↓
Domain commands
     ↓
CircuitProject
  ↙    ↓    ↘
2D    3D    Code
       ↓
   Validation
```

## Scope disclaimer

> CircuitCanvas performs deterministic educational checks for supported beginner circuits. It is not an electrical simulation engine or professional safety-certification tool.

---

# 80. Testing strategy

Testing is not optional because synchronization bugs can ruin the demo.

---

# 81. Domain unit tests

Test every command.

### Add

Given blank:
- add LED;
- component exists;
- default properties correct;
- history contains one mutation.

### Move

Move LED:
- schematic coordinates changed;
- electrical topology unchanged.

### Remove

Remove resistor:
- resistor removed;
- attached connections removed;
- validation can now flag LED resistor issue.

### Lock

Locked ESP32 move:
- command fails;
- state unchanged.

### Undo

Undo remove resistor:
- resistor and connections return.

---

# 82. Graph tests

Create small fixtures.

Test:
- adjacency;
- path from ESP32 GPIO to LED;
- path through resistor;
- ground path;
- no false path after connection deletion.

---

# 83. Validation tests

At minimum:

```text
VALID:
GPIO18 → 220Ω → LED → GND

INVALID:
GPIO18 → LED → GND
Expected: missing resistor

INVALID:
GPIO34 → 220Ω → LED → GND
Expected: input-only output pin

INVALID:
GPIO18 → resistor → LED, no GND
Expected: missing ground

INVALID:
LED reversed
Expected: polarity issue

INVALID:
Button only connected to GPIO27
Expected: incomplete button topology
```

Each rule:
- one positive test;
- one negative test;
- one edge-case test.

---

# 84. Firmware sync tests

## Circuit → code

Circuit LED on GPIO18.

Expect:

```cpp
#define LED_PIN 18
```

## Circuit rewire

Rewire to GPIO19.

Expect:

```cpp
#define LED_PIN 19
```

User body preserved.

## Code → circuit

Edit binding to 19.

Expect:
- controller connection endpoint becomes GPIO19;
- schematic selector reflects GPIO19;
- validation valid.

## Invalid code binding

Set GPIO34.

Expect:
- canonical circuit remains GPIO18/19;
- sync conflict;
- message.

## Loop prevention

System-generated code update must not dispatch a second rebind.

Assert command count.

---

# 85. 3D synchronization tests

Unit-test pure functions:
- component → 3D transform;
- pin anchor → world coordinate;
- connection → wire endpoints.

Browser E2E:
1. load example;
2. switch 3D;
3. verify four component scene wrappers exist;
4. rewire GPIO18 → GPIO19;
5. verify wire data endpoint changed.

Do not attempt pixel-perfect WebGL screenshots unless stable.

---

# 86. WebMCP tests

Abstract tool handlers so they can be invoked without actual browser agent.

Example:

```ts
const result = await addComponentTool.execute({
  kind: "resistor",
  name: "R1",
});
```

Assert:
- command called;
- store updated;
- activity logged;
- structured output.

Test invalid:
- nonexistent component;
- locked component;
- invalid pin.

---

# 87. End-to-end demo test

Automate as much as possible with Playwright.

E2E:

1. open editor;
2. load example;
3. validate;
4. assert health;
5. code view;
6. change LED pin;
7. schematic;
8. assert edge source handle;
9. 3D;
10. assert wire binding data;
11. remove resistor;
12. assert issue;
13. restore/undo;
14. assert healthy.

This test protects the hackathon demo.

---

# 88. Performance requirements

The app must feel instant with four components.

Avoid:
- unnecessary re-render of entire Three scene;
- full state subscription in every node;
- Monaco reinitialization on tab switch;
- rebuilding GLB on every render;
- multiple validation passes per drag.

Use selectors.

Example:

```ts
const component = useProjectStore(
  s => s.project.components[id]
);
```

not:

```ts
const project = useProjectStore(s => s.project);
```

inside every tiny component where unnecessary.

---

# 89. Next.js client boundaries

React Flow, R3F, Monaco, and WebMCP are browser features.

Use client components intentionally.

Do not mark the entire app tree `"use client"` if avoidable.

Suggested:
- shell can be server;
- editor workspace is client.

Dynamic import Monaco if SSR issues occur.

---

# 90. Error handling

Never expose stack traces to agent tool results.

Utility:

```ts
export function toPublicError(error: unknown) {
  if (error instanceof DomainError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "The operation could not be completed."
  };
}
```

Console may retain full development error.

---

# 91. Accessibility

- component library supports click to add, not drag only;
- all controls are buttons;
- tooltips supplement labels but do not replace required accessible labels;
- validation uses text + icon, not color alone;
- schematic handles have labels;
- keyboard undo/redo;
- view tabs accessible;
- code sync errors readable.

---

# 92. Debug tooling

Development only.

Add panel under env:

```text
NEXT_PUBLIC_CIRCUITCANVAS_DEBUG=true
```

Show:

```text
Project schema version
Components
Connections
Selected ID
Last command
Change origin
Firmware bindings
Managed hash
Sync status
Validation issues
WebMCP available
Registered tool names
3D pin-anchor debug toggle
```

This will make Codex debugging dramatically easier.

---

# 93. Milestone 0 — repository audit

Codex tasks:

1. inspect repository;
2. run current app;
3. run existing tests;
4. note package manager;
5. note React/Next versions;
6. inspect design system;
7. do not code feature yet.

Acceptance:
- current baseline passes or existing failures documented.

---

# 94. Milestone 1 — app shell + domain

Implement:
- editor layout;
- domain types;
- component definitions;
- store;
- command framework;
- history;
- persistence skeleton.

Acceptance:
- blank project loads;
- four component definitions exist;
- unit tests add/remove/update;
- typecheck passes.

**Do not implement 3D or WebMCP yet.**

---

# 95. Milestone 2 — schematic

Implement:
- React Flow;
- four custom nodes;
- exact pin handles;
- add via library;
- move;
- connect;
- disconnect;
- selection;
- inspector;
- undo/redo.

Acceptance:
- user can manually build:
  `GPIO18 → resistor → LED → GND`;
- user can connect button to GPIO27/GND;
- connections persist after refresh;
- undo works;
- tests pass.

**Do not continue until manual schematic is stable.**

---

# 96. Milestone 3 — validation

Implement graph layer and eight rules.

Acceptance:
- valid hero circuit healthy;
- removing resistor causes exact expected issue;
- GPIO34 LED output causes exact expected issue;
- missing ground detected;
- validation UI clickable and readable;
- tests pass.

---

# 97. Milestone 4 — 3D

Implement:
- scene;
- breadboard;
- four component models;
- auto placement;
- pin anchors;
- jumper wires;
- selection synchronization;
- camera controls.

Acceptance:
- exact same project appears in 3D;
- add/remove component updates 3D immediately;
- deleting connection removes 3D wire;
- rewiring changes endpoints;
- clicking 3D LED selects schematic LED;
- debug anchors align.

Do not add physical editing if it destabilizes view.

---

# 98. Milestone 5 — code editor

Implement:
- Monaco;
- template;
- managed markers;
- binding derivation;
- circuit → code;
- code → circuit;
- conflicts;
- loop protection.

Acceptance:
- hero circuit gives LED_PIN 18 and BUTTON_PIN 27;
- change LED_PIN to 19;
- schematic changes;
- 3D wire changes;
- health remains valid;
- GPIO34 produces conflict and circuit does not mutate;
- user code outside managed block remains intact.

This is the most important synchronization milestone.

---

# 99. Milestone 6 — WebMCP core

Implement first five:

```text
get_circuit_summary
add_component
connect_components
validate_circuit
set_view
```

Acceptance:
- WebMCP available detection;
- tools registered once;
- agent/manual inspector can discover them;
- executing tool updates normal UI through domain commands;
- activity visible;
- unregister works on unmount;
- no duplicate registration.

---

# 100. Milestone 7 — WebMCP complete

Implement remaining:

```text
get_component_details
get_available_pins
remove_component
disconnect_components
update_component_property
highlight_component
undo_last_action
```

Acceptance:
- schemas strict;
- outputs compact;
- tool failures meaningful;
- read-only annotations set;
- all handlers tested.

---

# 101. Milestone 8 — polish

Implement:
- lock toggle;
- activity UX;
- example template;
- empty state;
- synchronized highlights;
- animation polish;
- README;
- attribution;
- deployment.

Acceptance:
- full demo sequence passes three times without reload.

---

# 102. Milestone 9 — demo/evals

Create:
- Playwright demo test;
- WebMCP prompt eval list;
- demo seed project;
- final video flow notes.

No new architecture.

Only bug fixes and polish.

---

# 103. Hard scope boundaries

Do **not** implement before submission:

- Arduino Uno;
- buzzer;
- servo;
- potentiometer;
- sensors;
- PCB routing;
- schematic symbol library;
- oscilloscope;
- analog simulation;
- voltage/current solver;
- real firmware compilation;
- USB flashing;
- user accounts;
- database;
- team collaboration;
- payment;
- AI chat inside app;
- mobile app;
- cloud projects.

If all required milestones are complete and tested early, optional additions may be considered, but they are not part of this implementation contract.

---

# 104. Demo script to optimize implementation around

## Prompt 1

> Build an ESP32 circuit where pressing a button turns on an LED.

Agent should use WebMCP to create/inspect/connect.

## Prompt 2

> Validate it.

Expected:
- validation tool;
- healthy project.

## Prompt 3

> Show me how it looks physically.

Expected:
- `set_view("3d")`.

## Human action

Switch Code.

Change:

```cpp
#define LED_PIN 18
```

to:

```cpp
#define LED_PIN 19
```

Show:
- code sync badge;
- schematic changed;
- 3D changed.

## Human action

Remove resistor.

Show validation.

## Prompt 4

> Something is wrong. Find it.

Expected:
- summary;
- validate;
- explanation.

## Prompt 5

> Fix it without moving the ESP32.

Expected:
- add/update/connect resistor;
- validate;
- health green.

## Prompt 6

> Explain the circuit to a beginner and show me each part.

Expected:
- get state/details;
- highlight components;
- explanation.

This workflow must drive engineering priorities.

---

# 105. Coding quality rules

Codex must:

- keep functions small;
- avoid circular dependencies;
- avoid state mutation outside store/commands;
- keep domain pure where possible;
- use exhaustive switch checks;
- use Zod at external boundaries;
- centralize component definitions;
- centralize pin capability metadata;
- centralize validation;
- centralize WebMCP registration;
- comment only where intent is non-obvious;
- not comment every obvious line;
- keep public tool outputs versionable.

---

# 106. Suggested Zod schemas

Example WebMCP connect:

```ts
export const ConnectComponentsSchema = z.object({
  sourceComponentId: z.string().min(1),
  sourcePinId: z.string().min(1),
  targetComponentId: z.string().min(1),
  targetPinId: z.string().min(1),
}).strict();
```

Component:

```ts
export const ComponentKindSchema = z.enum([
  "esp32-devkitc-v4",
  "led",
  "resistor",
  "push-button",
]);
```

Resistance:

```ts
export const ResistanceSchema = z
  .number()
  .positive()
  .max(10_000_000);
```

---

# 107. Suggested public project selector

Do not give agent entire internal project.

Implement:

```ts
export function getPublicCircuitSummary(
  project: CircuitProject
) {
  return {
    projectName: project.name,
    activeView: project.ui.activeView,
    components: ...,
    connections: ...,
    firmwareBindings: ...,
    validation: ...,
    selectedComponentId: ...,
    lockedComponentIds: ...,
  };
}
```

Tool schemas/output become an API contract.

---

# 108. Pin normalization

Agent or code may refer to:
- `18`;
- `GPIO18`;
- `IO18`.

Internally canonicalize:

```text
GPIO18
```

Helper:

```ts
normalizeESP32Pin(input: string | number): PinId
```

Only accept supported aliases.

Code parser converts `18` to `GPIO18`.

UI displays `GPIO18`.

---

# 109. Naming

Automatic component names:

```text
ESP32
LED1
R1
BUTTON1
```

If second instance accidentally allowed:
```text
LED2
R2
```

MVP UI can limit to one ESP32 but allow replacing.

---

# 110. Connection semantics

Canonical direction is not electrical current.

Connection `source` and `target` are storage/rendering endpoints.

Validation must not assume source means power direction.

Use pin types/graph paths.

For LED polarity, use endpoint definitions.

---

# 111. Activity transaction grouping

Agent may create a valid circuit via multiple tools.

Activity log shows individual calls.

History can remain per tool command.

Optional later:
- transaction grouping.

Do not delay MVP for transactions.

---

# 112. Validation auto-fix architecture

Do not expose a generic `fix_issue` tool initially.

Instead:
- validation returns suggested fix metadata;
- agent uses normal primitive tools.

Why:
- demonstrates WebMCP reasoning;
- avoids opaque magic;
- makes activity log impressive.

Example:

```text
validate_circuit
→ missing resistor

add_component
→ resistor

update_component_property
→ 220

connect_components
→ GPIO18 to resistor

connect_components
→ resistor to LED

validate_circuit
```

---

# 113. Tool output size

Keep outputs concise.

`get_circuit_summary`:
- no SVG;
- no 3D vertices;
- no entire firmware body unless specifically needed;
- firmware bindings only.

If later needed, create separate code tool. Not for MVP.

---

# 114. Browser security

WebMCP tools must:
- not execute arbitrary strings;
- not evaluate code;
- not call shell;
- not access local files;
- not make destructive external requests;
- not expose environment variables;
- not include tokens in outputs.

CircuitCanvas is local state only.

---

# 115. WebMCP origin requirements

Current Chrome docs note WebMCP is gated by origin isolation/permissions policy.

Deployment should:
- use HTTPS;
- avoid disabling origin isolation;
- avoid `document.domain`;
- test production origin with WebMCP;
- keep app top-level rather than unnecessary cross-origin iframe.

If deployment headers interfere, follow current official Chrome docs rather than guessing.

---

# 116. UI indicator for agent capability

Header:

```text
Agent tools
● Ready
```

Tooltip:
> This page exposes structured WebMCP tools to compatible browser agents.

When unsupported:
> Your browser does not currently expose WebMCP. Manual editing still works.

This makes implementation understandable to judges.

---

# 117. 3D fallback

If WebGL fails:
- show non-blocking message;
- schematic and code continue to work.

Do not let a 3D failure crash the entire editor.

---

# 118. Monaco fallback

If Monaco lazy loading fails:
- display plain textarea with code;
- preserve project functionality.

This fallback is optional if time is tight but desirable.

---

# 119. Development source references

These sources should be included in developer docs / README.

## WebMCP

Overview:
https://developer.chrome.com/docs/ai/webmcp

Imperative API:
https://developer.chrome.com/docs/ai/webmcp/imperative-api

Best practices:
https://developer.chrome.com/docs/ai/webmcp/best-practices

Evals:
https://developer.chrome.com/docs/ai/webmcp/evals

Security:
https://developer.chrome.com/docs/ai/webmcp/secure-tools

## React Flow

Custom nodes:
https://reactflow.dev/learn/customization/custom-nodes

Handles:
https://reactflow.dev/learn/customization/handles

## Three.js

Loading models:
https://threejs.org/manual/en/loading-3d-models.html

GLTFLoader:
https://threejs.org/docs/pages/GLTFLoader.html

## Monaco

https://www.npmjs.com/package/@monaco-editor/react

## ESP32

ESP32-DevKitC V4:
https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html

ESP32 GPIO guidance:
https://docs.espressif.com/projects/esp-faq/en/latest/software-framework/peripherals/gpio.html

---

# 120. Final acceptance checklist

The project may be declared hackathon-ready only when all are checked.

## Core

- [ ] One canonical `CircuitProject`.
- [ ] No independent React Flow authoritative state.
- [ ] No independent Three.js authoritative state.
- [ ] No independent code-binding state outside firmware domain.

## Components

- [ ] ESP32.
- [ ] LED.
- [ ] Resistor.
- [ ] Push button.

## Schematic

- [ ] Add.
- [ ] Move.
- [ ] Connect.
- [ ] Disconnect.
- [ ] Select.
- [ ] Inspect.
- [ ] Undo/redo.

## Validation

- [ ] Missing resistor.
- [ ] Input-only GPIO output misuse.
- [ ] Missing LED ground.
- [ ] LED polarity.
- [ ] Button topology.
- [ ] Direct power-ground.
- [ ] Disconnected component.
- [ ] Firmware mismatch.

## 3D

- [ ] Four components visible.
- [ ] Pin anchors calibrated.
- [ ] Jumper wires reflect canonical connections.
- [ ] Rewire updates wire endpoint.
- [ ] Selection sync.
- [ ] Component highlighting.
- [ ] Camera orbit/focus.

## Code

- [ ] Monaco loads.
- [ ] Managed bindings.
- [ ] Managed setup.
- [ ] Circuit → code.
- [ ] Code → circuit.
- [ ] GPIO34 rejection for LED output.
- [ ] Loop prevention.
- [ ] User code preserved.

## WebMCP

- [ ] `document.modelContext`.
- [ ] Tools register once.
- [ ] Tool cleanup.
- [ ] 12 tools.
- [ ] Strict schemas.
- [ ] Read-only annotations.
- [ ] Activity log.
- [ ] Human and WebMCP use same commands.
- [ ] WebMCP unavailable fallback.

## Persistence

- [ ] Reload preserves project.
- [ ] History works in session.

## Testing

- [ ] Domain tests.
- [ ] Graph tests.
- [ ] Validation tests.
- [ ] Firmware sync tests.
- [ ] WebMCP handler tests.
- [ ] End-to-end demo test.

## Presentation

- [ ] Push Button LED template.
- [ ] Empty-state agent prompt.
- [ ] Beginner Circuit Health visible.
- [ ] Agent tools status visible.
- [ ] README explains WebMCP.
- [ ] Attribution file.
- [ ] Safety/education disclaimer.

---

# 121. Final instruction to Codex

Build this as a **deeply integrated proof of one workflow**, not a broad electronics platform.

The most important technical invariant is:

```text
ONE CIRCUIT PROJECT
      │
      ├── Schematic projection
      ├── 3D physical projection
      ├── Firmware binding projection
      ├── Validation
      └── WebMCP tools
```

The most important demo invariant is:

```text
HUMAN CHANGE
    ↓
canonical state
    ↓
all views update

AGENT CHANGE
    ↓
same commands
    ↓
canonical state
    ↓
all views update
```

If an implementation choice creates separate state for schematic, 3D, code, or WebMCP, stop and redesign it.

If a proposed feature does not improve the following 3-minute story, defer it:

> The browser agent creates a real ESP32 circuit, the student sees it in schematic and 3D, code bindings remain synchronized, the student breaks the circuit, deterministic validation diagnoses it, and the agent visibly repairs the same project through WebMCP.

That is the product.

That is the hackathon submission.
