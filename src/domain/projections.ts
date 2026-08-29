import type { Edge, Node } from "@xyflow/react";
import { COMPONENT_DEFINITIONS } from "./component-definitions";
import type { CircuitProject, ComponentKind, PinDefinition } from "./types";

export interface CircuitNodeData extends Record<string, unknown> {
  kind: ComponentKind;
  name: string;
  pins: PinDefinition[];
  properties: Record<string, unknown>;
  highlighted: boolean;
  locked: boolean;
  dragging?: boolean;
  energized?: boolean;
  level?: number;
}

export function selectReactFlowNodes(project: CircuitProject): Node<CircuitNodeData>[] {
  return Object.values(project.components).map((component) => ({
    id: component.id,
    type: component.kind,
    position: { x: component.schematic.x, y: component.schematic.y },
    selected: project.ui.selectedComponentId === component.id,
    draggable: !component.locked,
    data: {
      kind: component.kind,
      name: component.name,
      pins: COMPONENT_DEFINITIONS[component.kind].pins,
      properties: component.properties,
      highlighted: project.ui.highlightedComponentIds.includes(component.id),
      locked: component.locked,
      energized: project.ui.simulation.energizedComponentIds.includes(component.id),
      level: project.ui.simulation.componentLevels[component.id],
    },
  }));
}

export function selectReactFlowEdges(project: CircuitProject): Edge[] {
  return Object.values(project.connections).map((connection) => ({
    id: connection.id,
    source: connection.source.componentId,
    sourceHandle: connection.source.pinId,
    target: connection.target.componentId,
    targetHandle: connection.target.pinId,
    type: "smoothstep",
    animated: project.ui.selectedConnectionId === connection.id || project.ui.simulation.status === "running",
    style: { stroke: `var(--wire-${connection.wireStyle.semanticColor})`, strokeWidth: 2.4 },
    data: { role: connection.role },
  }));
}
