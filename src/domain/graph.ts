import { COMPONENT_DEFINITIONS, getPinDefinition } from "./component-definitions";
import type { CircuitConnection, CircuitProject, ComponentKind, Endpoint } from "./types";

export function endpointKey(endpoint: Endpoint): string {
  return `${endpoint.componentId}:${endpoint.pinId}`;
}

export function parseEndpointKey(key: string): Endpoint {
  const separator = key.lastIndexOf(":");
  return { componentId: key.slice(0, separator), pinId: key.slice(separator + 1) };
}

export function buildAdjacency(project: CircuitProject, includeInternal = true): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)?.add(b);
    adjacency.get(b)?.add(a);
  };

  Object.values(project.connections).forEach((connection) =>
    link(endpointKey(connection.source), endpointKey(connection.target)),
  );

  if (includeInternal) {
    Object.values(project.components).forEach((component) => {
      if (["resistor", "push-button", "capacitor", "diode", "buzzer", "photoresistor"].includes(component.kind)) {
        const [a, b] = COMPONENT_DEFINITIONS[component.kind].pins;
        link(endpointKey({ componentId: component.id, pinId: a.id }), endpointKey({ componentId: component.id, pinId: b.id }));
      }
      if (component.kind === "potentiometer") {
        const [a, wiper, b] = COMPONENT_DEFINITIONS[component.kind].pins;
        link(endpointKey({ componentId: component.id, pinId: a.id }), endpointKey({ componentId: component.id, pinId: wiper.id }));
        link(endpointKey({ componentId: component.id, pinId: wiper.id }), endpointKey({ componentId: component.id, pinId: b.id }));
      }
    });
  }

  return adjacency;
}

export function getConnectionsForComponent(project: CircuitProject, componentId: string): CircuitConnection[] {
  return Object.values(project.connections).filter(
    (connection) => connection.source.componentId === componentId || connection.target.componentId === componentId,
  );
}

export function getConnectionsForPin(project: CircuitProject, endpoint: Endpoint): CircuitConnection[] {
  return Object.values(project.connections).filter((connection) => {
    const key = endpointKey(endpoint);
    return endpointKey(connection.source) === key || endpointKey(connection.target) === key;
  });
}

export function getOtherEndpoint(connection: CircuitConnection, endpoint: Endpoint): Endpoint {
  return endpointKey(connection.source) === endpointKey(endpoint) ? connection.target : connection.source;
}

export function findPaths(project: CircuitProject, start: Endpoint, predicate: (endpoint: Endpoint) => boolean): Endpoint[][] {
  const adjacency = buildAdjacency(project);
  const queue: string[][] = [[endpointKey(start)]];
  const paths: Endpoint[][] = [];
  const shortestVisit = new Map<string, number>();

  while (queue.length) {
    const path = queue.shift();
    if (!path || path.length > 20) continue;
    const current = path[path.length - 1];
    const endpoint = parseEndpointKey(current);
    if (path.length > 1 && predicate(endpoint)) paths.push(path.map(parseEndpointKey));
    const previousLength = shortestVisit.get(current);
    if (previousLength !== undefined && previousLength < path.length) continue;
    shortestVisit.set(current, path.length);
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!path.includes(neighbor)) queue.push([...path, neighbor]);
    }
  }
  return paths.sort((a, b) => a.length - b.length);
}

export function hasPath(project: CircuitProject, start: Endpoint, target: Endpoint): boolean {
  return findPaths(project, start, (endpoint) => endpointKey(endpoint) === endpointKey(target)).length > 0;
}

export function hasGroundPath(project: CircuitProject, start: Endpoint): boolean {
  return findPaths(project, start, (endpoint) => {
    const component = project.components[endpoint.componentId];
    return Boolean(component && getPinDefinition(component.kind, endpoint.pinId)?.capabilities.includes("ground"));
  }).length > 0;
}

export function findConnectedControllerPin(project: CircuitProject, start: Endpoint): { endpoint: Endpoint; path: Endpoint[] } | undefined {
  return findPaths(project, start, (endpoint) => {
    const component = project.components[endpoint.componentId];
    return component?.kind === "esp32-devkitc-v4" && endpoint.pinId.startsWith("GPIO");
  }).map((path) => ({ endpoint: path[path.length - 1], path }))[0];
}

export function pathContainsComponentKind(
  project: CircuitProject,
  path: Endpoint[],
  kind: ComponentKind,
): boolean {
  return path.some((endpoint) => project.components[endpoint.componentId]?.kind === kind);
}

export function findSeriesPath(project: CircuitProject, start: Endpoint, kind: ComponentKind): Endpoint[] | undefined {
  const match = findPaths(project, start, (endpoint) => project.components[endpoint.componentId]?.kind === "esp32-devkitc-v4")
    .find((path) => pathContainsComponentKind(project, path, kind));
  return match;
}
