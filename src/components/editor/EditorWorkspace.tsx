"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Box,
  CheckCircle2,
  ChevronRight,
  CircuitBoard,
  Code2,
  Download,
  FilePlus2,
  Info,
  Lock,
  LockOpen,
  MousePointer2,
  Play,
  Redo2,
  RotateCcw,
  Search,
  ShieldCheck,
  Save,
  Square,
  Trash2,
  Undo2,
  Unplug,
} from "lucide-react";
import { COMPONENT_DEFINITIONS, COMPONENT_KINDS } from "@/domain/component-definitions";
import type { ComponentKind } from "@/domain/types";
import { useProjectStore } from "@/store/project-store";
import { registerCircuitCanvasTools } from "@/webmcp/register-tools";
import { SchematicView } from "@/components/schematic/SchematicView";
import { Physical3DView } from "@/components/physical/Physical3DView";
import { CodeView } from "@/components/code/CodeView";
import { CircuitPartIcon } from "@/components/library/CircuitPartIcon";
import { exportProjectJson, exportSchematicSvg } from "@/lib/export-project";

const COMPONENT_GROUPS: Array<{ label: string; kinds: ComponentKind[] }> = [
  { label: "Microcontrollers", kinds: ["esp32-devkitc-v4"] },
  { label: "Power", kinds: ["power-3v3", "power-5v", "ground"] },
  { label: "Input", kinds: ["push-button", "potentiometer", "photoresistor"] },
  { label: "Output", kinds: ["led", "buzzer", "servo"] },
  { label: "Passive", kinds: ["resistor", "capacitor", "diode", "npn-transistor"] },
];

const EDITABLE_PROPERTY: Partial<Record<ComponentKind, {
  property: string;
  label: string;
  options: Array<{ value: number; label: string }>;
}>> = {
  resistor: { property: "resistanceOhms", label: "Resistance", options: [220, 330, 1000, 10000].map((value) => ({ value, label: value >= 1000 ? `${value / 1000} kΩ` : `${value} Ω` })) },
  potentiometer: { property: "resistanceOhms", label: "Maximum resistance", options: [1000, 5000, 10000, 100000].map((value) => ({ value, label: `${value / 1000} kΩ` })) },
  capacitor: { property: "capacitanceUf", label: "Capacitance", options: [0.1, 1, 10, 100, 470].map((value) => ({ value, label: `${value} µF` })) },
  buzzer: { property: "frequencyHz", label: "Tone", options: [500, 1000, 2000, 4000].map((value) => ({ value, label: `${value} Hz` })) },
  servo: { property: "angle", label: "Preview angle", options: [0, 45, 90, 135, 180].map((value) => ({ value, label: `${value}°` })) },
  photoresistor: { property: "lightLevel", label: "Light level", options: [0, 25, 50, 75, 100].map((value) => ({ value, label: `${value}%` })) },
};

function ComponentLibrary() {
  const project = useProjectStore((state) => state.project);
  const execute = useProjectStore((state) => state.executeCommand);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  return (
    <aside className="library-panel panel">
      <div className="panel-heading"><span>Components</span><small>{COMPONENT_KINDS.length} parts</small></div>
      <label className="component-search">
        <Search size={14} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search components…" aria-label="Search components" />
      </label>
      <div className="library-catalog">
        {COMPONENT_GROUPS.map((group) => {
          const kinds = group.kinds.filter((kind) => {
            const definition = COMPONENT_DEFINITIONS[kind];
            return !normalizedQuery || `${definition.displayName} ${definition.category}`.toLowerCase().includes(normalizedQuery);
          });
          if (!kinds.length) return null;
          return (
            <section className="component-group" key={group.label}>
              <h3>{group.label}</h3>
              <div className="component-grid">
                {kinds.map((kind) => {
                  const definition = COMPONENT_DEFINITIONS[kind];
                  const disabled = kind === "esp32-devkitc-v4" && Object.values(project.components).some((component) => component.kind === kind);
                  return (
                    <button
                      key={kind}
                      className="component-card"
                      disabled={disabled}
                      title={disabled ? "The MVP supports one ESP32" : `Add ${definition.displayName}`}
                      onClick={() => execute(
                        { type: "add-component", kind },
                        { origin: "human-schematic", actor: "human", description: `Added ${definition.displayName}` },
                      )}
                    >
                      <span className="part-preview"><CircuitPartIcon kind={kind} /></span>
                      <b>{definition.displayName}</b>
                      <small>{disabled ? "Already added" : "Click to add"}</small>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        {normalizedQuery && !COMPONENT_KINDS.some((kind) => {
          const definition = COMPONENT_DEFINITIONS[kind];
          return `${definition.displayName} ${definition.category}`.toLowerCase().includes(normalizedQuery);
        }) && (
          <p className="library-empty">No matching component.</p>
        )}
      </div>
      <div className="library-tip"><Info size={15} /><span>Click to add. Connect exact labeled pins in the schematic.</span></div>
    </aside>
  );
}

function InspectorStatus() {
  const project = useProjectStore((state) => state.project);
  const validate = useProjectStore((state) => state.validate);
  const execute = useProjectStore((state) => state.executeCommand);
  const report = project.validation.report;
  return (
    <>
      <section className="sidebar-block sidebar-validation">
        <div className="sidebar-block-title"><span>Validation</span><button onClick={validate}>Re-run</button></div>
        <div className="sidebar-health">
          <strong>{report?.score ?? "—"}</strong>
          <span><small>Beginner circuit health</small><b>{report?.valid ? "Supported circuit looks healthy" : "Circuit needs review"}</b>{project.validation.lastRunAt && <em>Checked {new Date(project.validation.lastRunAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</em>}</span>
        </div>
        {report?.issues.length ? report.issues.slice(0, 4).map((issue) => (
          <button key={issue.id} className={`sidebar-check severity-${issue.severity}`} onClick={() => execute(
            { type: "select-component", componentId: issue.componentIds[0] },
            { origin: "human-schematic", actor: "human" },
          )}><span>!</span>{issue.title}</button>
        )) : <div className="sidebar-check is-pass"><CheckCircle2 size={14} /> All supported checks pass</div>}
      </section>
      <section className="sidebar-block circuit-info">
        <div className="sidebar-block-title"><span>Circuit info</span></div>
        <dl>
          <div><dt>Components</dt><dd>{Object.keys(project.components).length}</dd></div>
          <div><dt>Connections</dt><dd>{Object.keys(project.connections).length}</dd></div>
          <div><dt>Firmware</dt><dd>{project.firmware.sync.status}</dd></div>
          <div><dt>Health</dt><dd className={report?.valid ? "is-valid" : "is-review"}>{report?.score ?? "—"}/100</dd></div>
        </dl>
      </section>
    </>
  );
}

function Inspector() {
  const project = useProjectStore((state) => state.project);
  const execute = useProjectStore((state) => state.executeCommand);
  const selected = project.ui.selectedComponentId ? project.components[project.ui.selectedComponentId] : undefined;
  const definition = selected ? COMPONENT_DEFINITIONS[selected.kind] : undefined;
  const connections = selected ? Object.values(project.connections).filter((connection) =>
    connection.source.componentId === selected.id || connection.target.componentId === selected.id) : [];
  const issues = selected ? project.validation.report?.issues.filter((issue) => issue.componentIds.includes(selected.id)) ?? [] : [];
  const editableProperty = selected ? EDITABLE_PROPERTY[selected.kind] : undefined;

  if (!selected || !definition) {
    return (
      <aside className="inspector-panel panel">
        <section className="properties-block">
          <div className="panel-heading"><span>Properties</span></div>
          <div className="empty-inspector"><MousePointer2 size={25} /><b>No component selected</b><p>Select a component to edit its properties, pins, and connections.</p></div>
        </section>
        <InspectorStatus />
      </aside>
    );
  }

  return (
    <aside className={`inspector-panel panel ${project.ui.highlightedComponentIds.includes(selected.id) ? "is-highlighted" : ""}`}>
      <section className="properties-block">
        <div className="panel-heading"><span>Properties</span><small>{definition.category}</small></div>
        <div className="inspector-content">
          <div className="inspector-title"><span className="inspector-part-preview"><CircuitPartIcon kind={selected.kind} /></span><div><h2>{selected.name}</h2><p>{definition.displayName}</p></div></div>
          <p className="component-description">{definition.description}</p>

          {editableProperty && (
            <label className="field-label">
              {editableProperty.label}
              <select
                value={String(selected.properties[editableProperty.property])}
                onChange={(event) => execute(
                  { type: "update-component-property", componentId: selected.id, property: editableProperty.property, value: Number(event.target.value) },
                  { origin: "human-schematic", actor: "human", description: `Changed ${definition.displayName} value` },
                )}
              >
                {editableProperty.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          )}

          {selected.kind === "potentiometer" && (
            <label className="field-label wiper-control">
              Wiper position <output>{Number(selected.properties.positionPercent ?? 50)}%</output>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={Number(selected.properties.positionPercent ?? 50)}
                onChange={(event) => execute(
                  { type: "update-component-property", componentId: selected.id, property: "positionPercent", value: Number(event.target.value) },
                  { origin: "human-schematic", actor: "human", description: "Adjusted potentiometer wiper" },
                )}
                aria-label="Wiper position"
              />
            </label>
          )}

          <section className="inspector-section">
            <h3>Pins</h3>
            <div className="pin-list">
              {definition.pins.map((pin) => {
                const used = connections.some((connection) =>
                  (connection.source.componentId === selected.id && connection.source.pinId === pin.id)
                  || (connection.target.componentId === selected.id && connection.target.pinId === pin.id));
                return <div key={pin.id}><span className={`pin-dot ${used ? "is-used" : ""}`} /><b>{pin.label}</b><small>{used ? "Connected" : pin.inputOnly ? "Input only" : "Available"}</small></div>;
              })}
            </div>
          </section>

          <section className="inspector-section">
            <h3>Connections <span>{connections.length}</span></h3>
            {connections.length ? connections.map((connection) => (
              <div className="connection-row" key={connection.id}>
                <span>{project.components[connection.source.componentId]?.name}.{connection.source.pinId}</span>
                <ChevronRight size={12} />
                <span>{project.components[connection.target.componentId]?.name}.{connection.target.pinId}</span>
                <button aria-label="Disconnect" onClick={() => execute(
                  { type: "disconnect-connection", connectionId: connection.id },
                  { origin: "human-schematic", actor: "human", description: "Disconnected pins" },
                )}><Unplug size={13} /></button>
              </div>
            )) : <p className="muted">No connections yet.</p>}
          </section>

          {issues.length > 0 && <section className="inspector-section"><h3>Issues <span>{issues.length}</span></h3>{issues.map((issue) => <div className={`mini-issue severity-${issue.severity}`} key={issue.id}>{issue.title}</div>)}</section>}

          <div className="inspector-actions">
            <button className="button button--secondary" onClick={() => execute(
              { type: "set-component-lock", componentId: selected.id, locked: !selected.locked },
              { origin: "human-schematic", actor: "human", description: selected.locked ? "Unlocked component" : "Locked component" },
            )}>{selected.locked ? <LockOpen size={14} /> : <Lock size={14} />}{selected.locked ? "Unlock" : "Lock"}</button>
            <button className="button button--danger" disabled={selected.locked} onClick={() => execute(
              { type: "remove-component", componentId: selected.id },
              { origin: "human-schematic", actor: "human", description: `Removed ${selected.name}` },
            )}><Trash2 size={14} /> Remove</button>
          </div>
        </div>
      </section>
      <InspectorStatus />
    </aside>
  );
}

function ActivityPanel() {
  const activities = useProjectStore((state) => state.activities);
  return (
    <section className="activity-panel panel">
      <div className="panel-heading"><span><Activity size={14} /> Agent activity</span><small>{activities.length ? `${activities.length} calls` : "Waiting"}</small></div>
      <div className="activity-list">
        {activities.length === 0 ? <p>WebMCP calls will appear here so agent work stays visible.</p> : activities.slice(0, 5).map((entry) => (
          <div key={entry.id} className={`activity-row activity-${entry.status}`}>
            <span>{entry.status === "running" ? "…" : entry.status === "success" ? "✓" : "!"}</span>
            <div><b>{entry.toolName}</b><small>{entry.summary}</small></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DebugPanel() {
  const state = useProjectStore();
  if (process.env.NEXT_PUBLIC_CIRCUITCANVAS_DEBUG !== "true") return null;
  return (
    <details className="debug-panel">
      <summary>Project diagnostics</summary>
      <pre>{JSON.stringify({
        schemaVersion: state.project.schemaVersion,
        components: Object.keys(state.project.components),
        connections: Object.keys(state.project.connections),
        selected: state.project.ui.selectedComponentId,
        lastCommand: state.lastCommand,
        bindings: state.project.firmware.bindings,
        managedHash: state.project.firmware.generatedHash,
        sync: state.project.firmware.sync,
        issues: state.project.validation.report?.issues.map((issue) => issue.ruleId),
      }, null, 2)}</pre>
    </details>
  );
}

export function EditorWorkspace() {
  const project = useProjectStore((state) => state.project);
  const hasHydrated = useProjectStore((state) => state.hasHydrated);
  const past = useProjectStore((state) => state.past);
  const future = useProjectStore((state) => state.future);
  const hydrate = useProjectStore((state) => state.hydrate);
  const persist = useProjectStore((state) => state.persist);
  const resetProject = useProjectStore((state) => state.resetProject);
  const saveProject = useProjectStore((state) => state.saveProject);
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);
  const validate = useProjectStore((state) => state.validate);
  const execute = useProjectStore((state) => state.executeCommand);
  const [agentStatus, setAgentStatus] = useState<"checking" | "ready" | "unavailable">("checking");
  const [validationFeedback, setValidationFeedback] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const simulation = project.ui.simulation;
  const validationFeedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => hydrate(), [hydrate]);
  useEffect(() => {
    if (!hasHydrated) return;
    const timer = setTimeout(persist, 500);
    return () => clearTimeout(timer);
  }, [project, hasHydrated, persist]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    registerCircuitCanvasTools(controller.signal)
      .then((registered) => {
        if (active) setAgentStatus(registered ? "ready" : "unavailable");
      })
      .catch((error: unknown) => {
        if (active && (!(error instanceof DOMException) || error.name !== "AbortError")) {
          console.error("WebMCP registration failed", error);
          setAgentStatus("unavailable");
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      if (!editing && (event.key === "Delete" || event.key === "Backspace")) {
        const selectedConnectionId = useProjectStore.getState().project.ui.selectedConnectionId;
        const selectedComponentId = useProjectStore.getState().project.ui.selectedComponentId;
        if (selectedConnectionId) {
          event.preventDefault();
          execute({ type: "disconnect-connection", connectionId: selectedConnectionId }, { origin: "human-schematic", actor: "human", description: "Deleted selected connection" });
        } else if (selectedComponentId) {
          event.preventDefault();
          execute({ type: "remove-component", componentId: selectedComponentId }, { origin: "human-schematic", actor: "human", description: "Deleted selected component" });
        }
        return;
      }
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [execute, redo, undo]);
  useEffect(() => () => {
    if (validationFeedbackTimer.current) clearTimeout(validationFeedbackTimer.current);
  }, []);

  const componentCount = Object.keys(project.components).length;
  const view = project.ui.activeView;
  const statusCopy = agentStatus === "ready" ? "Agent tools ready" : agentStatus === "checking" ? "Checking agent tools" : "Agent tools unavailable";
  const handleValidate = () => {
    validate();
    setValidationFeedback(true);
    if (validationFeedbackTimer.current) clearTimeout(validationFeedbackTimer.current);
    validationFeedbackTimer.current = setTimeout(() => setValidationFeedback(false), 1400);
  };
  const workspace = useMemo(() => {
    if (view === "schematic") return <SchematicView />;
    if (view === "3d") return <Physical3DView />;
    return <CodeView />;
  }, [view]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand"><span className="brand-mark"><CircuitBoard size={20} /></span><div><b>CircuitCanvas</b><small>Agent-native circuit designer</small></div><span className="header-save-state"><i /> Auto-saved</span></div>
        <nav className="view-tabs" aria-label="Editor views">
          {([
            ["schematic", CircuitBoard, "Design"],
            ["code", Code2, "Code"],
            ["3d", Box, "3D"],
          ] as const).map(([id, Icon, label]) => (
            <button key={id} className={view === id ? "is-active" : ""} aria-current={view === id ? "page" : undefined} onClick={() => execute(
              { type: "set-active-view", view: id },
              { origin: "human-schematic", actor: "human" },
            )}><Icon size={15} /> {label}</button>
          ))}
        </nav>
        <div className="header-actions">
          <span className={`agent-status agent-status--${agentStatus}`} title="This page exposes structured WebMCP tools to compatible browser agents."><i />{statusCopy}</span>
          <button className="icon-button" aria-label="Undo" disabled={!past.length} onClick={() => undo()}><Undo2 size={17} /></button>
          <button className="icon-button" aria-label="Redo" disabled={!future.length} onClick={() => redo()}><Redo2 size={17} /></button>
          <button className="button button--secondary" onClick={saveProject} aria-label="Save project"><Save size={14} /> Save</button>
          <button className="button button--secondary" onClick={() => { if (window.confirm("Start a new blank project? Unsaved changes will be replaced.")) resetProject(); }} aria-label="Start new project"><FilePlus2 size={14} /> New</button>
          <div className="export-menu">
            <button className="button button--secondary" aria-haspopup="menu" aria-expanded={exportMenuOpen} onClick={() => setExportMenuOpen((value) => !value)}><Download size={15} /> Export</button>
            {exportMenuOpen && <div className="export-menu-popover" role="menu">
              <button role="menuitem" onClick={() => { exportProjectJson(project); setExportMenuOpen(false); }}>Project JSON</button>
              <button role="menuitem" onClick={() => { exportSchematicSvg(project); setExportMenuOpen(false); }}>Schematic SVG</button>
            </div>}
          </div>
          <button className={`button ${simulation.status === "running" ? "button--danger" : "button--secondary"}`} onClick={() => execute(
            { type: simulation.status === "running" ? "stop-simulation" : "run-simulation" },
            { origin: "human-schematic", actor: "human", description: simulation.status === "running" ? "Stopped circuit" : "Ran circuit" },
          )} aria-label={simulation.status === "running" ? "Stop circuit" : "Run circuit"}>
            {simulation.status === "running" ? <Square size={13} /> : <Play size={13} />}{simulation.status === "running" ? "Stop" : "Run"}
          </button>
          <button className={`button button--primary validation-button ${validationFeedback ? "is-complete" : ""}`} onClick={handleValidate} aria-label="Validate circuit"><ShieldCheck size={15} /> {validationFeedback ? "Validated" : "Validate"}</button>
        </div>
      </header>

      {componentCount === 0 ? (
        <section className="welcome-layout">
          <div className="welcome-card">
            <span className="welcome-icon"><CircuitBoard size={34} /></span>
            <span className="eyebrow">Agent-native electronics</span>
            <h1>Start your first circuit</h1>
            <p>Build with exact electrical state shared by the schematic, physical 3D view, firmware bindings, validation, and browser agents.</p>
            <div className="welcome-actions"><button className="button button--secondary" onClick={resetProject}><RotateCcw size={15} /> Start blank</button></div>
            <div className="agent-prompt"><span>try with a compatible browser agent</span><q>Build an ESP32 circuit where pressing a button turns on an LED.</q></div>
          </div>
          <div className="welcome-side"><ComponentLibrary /><ActivityPanel /></div>
        </section>
      ) : (
        <>
          <section className="editor-grid"><ComponentLibrary /><div className="main-view">{workspace}</div><Inspector /></section>
          <section className="bottom-grid"><ActivityPanel /></section>
        </>
      )}

      <footer className="status-bar">
        <span><i className={`status-dot ${simulation.status === "running" ? "status-dot--running" : simulation.status === "error" ? "status-dot--error" : ""}`} /> {simulation.status === "running" ? "Circuit running" : simulation.status === "error" ? simulation.message ?? "Circuit cannot run" : "Autosaved locally"}</span>
        <span>{componentCount} components · {Object.keys(project.connections).length} connections</span>
        <span>CircuitCanvas checks supported beginner patterns—not professional electrical safety.</span>
      </footer>
      <DebugPanel />
    </main>
  );
}
