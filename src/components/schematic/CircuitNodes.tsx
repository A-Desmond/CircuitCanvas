"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { CSSProperties } from "react";
import { LockKeyhole } from "lucide-react";
import type { CircuitNodeData } from "@/domain/projections";
import type { PinDefinition } from "@/domain/types";
import { CircuitPartIcon } from "@/components/library/CircuitPartIcon";

type CircuitFlowNode = Node<CircuitNodeData>;

function pinPosition(side: PinDefinition["schematicAnchor"]["side"]): Position {
  switch (side) {
    case "left": return Position.Left;
    case "right": return Position.Right;
    case "top": return Position.Top;
    case "bottom": return Position.Bottom;
  }
}

function PinHandle({ pin }: { pin: PinDefinition }) {
  const vertical = pin.schematicAnchor.side === "left" || pin.schematicAnchor.side === "right";
  const offset = 42 + pin.schematicAnchor.order * 19;
  return (
    <div
      className={`pin-label pin-label--${pin.schematicAnchor.side}`}
      style={vertical ? { top: offset } : { left: offset }}
    >
      <span>{pin.label}</span>
      <Handle
        id={pin.id}
        type="source"
        position={pinPosition(pin.schematicAnchor.side)}
        className="pin-handle"
        aria-label={pin.label}
      />
    </div>
  );
}

function ComponentGlyph({ kind, positionPercent }: { kind: CircuitNodeData["kind"]; positionPercent?: number }) {
  if (kind === "esp32-devkitc-v4") {
    return (
      <div className="esp-glyph" aria-hidden="true">
        <span className="esp-usb" />
        <span className="esp-module">ESP</span>
      </div>
    );
  }
  if (kind === "led") return <div className="led-glyph" aria-hidden="true"><span /></div>;
  if (kind === "resistor") return <div className="resistor-glyph" aria-hidden="true"><span /></div>;
  if (kind === "push-button") return <div className="button-glyph" aria-hidden="true"><span /></div>;
  return <div className="node-part-glyph" aria-hidden="true"><CircuitPartIcon kind={kind} positionPercent={positionPercent} /></div>;
}

function propertyLabel(data: CircuitNodeData): string | undefined {
  if (data.kind === "resistor" || data.kind === "potentiometer") return `${String(data.properties.resistanceOhms)} Ω`;
  if (data.kind === "capacitor") return `${String(data.properties.capacitanceUf)} µF`;
  if (data.kind === "buzzer") return `${String(data.properties.frequencyHz)} Hz`;
  if (data.kind === "servo") return `${String(data.properties.angle)}°`;
  if (data.kind === "photoresistor") return `${String(data.properties.lightLevel)}% light`;
  if (data.kind === "diode" || data.kind === "npn-transistor") return String(data.properties.model);
  if (data.kind === "power-3v3") return "3.3 V";
  if (data.kind === "power-5v") return "5 V";
  return undefined;
}

function CircuitNode({ data, selected }: NodeProps<CircuitFlowNode>) {
  return (
    <div className={`circuit-node circuit-node--${data.kind} ${selected ? "is-selected" : ""} ${data.highlighted ? "is-highlighted" : ""} ${data.energized ? "is-energized" : ""}`} style={{ "--led-level": data.level ?? 1 } as CSSProperties}>
      <div className="node-title">
        <span>{data.name}</span>
        {data.locked && <LockKeyhole size={12} aria-label="Locked" />}
      </div>
      <ComponentGlyph kind={data.kind} positionPercent={Number(data.properties.positionPercent)} />
      {propertyLabel(data) && <div className="node-value">{propertyLabel(data)}</div>}
      {data.pins.map((pin) => <PinHandle key={pin.id} pin={pin} />)}
    </div>
  );
}

export function ESP32Node(props: NodeProps<CircuitFlowNode>) { return <CircuitNode {...props} />; }
export function LEDNode(props: NodeProps<CircuitFlowNode>) { return <CircuitNode {...props} />; }
export function ResistorNode(props: NodeProps<CircuitFlowNode>) { return <CircuitNode {...props} />; }
export function ButtonNode(props: NodeProps<CircuitFlowNode>) { return <CircuitNode {...props} />; }
export function GenericPartNode(props: NodeProps<CircuitFlowNode>) { return <CircuitNode {...props} />; }
