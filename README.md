# CircuitCanvas

CircuitCanvas is an agent-native beginner electronics workspace where a schematic, a simplified physical 3D view, ESP32 Arduino-style firmware bindings, deterministic validation, and browser-agent tools all share one canonical circuit project.

The expanded catalog includes ESP32 DevKitC V4, LED, resistor, push button, 3.3V, 5V, and ground references, capacitor, diode, potentiometer, active buzzer, micro servo, photoresistor, and NPN transistor. Every part exposes exact labeled pins and appears in the schematic and 3D projections.

The hackathon MVP deliberately supports one deeply integrated workflow:

```text
ESP32 GPIO18 → 220 Ω resistor → LED anode
ESP32 GND    → LED cathode
ESP32 GPIO27 → push button → ESP32 GND
```

The button firmware uses `INPUT_PULLUP`; pressing it drives the LED. Change `LED_PIN` from 18 to 19 inside the managed firmware block and the schematic and 3D wire endpoint update through the same domain command.

## Run locally

Requirements:

- Node.js 20.9 or newer (developed with Node 22.20)
- npm 10 or newer

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful commands:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
npm run verify
```

Playwright uses port 3100 so it does not collide with the normal development server.

## Architecture

```text
Browser agent                 Human editor actions
      │                               │
      ▼                               ▼
19 strict WebMCP tools ─────► Domain commands
                                     │
                                     ▼
                            Canonical CircuitProject
                         ┌───────────┼───────────┐
                         ▼           ▼           ▼
                    Schematic    Physical 3D   Firmware
                         └───────────┼───────────┘
                                     ▼
                              Validation + history
```

`CircuitProject` is the only authoritative project state. React Flow nodes/edges, Three.js objects, Monaco's editor model, validation results, and WebMCP responses are derived from it. Human and agent mutations use the same typed command executor and undo history.

Important modules:

- `src/domain` — types, centralized component/pin definitions, pure commands, graph traversal, and UI projections.
- `src/store/project-store.ts` — command coordination, snapshot history, autosave hydration, firmware edits, and agent activity.
- `src/validation` — eight deterministic beginner-circuit checks and health scoring.
- `src/firmware` — managed-region rendering/parsing, binding derivation, hashes, and two-way synchronization.
- `src/components/schematic` — exact-pin React Flow projection.
- `src/components/physical` — procedural R3F models, calibrated local pin anchors, and connection-derived wires.
- `src/webmcp` — compact public selectors, strict input validation, tool handlers, and registration lifecycle.

## Why WebMCP matters

Without WebMCP, a browser agent would need to infer component identity, pins, topology, and editor state from pixels and DOM layout. CircuitCanvas instead exposes exact structured operations. An agent can read electrical state, choose compatible pins, mutate the same project as the user, validate its work, change the visible view, highlight parts during an explanation, and undo a mutation.

The application registers these tools with the current imperative `document.modelContext` API. The tool set mirrors human project actions, so an agent can build, inspect, rewire, move, select, lock, edit firmware, validate, switch views, load fixtures, export, and undo:

```text
get_circuit_summary       get_component_details
get_available_pins        add_component
remove_component          connect_components
disconnect_components     update_component_property
move_component            select_component
select_connection         set_component_lock
update_firmware           validate_circuit
highlight_component       set_view
load_project              export_project
undo_last_action
```

Every tool has a strict JSON Schema, validated runtime input, safe compact output, read-only annotations where appropriate, shared domain-command execution, and a visible activity entry. The editor remains fully functional when WebMCP is unavailable.

### Test WebMCP in Chrome

1. Use a Chrome build that implements the current WebMCP origin trial/testing API.
2. Enable the WebMCP testing flag documented by Chrome and relaunch.
3. Run CircuitCanvas over localhost or a compatible HTTPS origin.
4. Confirm the header says **Agent tools ready**.
5. Inspect the 19 registered tools with Chrome's supported tool inspector.
6. Run the prompts in [`docs/webmcp-evals.md`](./docs/webmcp-evals.md).

WebMCP is isolated behind feature detection and an `AbortController` registration lifecycle. The deprecated `navigator.modelContext` API is not used.

## Firmware synchronization

CircuitCanvas only owns these marked regions:

```cpp
// <circuitcanvas:bindings>
#define LED_PIN 18
#define BUTTON_PIN 27
// </circuitcanvas:bindings>
```

It also manages the matching `pinMode` block. Code outside those markers is preserved. Supported code-to-circuit parsing intentionally accepts only plain integer `LED_PIN` and `BUTTON_PIN` defines. GPIO34 and GPIO35 are rejected for LED output because the centralized ESP32 profile marks them input-only.

Generated-region hashes prevent circuit-to-code updates from triggering code-to-circuit loops. A successful binding edit, circuit rewire, generated firmware update, projected-view update, and validation pass form one undo step.

## Validation scope

The deterministic validator checks:

- missing LED series resistor;
- output connected to an input-only ESP32 GPIO;
- missing LED ground path;
- reversed LED polarity in the supported topology;
- incomplete push-button topology;
- direct power-to-ground connection;
- disconnected components;
- firmware/circuit binding mismatch.

The score is labeled **Beginner Circuit Health**, never an electrical safety score.

> CircuitCanvas checks supported beginner circuit patterns. It is not an electrical simulation engine or a substitute for professional electrical design or safety review.

## Persistence and debugging

Only the canonical project is autosaved to `circuitcanvas:project:v1` in localStorage. React Flow internals, Three.js objects, Monaco instances, and WebMCP objects are never persisted.

Copy `.env.example` to `.env.local` and set:

```text
NEXT_PUBLIC_CIRCUITCANVAS_DEBUG=true
```

This reveals project schema, IDs, last command/origin, bindings, managed hash, sync state, and validation diagnostics. The 3D view also exposes its scene component/wire endpoint data for stable browser tests.

## Tests

- Domain tests cover add/remove/lock/duplicate/rebind behavior.
- Graph tests cover adjacency, passive traversal, controller discovery, and ground paths.
- Validation tests exercise the hero topology and each major failure mode.
- Firmware tests cover both directions, GPIO34 rejection, user-code preservation, and one-step undo.
- WebMCP tests cover the exact tool set, strict schemas, compact mutation output, compatible pin discovery, and visible state changes.
- Playwright protects the hero flow across schematic, 3D, firmware pin rebinding, resistor removal, validation, and undo.

## Sources

- [WebMCP overview](https://developer.chrome.com/docs/ai/webmcp)
- [WebMCP imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [React Flow custom nodes](https://reactflow.dev/learn/customization/custom-nodes)
- [React Flow handles](https://reactflow.dev/learn/customization/handles)
- [React Three Fiber](https://r3f.docs.pmnd.rs/)
- [Monaco React wrapper](https://www.npmjs.com/package/@monaco-editor/react)
- [ESP32-DevKitC V4 guide](https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html)

Asset details are recorded in [`public/assets/ATTRIBUTION.md`](./public/assets/ATTRIBUTION.md).
