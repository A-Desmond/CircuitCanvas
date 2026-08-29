"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, RefreshCcw } from "lucide-react";
import { COMPONENT_DEFINITIONS } from "@/domain/component-definitions";
import { useProjectStore } from "@/store/project-store";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="editor-loading">Loading firmware editor…</div>,
});

export function CodeView() {
  const project = useProjectStore((state) => state.project);
  const applyFirmwareCode = useProjectStore((state) => state.applyFirmwareCode);
  const draft = useRef(project.firmware.code);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [plainText, setPlainText] = useState(false);

  useEffect(() => { draft.current = project.firmware.code; }, [project.firmware.code]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const compatiblePins = useMemo(() => {
    const controller = Object.values(project.components).find((component) => component.kind === "esp32-devkitc-v4");
    if (!controller) return [];
    return COMPONENT_DEFINITIONS[controller.kind].pins.filter((pin) => pin.capabilities.includes("digital-output") && !pin.inputOnly);
  }, [project.components]);

  const applyDraft = (value: string) => {
    draft.current = value;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = undefined;
      applyFirmwareCode(value);
    }, 400);
  };

  const commitDraft = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    applyFirmwareCode(draft.current);
  };

  const repairBinding = (symbol: "LED_PIN" | "BUTTON_PIN", pinId: string) => {
    const number = pinId.replace("GPIO", "");
    const pattern = new RegExp(`(^\\s*#define\\s+${symbol}\\s+)\\S+`, "m");
    const repaired = draft.current.replace(pattern, `$1${number}`);
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    draft.current = repaired;
    applyFirmwareCode(repaired);
  };

  const revertConflicts = () => {
    let repaired = draft.current;
    for (const binding of project.firmware.bindings) {
      repaired = repaired.replace(
        new RegExp(`(^\\s*#define\\s+${binding.symbolName}\\s+)\\S+`, "m"),
        `$1${binding.controllerPinId.replace("GPIO", "")}`,
      );
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    draft.current = repaired;
    applyFirmwareCode(repaired);
  };

  return (
    <div className="view-surface code-surface" data-testid="code-view">
      <div className="firmware-bar">
        <div>
          <span className="eyebrow">Firmware bindings</span>
          <div className="binding-list">
            {project.firmware.bindings.length ? project.firmware.bindings.map((binding) => (
              <span className="binding-chip" key={binding.id}>
                <b>{binding.symbolName}</b> {binding.controllerPinId}
              </span>
            )) : <span className="muted">Connect the hero circuit to derive bindings.</span>}
          </div>
        </div>
        <div className="firmware-actions">
          <button className="text-mode-button" onClick={() => setPlainText((value) => !value)}><FileText size={13} />{plainText ? "Monaco editor" : "Plain text mode"}</button>
          <div className={`sync-badge sync-badge--${project.firmware.sync.status}`}>
            {project.firmware.sync.status === "synced" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            {project.firmware.sync.status}
          </div>
        </div>
      </div>

      {project.firmware.sync.status === "conflict" && (
        <div className="conflict-panel" role="alert">
          <div><AlertTriangle size={18} /><div><b>Firmware sync conflict</b>{project.firmware.sync.issues.map((issue) => <p key={`${issue.code}-${issue.symbolName}`}>{issue.message}</p>)}</div></div>
          <div className="conflict-actions">
            <button className="button button--secondary" onClick={revertConflicts}><RefreshCcw size={14} /> Revert binding</button>
            {project.firmware.sync.issues.some((issue) => issue.symbolName === "LED_PIN") && (
              <label className="pin-select-label">
                Choose compatible pin
                <select defaultValue="" onChange={(event) => event.target.value && repairBinding("LED_PIN", event.target.value)}>
                  <option value="" disabled>Select GPIO</option>
                  {compatiblePins.map((pin) => <option key={pin.id} value={pin.id}>{pin.label}</option>)}
                </select>
              </label>
            )}
          </div>
        </div>
      )}

      <div className="monaco-wrap">
        {plainText ? (
          <textarea
            key={project.firmware.generatedRevision}
            className="firmware-textarea"
            aria-label="Firmware source"
            defaultValue={project.firmware.code}
            spellCheck={false}
            onChange={(event) => applyDraft(event.target.value)}
            onBlur={commitDraft}
          />
        ) : (
          <MonacoEditor
            height="100%"
            language="cpp"
            theme="vs"
            value={project.firmware.code}
            onChange={(value) => applyDraft(value ?? "")}
            onMount={(editor) => { editor.onDidBlurEditorWidget(commitDraft); }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "var(--font-geist-mono)",
              lineHeight: 22,
              padding: { top: 18 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        )}
      </div>
      <div className="managed-note">
        CircuitCanvas synchronizes exact pin defines and pin modes inside managed markers. Code outside those regions is preserved.
      </div>
    </div>
  );
}
