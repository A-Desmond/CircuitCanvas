# CircuitCanvas

**Build circuits with an AI agent that understands the board—not just the pixels.**

CircuitCanvas is an agent-native electronics workspace for learning and prototyping ESP32 circuits. A person can draw a circuit, inspect it in 3D, edit Arduino-style firmware, validate common mistakes, and run a visual simulation. Through WebMCP, a browser agent can work inside that same project: it can identify exact components and pins, create or repair connections, update firmware, operate simulation inputs, explain problems visually, and save or export the result.

The key idea is simple: the person and the agent do not maintain separate versions of the circuit. React Flow, the 3D scene, firmware editor, validator, simulator, undo history, persistence, and WebMCP tools all read from and write to one canonical `CircuitProject`.

> Suggested GitHub About description: **Agent-native ESP32 circuit design: build, wire, validate, code, simulate, and explain circuits with people and browser agents through WebMCP.**

## Hackathon pitch

Electronics tools are visual, but a circuit is more than a picture. It has exact components, named pins, electrical paths, firmware bindings, and safety constraints. A browser agent that only clicks coordinates or reads labels can easily connect the wrong GPIO, miss a ground path, or lose track of changes between schematic, code, and 3D views.

CircuitCanvas uses WebMCP to expose the circuit's real structure and safe operations directly to the agent. This turns the browser agent into a genuine collaborator rather than a fragile UI macro. It can inspect before acting, choose pins by capability, make a change through the same command system as the user, validate the result, and point to the affected component while explaining what happened.

Together, people and agents can:

- build and rewire circuits using exact component and pin IDs;
- find output-capable ESP32 pins without guessing;
- catch missing resistors, reversed LEDs, incomplete ground paths, and invalid GPIO choices;
- keep schematic connections and managed firmware bindings synchronized;
- run firmware-aware visual simulations and inspect LED brightness or simulated input state;
- adjust component properties such as resistance, sensor level, servo angle, and potentiometer position;
- move, select, highlight, lock, delete, undo, save, load, and export projects;
- switch between schematic, code, and physical 3D views while discussing the same underlying circuit.

CircuitCanvas includes 14 component types: ESP32 DevKitC V4, LED, resistor, push button, 3.3V, 5V, ground, capacitor, diode, potentiometer, active buzzer, micro servo, photoresistor, and NPN transistor. Every component has exact labeled pins and consistent schematic and 3D representations.

One supported teaching pattern is:

```text
ESP32 GPIO18 → 220 Ω resistor → LED anode
ESP32 GND    → LED cathode
ESP32 GPIO27 → push button → ESP32 GND
```

The button firmware uses `INPUT_PULLUP`; pressing it drives the LED. Changing `LED_PIN` from 18 to 19 inside the managed firmware block also moves the canonical connection to GPIO19, so the schematic, 3D wiring, validation report, and agent-readable state remain synchronized.

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
29 strict WebMCP tools ─────► Domain commands
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

WebMCP is a particularly strong fit for CircuitCanvas because the meaning of a circuit is hidden behind its visual layout. Two wires can look almost identical while terminating on electrically different pins. DOM scraping can find labels, but it cannot reliably answer questions such as “Does this LED have a path to ground?”, “Which unused GPIO can drive an output?”, or “Which circuit connection owns this firmware symbol?”

CircuitCanvas already has a typed graph and deterministic command layer for answering those questions. WebMCP exposes that domain intelligence to browser agents as strict, task-oriented tools. The result is more reliable than coordinate-based automation and more transparent than handing the entire project to an opaque model: tool calls appear in the Agent Activity panel, mutations share human undo history, and deterministic validation checks every electrical change.

The app registers 29 tools with the current imperative `document.modelContext` API:

```text
Read and inspect                 Build and edit
get_circuit_summary             add_component
get_component_details           remove_component
get_available_pins              connect_components
get_simulation_state            disconnect_components
list_saved_projects             update_component_property
                                 move_component
Firmware and simulation         set_component_lock
update_firmware                 set_potentiometer_wiper
validate_circuit                set_project_name
run_simulation                  set_simulation_input
stop_simulation

Navigate and explain            Project lifecycle
select_component                save_project
select_connection               load_saved_project
clear_selection                 load_project
highlight_component             export_project
set_view                        undo_last_action
```

Every tool has a strict JSON Schema, Zod-validated runtime input, compact structured output, read-only annotations where appropriate, shared domain-command execution, and a visible activity entry. The editor remains fully functional when WebMCP is unavailable, making WebMCP an enhancement to the human experience rather than a dependency for basic editing.

### Testing instructions

No credentials are required.

1. Open the project URL in a WebMCP-compatible Chrome browser with the WebMCP testing feature enabled, or open it in the ChatGPT app.
2. Click **Start a new project** or use the existing circuit.
3. Add components from the library and connect their labeled pins.
4. Use **Validate** and **Run** to inspect the circuit and simulation.
5. Switch between **Design**, **Code**, and **3D** views.
6. To test the agent experience, confirm the header shows **Agent tools ready**, then ask the browser agent or ChatGPT to inspect, modify, validate, simulate, or explain the circuit.
7. Run the prompts in [`docs/webmcp-evals.md`](./docs/webmcp-evals.md).

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

CircuitCanvas includes a deliberately small firmware-aware visual simulator for supported Arduino-style `digitalRead` and `digitalWrite` patterns. It visualizes energized connections, LED output state, and potentiometer-controlled brightness; it is not a SPICE simulator or a substitute for professional electrical design and safety review.

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

## License

CircuitCanvas is open-source software licensed under the [MIT License](./LICENSE).
