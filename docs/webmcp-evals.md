# CircuitCanvas WebMCP evals

Run these against a fresh blank project and the Push Button LED example. Confirm both the tool sequence and the visible UI result.

## Direct prompts

| Prompt | Expected tools | Expected result |
| --- | --- | --- |
| Add an LED. | `add_component` | LED appears in the canonical project and schematic. |
| Add a 220 ohm resistor. | `add_component`, optionally `update_component_property` | A resistor with 220 Ω appears. |
| Connect GPIO18 to the resistor. | `get_circuit_summary` or details, then `connect_components` | Exact GPIO18 and resistor terminal are connected. |
| Validate the circuit. | `validate_circuit` | Health and deterministic issues are returned and shown. |
| Show the circuit in 3D. | `set_view` | 3D becomes the visible view. |
| Show me the code. | `set_view` | Code becomes the visible view. |
| Undo the last change. | `undo_last_action` | The last project mutation is restored in every view. |

## Contextual prompts

### Diagnose an unsafe LED pattern

Prompt:

> My LED is not safe. Check the circuit.

Expected:

```text
get_circuit_summary
validate_circuit
```

The response should explain deterministic findings without claiming professional certification.

### Locate a physical component

Prompt:

> Show me where the resistor is physically.

Expected:

```text
get_circuit_summary or get_component_details
set_view("3d")
highlight_component(resistorId)
```

### Choose a compatible LED pin

Prompt:

> Use a different output-capable GPIO for the LED.

Expected:

```text
get_circuit_summary
get_available_pins(capability="digital-output", excludeUsed=true)
disconnect_components / connect_components as needed
validate_circuit
```

The agent must not choose GPIO34 or GPIO35 for LED output.

### Repair a missing resistor

Prompt:

> Fix the missing resistor without moving the ESP32.

Expected:

```text
get_circuit_summary
validate_circuit
add_component(kind="resistor") if needed
update_component_property(resistanceOhms=220) if needed
connect_components for both series endpoints
validate_circuit
```

The ESP32 schematic position must remain unchanged. Primitive tools should be used instead of an opaque auto-fix.

### Explain the hero circuit

Prompt:

> Explain the circuit to a beginner and show me each part.

Expected:

```text
get_circuit_summary
get_component_details as needed
highlight_component for ESP32, button, resistor, and LED
```

The explanation should cover GPIO27 with `INPUT_PULLUP`, the LED series resistor, LED polarity, and the shared ground path.

## Pass criteria

- All calls appear in Agent Activity with success/failure state.
- Mutations use exact IDs and pins obtained from read tools.
- Schematic, 3D, firmware, validation, and inspector agree after every mutation.
- Locked component movement/removal is respected.
- Tool errors are compact and do not contain stack traces.
- Unsupported WebMCP browsers retain full manual editing behavior.
