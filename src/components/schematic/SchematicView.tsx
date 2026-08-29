"use client";

import { useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import { selectReactFlowEdges, selectReactFlowNodes, type CircuitNodeData } from "@/domain/projections";
import { useProjectStore } from "@/store/project-store";
import { ButtonNode, ESP32Node, GenericPartNode, LEDNode, ResistorNode } from "./CircuitNodes";

const nodeTypes = {
  "esp32-devkitc-v4": ESP32Node,
  led: LEDNode,
  resistor: ResistorNode,
  "push-button": ButtonNode,
  capacitor: GenericPartNode,
  diode: GenericPartNode,
  potentiometer: GenericPartNode,
  buzzer: GenericPartNode,
  servo: GenericPartNode,
  photoresistor: GenericPartNode,
  "npn-transistor": GenericPartNode,
  "power-3v3": GenericPartNode,
  "power-5v": GenericPartNode,
  ground: GenericPartNode,
};

export function SchematicView() {
  const project = useProjectStore((state) => state.project);
  const execute = useProjectStore((state) => state.executeCommand);
  const [dragPreview, setDragPreview] = useState<{
    id: string;
    position: { x: number; y: number };
  }>();
  const projectedNodes = useMemo(() => selectReactFlowNodes(project), [project]);
  const nodes = useMemo(() => projectedNodes.map((node) =>
    node.id === dragPreview?.id
      ? {
          ...node,
          position: dragPreview.position,
          dragging: true,
          data: { ...node.data, dragging: true },
        }
      : node), [dragPreview, projectedNodes]);
  const edges = useMemo(() => selectReactFlowEdges(project), [project]);

  const onConnect = (connection: Connection) => {
    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) return;
    execute(
      {
        type: "connect-pins",
        source: { componentId: connection.source, pinId: connection.sourceHandle },
        target: { componentId: connection.target, pinId: connection.targetHandle },
      },
      { origin: "human-schematic", actor: "human", description: "Connected pins" },
    );
  };

  const onNodeDragStop = (_event: MouseEvent | TouchEvent, node: Node<CircuitNodeData>) => {
    execute(
      { type: "move-component", componentId: node.id, space: "schematic", x: node.position.x, y: node.position.y },
      { origin: "human-schematic", actor: "human", description: `Moved ${node.data.name}` },
    );
    setDragPreview(undefined);
  };

  const onEdgesDelete = (deleted: Edge[]) => {
    deleted.forEach((edge) => execute(
      { type: "disconnect-connection", connectionId: edge.id },
      { origin: "human-schematic", actor: "human", description: "Disconnected pins" },
    ));
  };

  const deleteSelectedConnection = () => {
    const connectionId = project.ui.selectedConnectionId;
    if (!connectionId) return;
    execute(
      { type: "disconnect-connection", connectionId },
      { origin: "human-schematic", actor: "human", description: "Deleted selected connection" },
    );
  };

  return (
    <div className="view-surface schematic-surface" data-testid="schematic-view">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        onConnect={onConnect}
        onNodeDragStart={(_event, node) => setDragPreview({ id: node.id, position: node.position })}
        onNodeDrag={(_event, node) => setDragPreview({ id: node.id, position: node.position })}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={(_event, node) => execute(
          { type: "select-component", componentId: node.id },
          { origin: "human-schematic", actor: "human" },
        )}
        onEdgeClick={(_event, edge) => execute(
          { type: "select-connection", connectionId: edge.id },
          { origin: "human-schematic", actor: "human", description: "Selected connection" },
        )}
        onPaneClick={() => execute(
          { type: "select-component", componentId: undefined },
          { origin: "human-schematic", actor: "human" },
        )}
        onEdgesDelete={onEdgesDelete}
        fitView
        fitViewOptions={{ padding: 0.22 }}
        minZoom={0.35}
        maxZoom={1.6}
        deleteKeyCode={["Backspace", "Delete"]}
        attributionPosition="top-right"
      >
        <Background id="minor-grid" color="#cfdeef" gap={24} size={1} variant={BackgroundVariant.Lines} />
        <Background id="major-grid" color="#abc3df" gap={120} size={1.25} variant={BackgroundVariant.Lines} />
        <Controls position="bottom-left" showInteractive={false} />
      </ReactFlow>
      <div className="canvas-project-title">
        <div><b>{project.name}</b><span>ESP32 beginner circuit workspace</span></div>
        <small>Design</small>
      </div>
      {project.ui.selectedConnectionId && (
        <div className="connection-action" role="status">
          <span>Connection selected</span>
          <button onClick={deleteSelectedConnection} aria-label="Delete selected connection">Delete line</button>
        </div>
      )}
      {project.ui.simulation.status !== "stopped" && (
        <div className={`simulation-status simulation-status--${project.ui.simulation.status}`} role="status">
          <i />{project.ui.simulation.status === "running" ? "Circuit running · outputs energized" : project.ui.simulation.message ?? "Circuit cannot run"}
        </div>
      )}
      {nodes.length === 0 && (
        <div className="canvas-empty" aria-hidden="true">
          <span>Choose a component from the library to begin.</span>
        </div>
      )}
    </div>
  );
}
