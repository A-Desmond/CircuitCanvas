"use client";

import { create } from "zustand";
import { z } from "zod";
import { applyDomainCommand, type DomainCommand } from "@/domain/commands";
import { getPinDefinition, normalizeESP32Pin } from "@/domain/component-definitions";
import { createBlankProject, createHeroProject } from "@/domain/project";
import type {
  ActivityEntry,
  CircuitProject,
  CommandMeta,
  CommandResult,
  FirmwareSyncIssue,
} from "@/domain/types";
import { createId } from "@/lib/ids";
import {
  hashManagedRegions,
  parseManagedBindings,
  syncCircuitToFirmware,
} from "@/firmware/managed-region";
import { withValidation } from "@/validation/validate-circuit";

const STORAGE_KEY = "circuitcanvas:project:v1";
const PROJECTS_KEY = "circuitcanvas:projects:v1";
const SavedProjectSchema = z.object({
  schemaVersion: z.literal(1),
  components: z.record(z.string(), z.unknown()),
  connections: z.record(z.string(), z.unknown()),
  firmware: z.object({ code: z.string() }).passthrough(),
}).passthrough();

interface ProjectStore {
  project: CircuitProject;
  past: CircuitProject[];
  future: CircuitProject[];
  activities: ActivityEntry[];
  hasHydrated: boolean;
  lastCommand?: { type: string; meta: CommandMeta };
  executeCommand(command: DomainCommand, meta: CommandMeta): CommandResult<unknown>;
  applyFirmwareCode(code: string, meta?: CommandMeta): CommandResult<unknown>;
  undo(meta?: CommandMeta): CommandResult<unknown>;
  redo(): CommandResult<unknown>;
  resetProject(): void;
  saveProject(): void;
  listSavedProjects(): Array<{ id: string; name: string; updatedAt: string }>;
  loadSavedProject(projectId: string): boolean;
  loadExample(): void;
  hydrate(): void;
  persist(): void;
  validate(): void;
  activityStart(toolName: string, summary: string): string;
  activityFinish(id: string, status: "success" | "failed", summary: string, relatedComponentIds?: string[]): void;
}

function coordinated(project: CircuitProject, electrical: boolean): CircuitProject {
  return electrical ? withValidation(syncCircuitToFirmware(project)) : project;
}

function publicFailure(message: string): CommandResult<never> {
  return { ok: false, error: { code: "INVALID_PIN_BINDING", message } };
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: createBlankProject(),
  past: [],
  future: [],
  activities: [],
  hasHydrated: false,

  executeCommand(command, meta) {
    const current = get().project;
    const result = applyDomainCommand(current, command);
    if (!result.ok) return result;
    const applied = result.data;
    let next = coordinated(applied.project, applied.electrical);
    // Keep live output levels in sync with component controls changed during a run.
    if (current.ui.simulation.status === "running" && command.type === "update-component-property") {
      const rerun = applyDomainCommand(next, { type: "run-simulation" });
      if (rerun.ok) next = rerun.data.project;
    }
    set((state) => ({
      project: next,
      past: applied.historical ? [...state.past, current].slice(-100) : state.past,
      future: applied.historical ? [] : state.future,
      lastCommand: { type: command.type, meta },
    }));
    return { ok: true, data: applied.data };
  },

  applyFirmwareCode(code, meta = { origin: "human-code", actor: "human" }) {
    const current = get().project;
    if (code === current.firmware.code) return { ok: true, data: current.firmware };
    if (hashManagedRegions(code) === current.firmware.generatedHash && code === current.firmware.code) {
      return { ok: true, data: current.firmware };
    }

    const parsed = parseManagedBindings(code);
    let next: CircuitProject = {
      ...current,
      firmware: { ...current.firmware, code, sync: { status: "dirty", issues: [] } },
    };
    const issues: FirmwareSyncIssue[] = [...parsed.issues];
    const controller = Object.values(current.components).find((component) => component.kind === "esp32-devkitc-v4");

    for (const symbol of ["LED_PIN", "BUTTON_PIN"] as const) {
      const value = parsed.values[symbol];
      if (value === undefined) continue;
      const canonical = normalizeESP32Pin(value);
      const role = symbol === "LED_PIN" ? "led" : "button";
      const binding = current.firmware.bindings.find((candidate) => candidate.symbolName === symbol);
      const pin = controller && canonical ? getPinDefinition(controller.kind, canonical) : undefined;
      const capability = role === "led" ? "digital-output" : "digital-input";
      if (!canonical || !pin || !pin.capabilities.includes(capability) || (role === "led" && pin.inputOnly)) {
        issues.push({
          code: "INVALID_PIN",
          symbolName: symbol,
          message: `${canonical ?? `GPIO${value}`} cannot ${role === "led" ? "drive the LED" : "read the button"}. ${role === "led" ? "Choose an output-capable GPIO such as GPIO18 or GPIO19." : "Choose a digital-input-capable GPIO."}`,
        });
        continue;
      }
      if (binding && binding.controllerPinId !== canonical) {
        const rebound = applyDomainCommand(next, {
          type: "rebind-controller-pin",
          componentId: binding.componentId,
          role,
          newPinId: canonical,
        });
        if (!rebound.ok) issues.push({ code: "INVALID_PIN", symbolName: symbol, message: rebound.error.message });
        else next = rebound.data.project;
      }
    }

    if (issues.length) {
      next = withValidation({ ...next, firmware: { ...next.firmware, code, sync: { status: "conflict", issues } } });
      set((state) => ({
        project: next,
        past: [...state.past, current].slice(-100),
        future: [],
        lastCommand: { type: "apply-firmware-code", meta },
      }));
      return publicFailure(issues[0].message);
    }

    next = withValidation(syncCircuitToFirmware(next));
    set((state) => ({
      project: next,
      past: [...state.past, current].slice(-100),
      future: [],
      lastCommand: { type: "apply-firmware-code", meta },
    }));
    return { ok: true, data: next.firmware };
  },

  undo(meta = { origin: "undo-redo", actor: "human" }) {
    const { past, project, future } = get();
    const previous = past[past.length - 1];
    if (!previous) return { ok: false, error: { code: "UNSUPPORTED_OPERATION", message: "There is nothing to undo." } };
    const restored = withValidation(previous);
    set({
      project: restored,
      past: past.slice(0, -1),
      future: [project, ...future].slice(0, 100),
      lastCommand: { type: "undo", meta },
    });
    return { ok: true, data: restored };
  },

  redo() {
    const { past, project, future } = get();
    const next = future[0];
    if (!next) return { ok: false, error: { code: "UNSUPPORTED_OPERATION", message: "There is nothing to redo." } };
    const restored = withValidation(next);
    set({
      project: restored,
      past: [...past, project].slice(-100),
      future: future.slice(1),
      lastCommand: { type: "redo", meta: { origin: "undo-redo", actor: "human" } },
    });
    return { ok: true, data: restored };
  },

  resetProject() {
    set({ project: withValidation(createBlankProject()), past: [], future: [], activities: [] });
  },

  saveProject() {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(PROJECTS_KEY);
    const projects: CircuitProject[] = raw ? JSON.parse(raw) as CircuitProject[] : [];
    const current = get().project;
    const next = [...projects.filter((project) => project.id !== current.id), current];
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  },

  listSavedProjects() {
    if (typeof window === "undefined") return [];
    try { return (JSON.parse(window.localStorage.getItem(PROJECTS_KEY) ?? "[]") as CircuitProject[]).map(({ id, name, metadata }) => ({ id, name, updatedAt: metadata.updatedAt })); } catch { return []; }
  },

  loadSavedProject(projectId) {
    if (typeof window === "undefined") return false;
    try {
      const projects = JSON.parse(window.localStorage.getItem(PROJECTS_KEY) ?? "[]") as CircuitProject[];
      const found = projects.find((project) => project.id === projectId);
      if (!found) return false;
      set({ project: withValidation(found), past: [], future: [], activities: [] });
      return true;
    } catch { return false; }
  },

  loadExample() {
    set({ project: createHeroProject(), past: [], future: [], activities: [] });
  },

  hydrate() {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      set({ hasHydrated: true, project: withValidation(get().project) });
      return;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      const checked = SavedProjectSchema.safeParse(parsed);
      if (!checked.success) throw new Error("Invalid saved project");
      const saved = parsed as CircuitProject;
      const simulation = saved.ui.simulation ? { ...saved.ui.simulation, componentLevels: saved.ui.simulation.componentLevels ?? {}, inputs: saved.ui.simulation.inputs ?? {} } : { status: "stopped" as const, energizedComponentIds: [], componentLevels: {}, inputs: {} };
      const normalized = { ...saved, ui: { ...saved.ui, highlightedComponentIds: saved.ui.highlightedComponentIds ?? [], simulation } };
      set({ project: withValidation(syncCircuitToFirmware(normalized)), hasHydrated: true, past: [], future: [] });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      set({ project: withValidation(createBlankProject()), hasHydrated: true, past: [], future: [] });
    }
  },

  persist() {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(get().project));
  },

  validate() {
    set((state) => ({ project: withValidation(state.project) }));
  },

  activityStart(toolName, summary) {
    const id = createId("activity");
    const entry: ActivityEntry = {
      id,
      timestamp: new Date().toISOString(),
      actor: "agent",
      toolName,
      status: "running",
      summary,
    };
    set((state) => ({ activities: [entry, ...state.activities].slice(0, 40) }));
    return id;
  },

  activityFinish(id, status, summary, relatedComponentIds) {
    set((state) => ({
      activities: state.activities.map((entry) =>
        entry.id === id ? { ...entry, status, summary, relatedComponentIds } : entry),
    }));
  },
}));
