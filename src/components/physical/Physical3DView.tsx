"use client";

import { Component, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls, RoundedBox } from "@react-three/drei";
import { Color, Vector3, type Mesh } from "three";
import { COMPONENT_DEFINITIONS } from "@/domain/component-definitions";
import type { CircuitComponent, CircuitConnection, CircuitProject } from "@/domain/types";
import { useProjectStore } from "@/store/project-store";

class ThreeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("3D view failed", error, info); }
  render() {
    if (this.state.failed) return <div className="fallback-panel">3D preview is unavailable. Schematic and code editing still work.</div>;
    return this.props.children;
  }
}

function componentColor(component: CircuitComponent, project: CircuitProject): string {
  if (project.ui.highlightedComponentIds.includes(component.id)) return "#f6c85f";
  if (project.ui.selectedComponentId === component.id) return "#67e8f9";
  if (component.kind === "esp32-devkitc-v4") return "#155f55";
  if (component.kind === "led") return project.ui.simulation.energizedComponentIds.includes(component.id) ? "#ff334d" : "#ef4444";
  if (component.kind === "resistor") return "#d7b98d";
  const colors: Partial<Record<CircuitComponent["kind"], string>> = {
    "push-button": "#2b3445",
    capacitor: "#3977b9",
    diode: "#202d3d",
    potentiometer: "#2f6ead",
    buzzer: "#263548",
    servo: "#2f72ba",
    photoresistor: "#d6a93f",
    "npn-transistor": "#27364a",
    "power-3v3": "#dc2626",
    "power-5v": "#ef4444",
    ground: "#475569",
  };
  return colors[component.kind] ?? "#2b3445";
}

function ComponentModel({ component, project }: { component: CircuitComponent; project: CircuitProject }) {
  const execute = useProjectStore((state) => state.executeCommand);
  const definition = COMPONENT_DEFINITIONS[component.kind];
  const position: [number, number, number] = [component.physical.x, component.physical.y, component.physical.z];
  const color = componentColor(component, project);
  const select = (event: { stopPropagation(): void }) => {
    event.stopPropagation();
    execute({ type: "select-component", componentId: component.id }, { origin: "human-3d", actor: "human" });
  };

  if (component.kind === "esp32-devkitc-v4") {
    return (
      <group position={position} rotation-y={component.physical.rotationY} onClick={select}>
        <RoundedBox args={[2.2, 0.18, 3.25]} radius={0.08} castShadow><meshStandardMaterial color={color} roughness={0.7} /></RoundedBox>
        <mesh position={[0, 0.18, -0.55]} castShadow><boxGeometry args={[1.25, 0.18, 1.25]} /><meshStandardMaterial color="#b8c3c7" metalness={0.8} /></mesh>
        <mesh position={[0, 0.16, 1.5]} castShadow><boxGeometry args={[0.68, 0.28, 0.36]} /><meshStandardMaterial color="#b7bec8" metalness={0.7} /></mesh>
        {[-1.02, 1.02].flatMap((x) => Array.from({ length: 12 }, (_, index) => (
          <mesh key={`${x}-${index}`} position={[x, 0.15, -1.35 + index * 0.245]}>
            <cylinderGeometry args={[0.035, 0.035, 0.13, 8]} /><meshStandardMaterial color="#151a20" />
          </mesh>
        )))}
        <Html position={[0, 0.32, 0.5]} center transform distanceFactor={8}><span className="model-label">ESP32</span></Html>
      </group>
    );
  }
  if (component.kind === "led") {
    const brightness = project.ui.simulation.status === "running"
      ? Math.round((project.ui.simulation.componentLevels[component.id] ?? 0) * 100)
      : 0;
    return (
      <group position={position} onClick={select}>
        <mesh position={[0, 0.35, 0]} castShadow><sphereGeometry args={[0.28, 24, 18, 0, Math.PI * 2, 0, Math.PI / 1.55]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={project.ui.simulation.energizedComponentIds.includes(component.id) ? 0.6 + (project.ui.simulation.componentLevels[component.id] ?? 1) * 1.8 : 0.35} transparent opacity={0.45 + (project.ui.simulation.componentLevels[component.id] ?? 0) * 0.37} /></mesh>
        <mesh position={[-0.16, -0.18, 0]}><cylinderGeometry args={[0.025, 0.025, 0.55, 8]} /><meshStandardMaterial color="#bac2cc" metalness={0.8} /></mesh>
        <mesh position={[0.16, -0.12, 0]}><cylinderGeometry args={[0.025, 0.025, 0.42, 8]} /><meshStandardMaterial color="#bac2cc" metalness={0.8} /></mesh>
        <Html position={[0, 0.78, 0]} center><span className="model-label">{component.name} · {brightness}% brightness</span></Html>
      </group>
    );
  }
  if (component.kind === "resistor") {
    return (
      <group position={position} rotation-z={Math.PI / 2} onClick={select}>
        <mesh castShadow><capsuleGeometry args={[0.17, 0.62, 8, 16]} /><meshStandardMaterial color={color} /></mesh>
        {[-0.55, 0.55].map((y) => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[0.025, 0.025, 0.5, 8]} /><meshStandardMaterial color="#bac2cc" metalness={0.8} /></mesh>)}
        {[-0.2, 0, 0.2].map((y, index) => <mesh key={y} position={[0, y, 0]}><torusGeometry args={[0.175, 0.025, 8, 16]} /><meshStandardMaterial color={["#b91c1c", "#b91c1c", "#7c2d12"][index]} /></mesh>)}
        <Html position={[0.4, 0, 0]} center><span className="model-label">{String(component.properties.resistanceOhms)} Ω</span></Html>
      </group>
    );
  }
  if (component.kind === "push-button") return (
    <group position={position} onClick={select}>
      <RoundedBox args={[0.82, 0.24, 0.82]} radius={0.08} castShadow><meshStandardMaterial color={color} /></RoundedBox>
      <mesh position={[0, 0.22, 0]} castShadow><cylinderGeometry args={[0.22, 0.24, 0.18, 20]} /><meshStandardMaterial color="#e2e7ee" /></mesh>
      {[-0.38, 0.38].map((x) => <mesh key={x} position={[x, -0.2, 0]}><cylinderGeometry args={[0.025, 0.025, 0.42, 8]} /><meshStandardMaterial color="#aab6c2" metalness={0.72} /></mesh>)}
      <Html position={[0, 0.62, 0]} center><span className="model-label">{component.name}</span></Html>
    </group>
  );

  if (component.kind === "potentiometer") {
    const positionPercent = Number(component.properties.positionPercent ?? 50);
    const angle = (positionPercent / 100 - 0.5) * Math.PI * 1.35;
    return (
      <group position={position} rotation-y={component.physical.rotationY} onClick={select}>
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.48, 0.5, 0.38, 24]} />
          <meshStandardMaterial color={color} roughness={0.62} />
        </mesh>
        <mesh position={[0, 0.43, 0]} castShadow>
          <cylinderGeometry args={[0.34, 0.34, 0.16, 24]} />
          <meshStandardMaterial color="#dce6ef" roughness={0.42} />
        </mesh>
        <group position={[0, 0.53, 0]} rotation-y={angle}>
          <mesh position={[0, 0.08, 0]}><boxGeometry args={[0.045, 0.2, 0.06]} /><meshStandardMaterial color="#2f6ead" /></mesh>
          <mesh position={[0, 0.2, 0]}><sphereGeometry args={[0.055, 12, 8]} /><meshStandardMaterial color="#1d4f9d" /></mesh>
        </group>
        {definition.pins.map((pin) => (
          <mesh key={pin.id} position={[pin.physicalAnchor.x, -0.16, pin.physicalAnchor.z]}>
            <cylinderGeometry args={[0.025, 0.025, 0.42, 8]} /><meshStandardMaterial color="#aab6c2" metalness={0.72} />
          </mesh>
        ))}
        <Html position={[0, 0.82, 0]} center><span className="model-label">{component.name} · {positionPercent}%</span></Html>
      </group>
    );
  }

  const round = ["capacitor", "buzzer", "potentiometer", "photoresistor", "npn-transistor"].includes(component.kind);
  const compact = component.kind === "power-3v3" || component.kind === "power-5v" || component.kind === "ground";
  return (
    <group position={position} rotation-y={component.physical.rotationY} onClick={select}>
      {round ? (
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[compact ? 0.2 : 0.42, compact ? 0.2 : 0.46, compact ? 0.12 : 0.42, 20]} />
          <meshStandardMaterial color={color} roughness={0.62} />
        </mesh>
      ) : (
        <RoundedBox args={[compact ? 0.45 : 1.05, compact ? 0.14 : 0.38, compact ? 0.45 : 0.72]} radius={0.08} castShadow>
          <meshStandardMaterial color={color} roughness={0.66} />
        </RoundedBox>
      )}
      {definition.pins.map((pin) => (
        <mesh key={pin.id} position={[pin.physicalAnchor.x, -0.16, pin.physicalAnchor.z]}>
          <cylinderGeometry args={[0.025, 0.025, 0.42, 8]} />
          <meshStandardMaterial color="#aab6c2" metalness={0.72} />
        </mesh>
      ))}
      <Html position={[0, 0.72, 0]} center><span className="model-label">{component.name}</span></Html>
    </group>
  );
}

function anchorWorld(project: CircuitProject, componentId: string, pinId: string): Vector3 {
  const component = project.components[componentId];
  const pin = component && COMPONENT_DEFINITIONS[component.kind].pins.find((candidate) => candidate.id === pinId);
  if (!component || !pin) return new Vector3();
  const local = new Vector3(pin.physicalAnchor.x, pin.physicalAnchor.y, pin.physicalAnchor.z);
  local.applyAxisAngle(new Vector3(0, 1, 0), component.physical.rotationY);
  return local.add(new Vector3(component.physical.x, component.physical.y, component.physical.z));
}

export function connectionWirePoints(project: CircuitProject, connection: CircuitConnection): [number, number, number][] {
  const source = anchorWorld(project, connection.source.componentId, connection.source.pinId);
  const target = anchorWorld(project, connection.target.componentId, connection.target.pinId);
  const lift = Math.max(0.38, source.distanceTo(target) * 0.18);
  return [source, source.clone().add(new Vector3(0, lift, 0)), target.clone().add(new Vector3(0, lift, 0)), target]
    .map((point) => [point.x, point.y, point.z]);
}

function Wire3D({ project, connection }: { project: CircuitProject; connection: CircuitConnection }) {
  const points = useMemo(() => connectionWirePoints(project, connection), [project, connection]);
  const color = connection.role === "ground" ? "#64748b" : connection.role === "power" ? "#ef4444" : "#2563eb";
  return <>
    <Line points={points} color={new Color(color)} lineWidth={project.ui.simulation.status === "running" ? 4 : 3} />
    {project.ui.simulation.status === "running" && <FlowParticles points={points} color={color} />}
  </>;
}

function FlowParticles({ points, color }: { points: [number, number, number][]; color: string }) {
  const refs = useRef<Array<Mesh | null>>([]);
  const progress = useRef(0);
  const vectors = useMemo(() => points.map((point) => new Vector3(...point)), [points]);
  useFrame((_state, delta) => {
    progress.current = (progress.current + delta * 0.45) % 1;
    refs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const t = (progress.current + index / 3) % 1;
      const scaled = t * (vectors.length - 1);
      const segment = Math.min(vectors.length - 2, Math.floor(scaled));
      mesh.position.lerpVectors(vectors[segment], vectors[segment + 1], scaled - segment);
    });
  });
  return <>{[0, 1, 2].map((index) => <mesh key={index} ref={(mesh) => { refs.current[index] = mesh; }}>
    <sphereGeometry args={[0.055, 10, 8]} />
    <meshBasicMaterial color={color === "#64748b" ? "#b7c8dc" : "#79f2ff"} />
  </mesh>)}</>;
}

function Breadboard() {
  return (
    <group position={[0, 0, 0.15]}>
      <RoundedBox args={[7.3, 0.18, 4.8]} radius={0.18} receiveShadow><meshStandardMaterial color="#e8edf1" roughness={0.95} /></RoundedBox>
      {Array.from({ length: 13 }, (_, column) => Array.from({ length: 7 }, (_, row) => (
        <mesh key={`${column}-${row}`} position={[-3 + column * 0.5, 0.105, -1.5 + row * 0.5]} rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.035, 8]} /><meshBasicMaterial color="#9ca8b3" />
        </mesh>
      )))}
      <mesh position={[0, 0.11, -2]} rotation-x={-Math.PI / 2}><planeGeometry args={[6.6, 0.025]} /><meshBasicMaterial color="#ef4444" /></mesh>
      <mesh position={[0, 0.11, 2]} rotation-x={-Math.PI / 2}><planeGeometry args={[6.6, 0.025]} /><meshBasicMaterial color="#3b82f6" /></mesh>
    </group>
  );
}

function PinAnchors({ project }: { project: CircuitProject }) {
  return Object.values(project.components).flatMap((component) =>
    COMPONENT_DEFINITIONS[component.kind].pins.map((pin) => {
      const position = anchorWorld(project, component.id, pin.id);
      return (
        <group key={`${component.id}:${pin.id}`} position={[position.x, position.y, position.z]}>
          <mesh><sphereGeometry args={[0.065, 10, 8]} /><meshBasicMaterial color="#f6c85f" /></mesh>
          <Html position={[0, 0.13, 0]} center><span className="anchor-label">{pin.id}</span></Html>
        </group>
      );
    }),
  );
}

function PinDots({ project }: { project: CircuitProject }) {
  const connectedPins = new Set(Object.values(project.connections).flatMap((connection) => [
    `${connection.source.componentId}:${connection.source.pinId}`,
    `${connection.target.componentId}:${connection.target.pinId}`,
  ]));
  return Object.values(project.components).flatMap((component) =>
    COMPONENT_DEFINITIONS[component.kind].pins.map((pin) => {
      const position = anchorWorld(project, component.id, pin.id);
      const connected = connectedPins.has(`${component.id}:${pin.id}`);
      const showEspPinName = component.kind === "esp32-devkitc-v4" && connected;
      return (
        <group key={`dot-${component.id}:${pin.id}`} position={[position.x, position.y, position.z]}>
          <mesh>
            <sphereGeometry args={[connected ? 0.085 : 0.065, 12, 10]} />
            <meshBasicMaterial color={connected ? "#2563eb" : "#88a4c2"} />
          </mesh>
          {showEspPinName && (
            <Html position={[pin.physicalAnchor.x > 0 ? 0.3 : -0.3, 0.12, 0]} center>
              <span className="pin-label-3d">{pin.label}</span>
            </Html>
          )}
        </group>
      );
    }),
  );
}

function PhysicalScene({ project, showAnchors }: { project: CircuitProject; showAnchors: boolean }) {
  return (
    <>
      <color attach="background" args={["#eaf2ff"]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 7, 4]} intensity={2.2} castShadow />
      <Breadboard />
      {Object.values(project.components).map((component) => <ComponentModel key={component.id} component={component} project={project} />)}
      {Object.values(project.connections).map((connection) => <Wire3D key={connection.id} project={project} connection={connection} />)}
      <PinDots project={project} />
      {showAnchors && <PinAnchors project={project} />}
      <OrbitControls
        makeDefault
        target={project.ui.selectedComponentId
          ? [project.components[project.ui.selectedComponentId]?.physical.x ?? 0, 0, project.components[project.ui.selectedComponentId]?.physical.z ?? 0]
          : [0, 0, 0]}
        minDistance={5}
        maxDistance={13}
        maxPolarAngle={Math.PI / 2.05}
      />
      <gridHelper args={[14, 28, "#9eb8d8", "#d3e1f1"]} position={[0, -0.13, 0]} />
    </>
  );
}

export function Physical3DView() {
  const project = useProjectStore((state) => state.project);
  const [showAnchors, setShowAnchors] = useState(false);
  const debug = process.env.NEXT_PUBLIC_CIRCUITCANVAS_DEBUG === "true";
  const controller = Object.values(project.components).find((component) => component.kind === "esp32-devkitc-v4");
  const controllerPins = controller ? COMPONENT_DEFINITIONS[controller.kind].pins : [];
  const connectedControllerPins = new Set(Object.values(project.connections).flatMap((connection) => [connection.source, connection.target])
    .filter((endpoint) => endpoint.componentId === controller?.id).map((endpoint) => endpoint.pinId));
  return (
    <div className="view-surface physical-surface" data-testid="physical-view">
      <ThreeBoundary>
        <Canvas camera={{ position: [6.3, 6.8, 7.2], fov: 42 }} shadows dpr={[1, 1.5]}>
          <PhysicalScene project={project} showAnchors={showAnchors} />
        </Canvas>
      </ThreeBoundary>
      {controller && (
        <aside className="microcontroller-pinout" aria-label={`${controller.name} pinout`}>
          <div className="microcontroller-pinout-heading"><b>{controller.name} pinout</b><span>ESP32 DevKitC V4</span></div>
          <div className="microcontroller-pinout-grid">
            {controllerPins.map((pin) => (
              <span key={pin.id} className={connectedControllerPins.has(pin.id) ? "is-connected" : ""}>
                <i />{pin.label}
              </span>
            ))}
          </div>
        </aside>
      )}
      <div className="sr-only" aria-label="3D scene data">
        {Object.values(project.components).map((component) => <span key={component.id} data-scene-component={component.id}>{component.name}</span>)}
        {Object.values(project.connections).map((connection) => (
          <span key={connection.id} data-scene-wire={connection.id} data-source-pin={connection.source.pinId} data-target-pin={connection.target.pinId} />
        ))}
      </div>
      <div className="view-hint">Drag to orbit · Scroll to zoom · Select a component to focus</div>
      {project.ui.simulation.status !== "stopped" && <div className={`simulation-status simulation-status--${project.ui.simulation.status}`} role="status"><i />{project.ui.simulation.status === "running" ? "Circuit running · outputs energized" : project.ui.simulation.message ?? "Circuit cannot run"}</div>}
      {debug && <button className="anchor-toggle" onClick={() => setShowAnchors((value) => !value)}>{showAnchors ? "Hide" : "Show"} pin anchors</button>}
    </div>
  );
}
