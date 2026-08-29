import { COMPONENT_DEFINITIONS } from "@/domain/component-definitions";
import type { CircuitProject, ComponentKind, PinDefinition } from "@/domain/types";

function fileStem(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "circuitcanvas-project";
}

function download(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportProjectJson(project: CircuitProject): string {
  const content = `${JSON.stringify(project, null, 2)}\n`;
  download(`${fileStem(project.name)}.circuitcanvas.json`, content, "application/json");
  return content;
}

function xmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function nodeSize(kind: ComponentKind): { width: number; height: number } {
  return kind === "esp32-devkitc-v4" ? { width: 210, height: 198 } : { width: 158, height: 108 };
}

function pinPoint(project: CircuitProject, componentId: string, pinId: string): { x: number; y: number } {
  const component = project.components[componentId];
  if (!component) return { x: 0, y: 0 };
  const pin = COMPONENT_DEFINITIONS[component.kind].pins.find((candidate) => candidate.id === pinId);
  if (!pin) return { x: component.schematic.x, y: component.schematic.y };
  const size = nodeSize(component.kind);
  const offset = 42 + pin.schematicAnchor.order * 19;
  if (pin.schematicAnchor.side === "right") return { x: component.schematic.x + size.width, y: component.schematic.y + offset };
  if (pin.schematicAnchor.side === "top") return { x: component.schematic.x + offset, y: component.schematic.y };
  if (pin.schematicAnchor.side === "bottom") return { x: component.schematic.x + offset, y: component.schematic.y + size.height };
  return { x: component.schematic.x, y: component.schematic.y + offset };
}

function glyphLabel(kind: ComponentKind): string {
  if (kind === "esp32-devkitc-v4") return "ESP32";
  if (kind === "power-3v3") return "3.3V";
  if (kind === "power-5v") return "5V";
  if (kind === "ground") return "GND";
  return COMPONENT_DEFINITIONS[kind].displayName;
}

export function exportSchematicSvg(project: CircuitProject): string {
  const components = Object.values(project.components);
  const maxX = Math.max(960, ...components.map((component) => component.schematic.x + nodeSize(component.kind).width + 80));
  const maxY = Math.max(620, ...components.map((component) => component.schematic.y + nodeSize(component.kind).height + 80));
  const edgeMarkup = Object.values(project.connections).map((connection) => {
    const source = pinPoint(project, connection.source.componentId, connection.source.pinId);
    const target = pinPoint(project, connection.target.componentId, connection.target.pinId);
    const color = connection.role === "ground" ? "#64748b" : connection.role === "power" ? "#dc2626" : "#2563eb";
    return `<path d="M ${source.x} ${source.y} L ${(source.x + target.x) / 2} ${source.y} L ${(source.x + target.x) / 2} ${target.y} L ${target.x} ${target.y}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join("");
  const nodeMarkup = components.map((component) => {
    const size = nodeSize(component.kind);
    const x = component.schematic.x;
    const y = component.schematic.y;
    const definition = COMPONENT_DEFINITIONS[component.kind];
    const pins = definition.pins.map((pin: PinDefinition) => {
      const point = pinPoint(project, component.id, pin.id);
      return `<circle cx="${point.x}" cy="${point.y}" r="5" fill="white" stroke="#2563eb" stroke-width="2"/><text x="${point.x + (pin.schematicAnchor.side === "left" ? 10 : -10)}" y="${point.y + 3}" text-anchor="${pin.schematicAnchor.side === "left" ? "start" : "end"}" class="pin">${xmlText(pin.label)}</text>`;
    }).join("");
    return `<g><rect x="${x}" y="${y}" width="${size.width}" height="${size.height}" rx="12" class="node"/><rect x="${x}" y="${y}" width="${size.width}" height="30" rx="12" class="node-head"/><text x="${x + 12}" y="${y + 20}" class="name">${xmlText(component.name)}</text><text x="${x + size.width / 2}" y="${y + size.height / 2 + 5}" text-anchor="middle" class="glyph">${xmlText(glyphLabel(component.kind))}</text>${pins}</g>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${maxX}" height="${maxY}" viewBox="0 0 ${maxX} ${maxY}"><defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#cfdeef" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="#eaf2fb"/><rect width="100%" height="100%" fill="url(#grid)"/><text x="32" y="38" class="title">${xmlText(project.name)}</text>${edgeMarkup}${nodeMarkup}<style>.title{font:700 22px Inter,Arial,sans-serif;fill:#1a2f4d}.node{fill:#fff;stroke:#bfd0e2;stroke-width:1.5}.node-head{fill:#edf4fc;stroke:none}.name{font:700 13px Inter,Arial,sans-serif;fill:#1b3352}.glyph{font:700 16px Inter,Arial,sans-serif;fill:#2563eb}.pin{font:10px monospace;fill:#526980}</style></svg>`;
  download(`${fileStem(project.name)}.schematic.svg`, svg, "image/svg+xml");
  return svg;
}
