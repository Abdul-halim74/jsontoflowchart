import type { Edge, Node } from "reactflow";

export type JsonNodeKind = "root" | "object" | "array" | "leaf";

export interface JsonNodeProperty {
  key: string;
  value: string;
}

export interface JsonNodeData {
  label: string;
  subtitle?: string;
  nodeKind: JsonNodeKind;
  properties: JsonNodeProperty[];
  path: string;
}

export interface ParseResult {
  nodes: Node<JsonNodeData>[];
  edges: Edge[];
}

/** Thrown for anything wrong with the input JSON/object — invalid syntax,
 *  non-object root, or runaway nesting. Callers should catch this
 *  specifically to show a friendly message instead of a stack trace. */
export class JsonParseError extends Error {}

const MAX_DEPTH = 50;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** An array/object "needs its own node"; a primitive (or an array of only
 *  primitives) is rendered inline as a property instead. */
function isComplex(value: unknown): boolean {
  if (isPlainObject(value)) return true;
  if (Array.isArray(value)) {
    return value.some((item) => isPlainObject(item) || Array.isArray(item));
  }
  return false;
}

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function stringifyPrimitive(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) {
    const joined = value.map((v) => String(v)).join(", ");
    if (!joined) return "empty array";
    return joined.length > 60 ? `${joined.slice(0, 57)}...` : joined;
  }
  return String(value);
}

const LABEL_KEYS = ["name", "appName", "title", "id", "label"];
const SUBTITLE_KEYS = ["type", "kind", "role", "category", "primary", "status"];

function pickLabelAndSubtitle(
  obj: Record<string, unknown>,
  fallbackKey: string,
): { label: string; subtitle?: string } {
  let label: string | undefined;
  for (const key of LABEL_KEYS) {
    const value = obj[key];
    if (typeof value === "string" || typeof value === "number") {
      label = String(value);
      break;
    }
  }

  let subtitle: string | undefined;
  for (const key of SUBTITLE_KEYS) {
    const value = obj[key];
    if (
      key in obj &&
      (typeof value === "string" || typeof value === "number") &&
      String(value) !== label
    ) {
      subtitle = String(value);
      break;
    }
  }

  return { label: label ?? humanizeKey(fallbackKey), subtitle };
}

/**
 * Recursively converts a nested JSON object/array into a React Flow
 * node/edge graph. Objects and "complex" arrays (arrays that contain at
 * least one object/array) become nodes; scalar keys and arrays of scalars
 * are attached to their owning node as inline properties instead of
 * spawning their own nodes, which keeps the diagram legible.
 *
 * Positions are left at (0, 0) — pass the result through `layoutElements`
 * (dagre) before rendering.
 */
export function parseJsonToFlow(input: unknown): ParseResult {
  const nodes: Node<JsonNodeData>[] = [];
  const edges: Edge[] = [];
  const visited = new WeakSet<object>();
  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

  const addEdge = (source: string, target: string) => {
    edges.push({
      id: `e-${source}-${target}`,
      source,
      target,
      type: "smoothstep",
    });
  };

  function visitLeaf(keyName: string, value: unknown, parentId: string | null, path: string) {
    const id = nextId("leaf");
    nodes.push({
      id,
      type: "jsonNode",
      position: { x: 0, y: 0 },
      data: {
        label: humanizeKey(keyName),
        subtitle: stringifyPrimitive(value),
        nodeKind: "leaf",
        properties: [{ key: keyName, value: stringifyPrimitive(value) }],
        path,
      },
    });
    if (parentId) addEdge(parentId, id);
  }

  function visitCircular(keyName: string, parentId: string | null, path: string) {
    const id = nextId("circular");
    nodes.push({
      id,
      type: "jsonNode",
      position: { x: 0, y: 0 },
      data: {
        label: humanizeKey(keyName),
        subtitle: "circular reference",
        nodeKind: "leaf",
        properties: [
          { key: "warning", value: "Circular reference detected — traversal stopped here." },
        ],
        path,
      },
    });
    if (parentId) addEdge(parentId, id);
  }

  function visitArray(
    keyName: string,
    value: unknown[],
    parentId: string | null,
    depth: number,
    path: string,
  ) {
    const id = nextId("array");
    const allPrimitive = value.every((item) => !isPlainObject(item) && !Array.isArray(item));

    nodes.push({
      id,
      type: "jsonNode",
      position: { x: 0, y: 0 },
      data: {
        label: humanizeKey(keyName),
        subtitle: `Array · ${value.length} item${value.length === 1 ? "" : "s"}`,
        nodeKind: "array",
        properties: allPrimitive
          ? value.map((item, i) => ({ key: `[${i}]`, value: stringifyPrimitive(item) }))
          : [],
        path,
      },
    });
    if (parentId) addEdge(parentId, id);

    if (!allPrimitive) {
      value.forEach((item, i) => {
        visit(item, `${keyName} ${i + 1}`, id, depth + 1, `${path}[${i}]`);
      });
    }
  }

  function visitObject(
    keyName: string,
    value: Record<string, unknown>,
    parentId: string | null,
    depth: number,
    path: string,
  ) {
    const { label, subtitle } = pickLabelAndSubtitle(value, keyName);
    const id = nextId("object");

    const scalarProps: JsonNodeProperty[] = [];
    const childEntries: Array<[string, unknown]> = [];

    for (const [k, v] of Object.entries(value)) {
      if (isComplex(v)) {
        childEntries.push([k, v]);
      } else {
        scalarProps.push({ key: k, value: stringifyPrimitive(v) });
      }
    }

    nodes.push({
      id,
      type: "jsonNode",
      position: { x: 0, y: 0 },
      data: {
        label,
        subtitle,
        nodeKind: parentId ? "object" : "root",
        properties: scalarProps,
        path,
      },
    });
    if (parentId) addEdge(parentId, id);

    for (const [k, v] of childEntries) {
      visit(v, k, id, depth + 1, path ? `${path}.${k}` : k);
    }
  }

  function visit(
    value: unknown,
    keyName: string,
    parentId: string | null,
    depth: number,
    path: string,
  ): void {
    if (depth > MAX_DEPTH) {
      throw new JsonParseError(
        `Maximum nesting depth (${MAX_DEPTH}) exceeded at "${path}". Aborting to avoid a runaway diagram.`,
      );
    }

    if (typeof value === "object" && value !== null) {
      if (visited.has(value)) {
        visitCircular(keyName, parentId, path);
        return;
      }
      visited.add(value);
    }

    if (Array.isArray(value)) {
      visitArray(keyName, value, parentId, depth, path);
      return;
    }

    if (isPlainObject(value)) {
      visitObject(keyName, value, parentId, depth, path);
      return;
    }

    visitLeaf(keyName, value, parentId, path);
  }

  if (!isPlainObject(input) && !Array.isArray(input)) {
    throw new JsonParseError("Root value must be a JSON object or array.");
  }

  visit(input, "root", null, 0, "");
  return { nodes, edges };
}

/** JSON.parse wrapped so callers get a JsonParseError with a readable
 *  message instead of a raw SyntaxError. */
export function safeParseJsonString(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown syntax error.";
    throw new JsonParseError(`Invalid JSON: ${detail}`);
  }
}
