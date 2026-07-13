import dagre from "@dagrejs/dagre";
import { Position, type Edge, type Node } from "reactflow";

const NODE_WIDTH = 288;
const NODE_HEIGHT = 84;

export type LayoutDirection = "TB" | "LR";

/**
 * Runs a dagre layered layout over the parsed nodes/edges and returns new
 * nodes with `position` (and handle sides) filled in. Kept separate from
 * the parser so the parser stays a pure "JSON -> graph shape" function and
 * the layout engine can be swapped (e.g. for ELK) without touching it.
 */
export function layoutElements<T extends object>(
  nodes: Node<T>[],
  edges: Edge[],
  direction: LayoutDirection = "TB",
): Node<T>[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: direction,
    nodesep: 32,
    ranksep: 56,
    marginx: 24,
    marginy: 24,
  });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  const isHorizontal = direction === "LR";

  return nodes.map((node) => {
    const { x, y } = graph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: x - NODE_WIDTH / 2,
        y: y - NODE_HEIGHT / 2,
      },
    };
  });
}
