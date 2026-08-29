# CircuitCanvas MVP Implementation TODO

Source: [`CircuitCanvas_Codex_Hackathon_MVP_Implementation.md`](./CircuitCanvas_Codex_Hackathon_MVP_Implementation.md)

Status: Local MVP implemented and verified; post-MVP component catalog expanded; external WebMCP browser validation and deployment remain  
Scope: Hackathon MVP plus the requested beginner component expansion  
Primary demo: one canonical circuit synchronized across schematic, 3D, firmware, validation, and WebMCP

The source specification's four-part submission boundary was satisfied before this optional catalog expansion. The original milestone audit remains below for traceability.

## Implementation progress

- [x] Milestone 0 — Next.js/npm scaffold and passing baseline.
- [x] Milestone 1 — Canonical domain, commands, history, persistence, and shell.
- [x] Milestone 2 — Exact-pin schematic editor, component library, inspector, and undo/redo.
- [x] Milestone 3 — Pure graph layer, eight validation checks, health UI, and tests.
- [x] Milestone 4 — Procedural 3D models, anchors, topology-derived wires, and selection sync.
- [x] Milestone 5 — Managed Monaco firmware with two-way GPIO synchronization and conflict handling.
- [x] Milestones 6–7 — All 12 WebMCP tools, strict handlers, cleanup, fallbacks, and visible activity.
- [x] Milestone 8 — Example/empty states, accessibility baseline, diagnostics, README, and attribution.
- [x] Milestone 9 — Unit/integration and Playwright hero-flow coverage.
- [x] Post-MVP — Add 3.3V/5V/GND references, capacitor, diode, potentiometer, buzzer, servo, photoresistor, and NPN transistor.
- [x] Post-MVP — Add exact pins, original library illustrations, schematic nodes, 3D representations, editable values, and WebMCP discovery for the expanded catalog.
- [ ] Validate tool discovery/calls in the final Chrome WebMCP build or origin-trial environment.
- [ ] Choose a production host, deploy over HTTPS, and run the final three-pass rehearsal there.

The detailed checkboxes below remain the implementation audit trail. External-browser and deployment checks cannot be completed from the local repository alone.

## Non-negotiable implementation rules

- [ ] Keep exactly one authoritative `CircuitProject` domain model.
- [ ] Treat React Flow nodes/edges, Three.js objects, Monaco models, and WebMCP state as projections only.
- [ ] Route every human and agent mutation through the same typed domain command layer.
- [ ] Store circuit-changing synchronization as one undoable history transaction.
- [ ] Keep validation deterministic; do not use an LLM for electrical checks.
- [ ] Preserve code outside CircuitCanvas-managed firmware regions.
- [x] Keep the original four-part scope until the full demo is stable, then expand the catalog without changing the canonical architecture.
- [ ] Run typecheck, lint, automated tests, and milestone-specific manual checks before moving on.
- [ ] Record milestone completion using the reporting template at the end of this file.

## Repository baseline

- [x] Read the complete implementation specification.
- [x] Inspect the current repository contents.
- [x] Confirm that no existing application scaffold or package manifest is present.
- [x] Confirm that no Git worktree metadata is available from this directory.
- [x] Choose and record the package manager before scaffolding (npm).
- [ ] Initialize Git if this directory is intended to be a standalone repository.
- [ ] Record Node.js and package-manager versions in the README or `.nvmrc`/equivalent.
- [ ] Establish the initial baseline after scaffolding: dev server, typecheck, lint, unit test, and production build.

## Implementation order

Do the milestones in order. Do not begin a major milestone while the previous milestone's acceptance gate is failing.

## Milestone 0 — Scaffold and baseline

### Setup

- [ ] Scaffold a current stable Next.js App Router application with React, TypeScript, and Tailwind CSS.
- [ ] Keep the editor workspace in a deliberate client boundary; avoid making the entire app client-rendered.
- [ ] Add scripts for `dev`, `build`, `lint`, `typecheck`, unit tests, and E2E tests.
- [ ] Configure Vitest, Testing Library, and Playwright.
- [ ] Establish path aliases and consistent formatting/linting rules.
- [ ] Create the source/test directory structure, adapting the specification where useful.
- [ ] Add a minimal README with setup and development commands.
- [ ] Add `.env.example` with `NEXT_PUBLIC_CIRCUITCANVAS_DEBUG` documented.

### Dependencies

- [ ] Add Zustand and Zod.
- [ ] Add `@xyflow/react`.
- [ ] Add `three`, `@react-three/fiber`, and `@react-three/drei`.
- [ ] Add `@monaco-editor/react` and any compatible Monaco dependency required by the build.
- [ ] Add `lucide-react`.
- [ ] Add compatible WebMCP TypeScript typings, isolating browser API compatibility in `src/webmcp`.
- [ ] Verify current framework/library APIs against their official documentation before implementing integrations.

### Acceptance gate

- [ ] Development server opens without errors.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Unit-test runner passes a smoke test.
- [ ] Production build succeeds.
- [ ] Existing/baseline failures, if any, are documented.

## Milestone 1 — App shell and canonical domain

### Domain model and definitions

- [ ] Define IDs, endpoints, component kinds, pin capabilities, component definitions, component instances, connections, firmware state, validation state, UI state, and `CircuitProject`.
- [ ] Set `schemaVersion: 1` and centralize project creation/defaults.
- [ ] Define the ESP32-DevKitC V4 beginner pin subset.
- [ ] Mark GPIO34 and GPIO35 as input-only through centralized pin metadata.
- [ ] Exclude ESP32 flash pins GPIO6–GPIO11 from beginner mode.
- [ ] Define LED pins (`ANODE`, `CATHODE`) and default properties.
- [ ] Define resistor pins (`A`, `B`), 220 Ω default, and allowed inspector presets.
- [ ] Define the simplified two-terminal normally-open button.
- [ ] Implement ESP32 pin normalization (`18`, `GPIO18`, `IO18` → `GPIO18`) for supported pins.
- [ ] Implement deterministic component naming (`ESP32`, `LED1`, `R1`, `BUTTON1`).
- [ ] Add exhaustive-switch and typed-result utilities.

### Commands, store, and history

- [ ] Define typed `CommandResult`, error codes, change origins, and command metadata.
- [ ] Implement the shared command executor.
- [ ] Implement `addComponent`.
- [ ] Implement `removeComponent`, including attached-connection cleanup.
- [ ] Implement `moveComponent` for schematic and physical positions.
- [ ] Implement `connectPins` with structural validation and exact-duplicate prevention.
- [ ] Implement `disconnectConnection`.
- [ ] Implement component-specific `updateComponentProperty` validation.
- [ ] Implement `rebindControllerPin`.
- [ ] Implement selection, highlighting, active-view, lock, and unlock commands/actions.
- [ ] Implement snapshot history capped at 100 entries.
- [ ] Keep selection-only UI changes out of history.
- [ ] Implement undo/redo with future-stack invalidation after new edits.
- [ ] Ensure commands update timestamps and preserve immutable state behavior.
- [ ] Reserve synchronization and activity hooks in the command pipeline without creating alternate stores.

### Persistence and shell

- [ ] Create blank initial project state with no electronic components.
- [ ] Implement versioned localStorage persistence at `circuitcanvas:project:v1` with ~500 ms debounce.
- [ ] Add persistence migration/error fallback skeleton.
- [ ] Persist only `CircuitProject`; never persist library/editor/runtime objects.
- [ ] Build the desktop editor shell: header, view tabs, library, main view, inspector, activity area, and status bar.
- [ ] Add header controls for undo, redo, validate, and agent-tool status.
- [ ] Add the educational safety disclaimer.

### Tests

- [ ] Test project defaults and all four component definitions.
- [ ] Test add/remove/move/update/connect/disconnect commands.
- [ ] Test duplicate connections and missing component/pin errors.
- [ ] Test lock behavior and unchanged state on command failure.
- [ ] Test undo/redo and history grouping expectations.
- [ ] Test persistence serialization/hydration and invalid saved-data fallback.

### Acceptance gate

- [ ] Blank project loads in the editor shell.
- [ ] All four centralized component definitions are available.
- [ ] Domain tests pass.
- [ ] Persistence round-trip works.
- [ ] Typecheck, lint, tests, and build pass.

## Milestone 2 — Schematic editor

### React Flow projection

- [ ] Implement pure selectors from `CircuitProject` to React Flow nodes and edges.
- [ ] Implement `ESP32Node`, `LEDNode`, `ResistorNode`, and `ButtonNode` using original React/SVG visuals.
- [ ] Implement shared `NodeShell` and labeled `PinHandle` components.
- [ ] Give every electrical pin an exact unique handle ID.
- [ ] Use loose/bidirectional connection UX while retaining exact endpoint IDs.
- [ ] Classify wire roles centrally and use semantic CSS variables for signal, ground, power, neutral, and warning colors.
- [ ] Do not reject electrically incorrect but structurally valid wiring; allow validation to explain it.

### Editing behavior

- [ ] Add components from the library by click, with deterministic default schematic and physical positions.
- [ ] Dispatch one move command on drag stop rather than one history item per frame.
- [ ] Connect pins through `connectPins`.
- [ ] Delete edges through `disconnectConnection`.
- [ ] Synchronize selection with the canonical UI state.
- [ ] Build component/pin inspector details and resistor value editing.
- [ ] Add component lock toggle and prevent locked movement/removal according to the MVP lock policy.
- [ ] Wire undo/redo buttons and keyboard shortcuts.
- [ ] Persist schematic changes across reloads.
- [ ] Add a clean empty state with “Start blank” and “Load Push Button LED example”.

### Tests and manual checks

- [ ] Test React Flow projection selectors without making React Flow authoritative.
- [ ] Test exact component/pin endpoint mapping.
- [ ] Test node movement, selection, edge creation, edge deletion, and inspector editing.
- [ ] Manually build `GPIO18 → resistor → LED anode` and `LED cathode → GND`.
- [ ] Manually connect the button between GPIO27 and GND.
- [ ] Reload and confirm topology/positions persist.
- [ ] Undo and redo add/remove/connect/move operations.

### Acceptance gate

- [ ] The complete hero circuit can be built manually and remains stable after refresh.
- [ ] Inspector and synchronized selection work.
- [ ] Undo/redo works for circuit mutations.
- [ ] Typecheck, lint, tests, and build pass.

## Milestone 3 — Graph utilities and deterministic validation

### Graph layer

- [ ] Implement endpoint keys and adjacency construction independent of React Flow.
- [ ] Implement connected endpoint/connection queries.
- [ ] Implement `hasPath`, `findPaths`, `hasGroundPath`, and controller-pin discovery.
- [ ] Implement path component-kind checks and series-path discovery.
- [ ] Add small reusable graph fixtures.

### Validation engine

- [ ] Implement validation report generation and the 0–100 Beginner Circuit Health score.
- [ ] Implement missing LED series resistor rule.
- [ ] Implement output-on-input-only GPIO rule using pin metadata.
- [ ] Implement missing LED ground-path rule.
- [ ] Implement deterministic LED polarity rule for supported topology.
- [ ] Implement incomplete button topology rule.
- [ ] Implement direct 3V3-to-GND connection rule.
- [ ] Implement disconnected-component rule.
- [ ] Implement firmware mismatch rule.
- [ ] Include relevant component/connection IDs and suggested-fix metadata in issues.
- [ ] Run validation after electrical mutations, accepted code rebinds, WebMCP edit sequences, undo/redo, and explicit Validate actions.
- [ ] Avoid validation during drag frames; debounce automatic runs only if needed.

### Validation UI

- [ ] Build health badge/panel and readable issue rows.
- [ ] Use severity text/icons as well as color.
- [ ] Make issues select/highlight their related components.
- [ ] Display the educational, non-certification disclaimer.

### Tests

- [ ] Test adjacency, path traversal, ground paths, series paths, and deleted-edge behavior.
- [ ] Test valid `GPIO18 → 220 Ω → LED → GND` topology.
- [ ] Test missing resistor.
- [ ] Test GPIO34/GPIO35 output misuse.
- [ ] Test missing ground.
- [ ] Test reversed LED polarity.
- [ ] Test incomplete button topology.
- [ ] Test direct power-to-ground.
- [ ] Test disconnected components and firmware mismatch.
- [ ] Give each validation rule a positive, negative, and edge-case test.

### Acceptance gate

- [ ] Valid hero circuit is healthy.
- [ ] Removing the resistor produces the exact intended high-severity issue.
- [ ] GPIO34 as LED output produces the intended input-only issue.
- [ ] Missing ground and reversed polarity are detected.
- [ ] Validation UI is accessible and actionable.
- [ ] Typecheck, lint, tests, and build pass.

## Milestone 4 — Synchronized 3D physical view

### Scene and models

- [ ] Document the physical coordinate system (`X` left/right, `Y` height, `Z` front/back) and world scale.
- [ ] Build a guarded React Three Fiber scene with lighting, neutral work surface, camera, and orbit controls.
- [ ] Build a procedural breadboard using instancing where helpful.
- [ ] Build original procedural ESP32, LED, resistor, and push-button models.
- [ ] Keep the two-terminal button abstraction visually understandable.
- [ ] Use deterministic fixed-zone physical placement; do not build a general auto-layout engine.
- [ ] Add a non-blocking WebGL failure fallback.

### Anchors, wires, and interaction

- [ ] Define/calibrate a local 3D anchor for every logical pin.
- [ ] Implement pure component-transform and local-anchor-to-world-coordinate functions.
- [ ] Add development-only pin-anchor spheres/labels and selected-pin highlighting.
- [ ] Render one procedural jumper wire for every canonical connection.
- [ ] Derive wire endpoints and colors from canonical endpoints/roles.
- [ ] Update/remove wires immediately when connections change.
- [ ] Dispatch 3D component selection into canonical UI state.
- [ ] Highlight/focus selected and agent-highlighted components.
- [ ] Synchronize 2D and 3D selection in both directions.

### Tests and manual checks

- [ ] Unit-test transforms, pin-anchor world coordinates, and wire endpoint derivation.
- [ ] E2E-check all four scene wrappers in the example project.
- [ ] Rewire GPIO18 to GPIO19 and verify wire endpoint data changes.
- [ ] Inspect debug anchors from multiple camera angles.
- [ ] Confirm add/remove/connect/disconnect updates the scene without reload.
- [ ] Confirm 3D selection highlights the matching schematic node.

### Acceptance gate

- [ ] The exact canonical project appears in 3D.
- [ ] All pin anchors align with their procedural models.
- [ ] Wires reflect topology changes immediately.
- [ ] Selection/highlighting and camera controls work.
- [ ] Typecheck, lint, tests, and build pass.

## Milestone 5 — Firmware editor and two-way synchronization

### Editor and managed regions

- [ ] Load Monaco client-side without destabilizing SSR; provide a textarea fallback if practical.
- [ ] Create the ESP32 Arduino starter template.
- [ ] Define managed bindings and setup markers.
- [ ] Implement managed-region discovery, replacement, rendering, and hashing.
- [ ] Preserve user code outside managed regions byte-for-byte where possible.
- [ ] Show binding chips, sync badge, managed-region help, and conflict banner.

### Circuit → code

- [ ] Derive LED binding by tracing LED anode through the resistor to an output-capable ESP32 GPIO.
- [ ] Derive button binding from GPIO/button/GND topology and use `INPUT_PULLUP`.
- [ ] Render `LED_PIN`, `BUTTON_PIN`, and their `pinMode` calls.
- [ ] Replace only managed regions after binding-affecting circuit commands.

### Code → circuit

- [ ] Debounce managed binding parsing by roughly 300–500 ms.
- [ ] Parse only exact integer `LED_PIN` and `BUTTON_PIN` defines inside the managed block.
- [ ] Normalize parsed GPIO numbers to canonical pin IDs.
- [ ] Validate pin existence, capabilities, input-only metadata, and lock conflicts before mutation.
- [ ] Rebind only the ESP32-side endpoint while preserving the resistor, LED, and connection ID where possible.
- [ ] Keep invalid edits from changing canonical topology.
- [ ] Show a useful conflict for GPIO34/GPIO35 LED bindings with compatible alternatives.
- [ ] Add “Revert code binding” and “Choose compatible pin” actions.

### Loop prevention and transaction integrity

- [ ] Track generated revision and managed-region hash.
- [ ] Ignore Monaco changes that match the last system-generated hash.
- [ ] Group code edit, circuit rebind, regenerated managed code, validation, and projected view updates into one history item.

### Tests and manual checks

- [ ] Test circuit GPIO18 produces `#define LED_PIN 18`.
- [ ] Test circuit rewire to GPIO19 updates only managed code and preserves user code.
- [ ] Test code edit from 18 to 19 updates the canonical controller endpoint.
- [ ] Test GPIO34 conflict leaves topology unchanged.
- [ ] Test unsupported expressions produce a conflict without mutation.
- [ ] Test loop prevention by asserting no second rebind command is dispatched.
- [ ] Test one-step undo of the complete synchronization transaction.
- [ ] Manually verify schematic and 3D update after a code rebind.

### Acceptance gate

- [ ] Hero circuit displays LED_PIN 18 and BUTTON_PIN 27.
- [ ] Editing LED_PIN to 19 updates canonical topology, schematic, 3D, and validation.
- [ ] GPIO34 is rejected clearly without circuit mutation.
- [ ] User code outside managed blocks is preserved.
- [ ] No synchronization loop occurs.
- [ ] Typecheck, lint, tests, and build pass.

## Milestone 6 — WebMCP core

### Infrastructure

- [ ] Verify current official WebMCP API, typings, annotations, and local-testing requirements before coding.
- [ ] Isolate all WebMCP browser access under `src/webmcp`.
- [ ] Detect `document.modelContext` safely and keep the app functional when unavailable.
- [ ] Register tools once after the store is ready.
- [ ] Use `AbortController` cleanup and stable dependencies to prevent duplicate registration.
- [ ] Add header Ready/Unavailable status with an explanatory tooltip.
- [ ] Define compact, versionable public outputs rather than exposing the full internal project.
- [ ] Use Zod and strict JSON Schema with `additionalProperties: false` at every tool boundary.
- [ ] Convert internal errors into safe, compact public errors.

### First five tools

- [ ] Implement `get_circuit_summary` as read-only.
- [ ] Implement `add_component` through the shared add command.
- [ ] Implement `connect_components` with explicit component and pin IDs.
- [ ] Implement `validate_circuit`.
- [ ] Implement `set_view` through canonical UI state.

### Agent activity

- [ ] Implement visible running/success/failed activity entries.
- [ ] Record tool name, timestamp, compact summary, and related component IDs.
- [ ] Ensure failures are visible without leaking stack traces.

### Tests and manual checks

- [ ] Test tool handlers independently of a real browser agent.
- [ ] Test strict input rejection and compact outputs.
- [ ] Test that mutation handlers dispatch shared domain commands.
- [ ] Test registration/cleanup and no duplicate tools.
- [ ] Enable WebMCP local testing in a compatible Chrome environment and inspect tool discovery.
- [ ] Confirm each tool updates the normal UI immediately.

### Acceptance gate

- [ ] All five tools are discoverable and reliable in a compatible environment.
- [ ] Tools update the same canonical state used by human actions.
- [ ] Activity is visible for every call.
- [ ] Unsupported browsers retain full manual functionality.
- [ ] Typecheck, lint, tests, and build pass.

## Milestone 7 — Complete WebMCP tool set

- [x] Post-MVP human parity — Extend the original 12-tool contract with move, select, connection selection, lock, firmware, fixture loading, and export operations (19 tools total).

- [ ] Implement read-only `get_component_details`.
- [ ] Implement read-only `get_available_pins`, including used-pin and input-only exclusions.
- [ ] Implement `remove_component` with lock errors.
- [ ] Implement `disconnect_components` by exact connection ID.
- [ ] Implement `update_component_property` with component-specific validation.
- [ ] Implement clamped-duration `highlight_component` across schematic, 3D, and inspector.
- [ ] Implement `undo_last_action` with a compact result summary.
- [ ] Set correct read-only annotations on all read tools.
- [ ] Verify all 12 required tools have verb-based descriptions, strict schemas, one logical operation, compact output, lock handling, and activity logging.
- [ ] Test nonexistent IDs, invalid pins, duplicate connections, locked components, invalid property values, highlight duration bounds, and empty undo history.

### Acceptance gate

- [ ] All 12 required tools pass handler tests and manual discovery/call checks.
- [ ] Tool errors are meaningful and safe.
- [ ] Human edits and agent edits remain behaviorally consistent.
- [ ] Typecheck, lint, tests, and build pass.

## Milestone 8 — Product polish and resilience

### UX

- [ ] Add the one-click “Push Button LED” example with GPIO18, GPIO27, GND, 220 Ω resistor, and synchronized firmware.
- [ ] Complete component-specific inspector content.
- [ ] Keep the agent activity panel visible in the demo layout.
- [ ] Polish spacing, pin readability, wire paths, view switching, selected states, validation badges, and 3D camera behavior.
- [ ] Add synchronized highlight timing/cleanup.
- [ ] Add responsive minimum behavior while keeping the MVP desktop-first.
- [ ] Add accessible labels, keyboard navigation, focus states, and non-color validation indicators.
- [ ] Verify click-to-add works without drag-and-drop.

### Debugging and fallbacks

- [ ] Add development-only debug panel behind `NEXT_PUBLIC_CIRCUITCANVAS_DEBUG=true`.
- [ ] Show schema version, canonical components/connections, selected ID, last command/origin, firmware bindings/hash/status, validation issues, WebMCP status/tools, and pin-anchor toggle.
- [ ] Add an error boundary/non-blocking fallback around 3D.
- [ ] Confirm Monaco failure does not destroy project state.
- [ ] Validate saved project data before hydration and recover safely from corrupt/incompatible state.

### Documentation and assets

- [ ] Write README sections for product purpose, setup, scripts, architecture, WebMCP value, testing, limitations, and educational disclaimer.
- [ ] Add the canonical architecture diagram to README.
- [ ] Document Chrome WebMCP testing and tool-inspection steps.
- [ ] Create `public/assets/ATTRIBUTION.md` for original procedural/vector assets and reference sources.
- [ ] Do not ship copied product photos, hotlinked images, or unlicensed external models.
- [ ] If any GLB is added, verify redistribution/license, optimize it, store it locally, and add exact attribution.
- [ ] Add official ESP32, WebMCP, React Flow, Three.js, and Monaco development references.

### Acceptance gate

- [ ] Empty state and example template both work.
- [ ] Core UI is accessible and presentation-ready.
- [ ] Debug tooling is absent/hidden in production by default.
- [ ] README and attribution are complete.
- [ ] Full demo sequence passes three consecutive times without reload.

## Milestone 9 — E2E, evals, deployment, and demo readiness

### Automated demo protection

- [ ] Add Playwright flow: open editor → load example → validate healthy → edit LED pin → verify schematic edge → verify 3D endpoint → remove resistor → verify issue → undo → verify healthy.
- [ ] Prefer stable DOM/data assertions over pixel-perfect WebGL screenshots.
- [ ] Run domain, graph, validation, firmware, WebMCP, and E2E suites together in CI or a single verification command.
- [ ] Add a production-build smoke test.

### WebMCP evals

- [ ] Create direct and contextual prompt eval fixtures from the specification.
- [ ] Record expected tool sequences for diagnosis, physical viewing, pin changes, explanation, and resistor repair.
- [ ] Verify the agent reads state/details before ambiguous mutations.
- [ ] Verify “Fix it without moving the ESP32” respects the movement lock.
- [ ] Verify explain flow highlights ESP32, button, resistor, and LED.

### Deployment and presentation

- [ ] Choose a deployment target with HTTPS and compatible WebMCP origin/security requirements.
- [ ] Verify production headers, top-level browsing context, and WebMCP availability on the deployed origin.
- [ ] Avoid `document.domain`, cross-origin iframe dependence, or unsafe tool behavior.
- [ ] Create/reset a deterministic demo seed project.
- [ ] Write final video/live-demo flow notes around the six specified prompts and human code/resistor edits.
- [ ] Rehearse failure recovery: unsupported WebMCP, WebGL failure, invalid GPIO edit, accidental extra edit, and undo.
- [ ] Run the final acceptance checklist below on the production build.

## Final acceptance checklist

### Core synchronization

- [ ] One canonical `CircuitProject` owns all project state.
- [ ] Schematic, 3D, code, validation, and WebMCP are projections/consumers of it.
- [ ] Human and agent mutations use the same commands.
- [ ] Undo/redo restores complete synchronized transactions.
- [ ] Reload preserves the project.

### Hero workflow

- [ ] Start blank and add ESP32, button, resistor, and LED.
- [ ] Wire valid push-button-controlled LED topology.
- [ ] See identical topology in schematic and 3D.
- [ ] See LED_PIN 18 and BUTTON_PIN 27 in firmware.
- [ ] Change LED_PIN to 19 and see schematic/3D/validation update.
- [ ] Remove resistor and receive the missing-resistor issue.
- [ ] Inspect and validate through WebMCP.
- [ ] Repair the resistor through WebMCP and return to healthy state.
- [ ] Explain/highlight every component through WebMCP.
- [ ] Undo the last agent mutation.

### Quality and presentation

- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Unit/integration tests pass.
- [ ] Playwright demo test passes.
- [ ] Production build passes.
- [ ] Full demo passes three consecutive times.
- [ ] Beginner Circuit Health and agent readiness remain visible.
- [ ] Educational safety disclaimer is visible.
- [ ] README and attribution are complete.

## Deferred until after the hackathon MVP

Do not implement these unless every required milestone is complete and stable:

- Arduino Uno or additional electronic components.
- Generic schematic-symbol library or general-purpose auto-layout.
- SPICE/analog simulation, current or voltage solving, oscilloscope features.
- PCB routing or professional CAD features.
- Firmware compilation, USB flashing, or arbitrary C++ parsing.
- Embedded AI chat.
- Authentication, database, cloud projects, billing, or team collaboration.
- Mobile app.

## Decisions to confirm before implementation

These do not block creation of the plan, but should be resolved during Milestone 0:

- [ ] Package manager: use npm by default, or confirm pnpm/yarn/bun.
- [ ] Repository ownership: confirm whether Git should be initialized in this directory.
- [ ] Deployment target: choose a host that supports HTTPS and required WebMCP headers/behavior.
- [ ] Visual direction: use the spec's clean desktop editor as the default unless a brand/design system is provided.
- [ ] Browser target: identify the Chrome build/environment used for the final WebMCP demo.

## Milestone completion report template

```text
Milestone:
Implemented:
Files changed:
Tests run:
Manual checks:
Known limitations:
Next milestone:
```
