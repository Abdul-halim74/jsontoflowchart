"use client";

import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
  getNodesBounds,
  getViewportForBounds,
  useReactFlow,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { AlertCircle, FileImage, FileQuestion, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { JsonFlowNode } from "./CustomNode";
import {
  JsonParseError,
  parseJsonToFlow,
  safeParseJsonString,
  type JsonNodeData,
} from "@/lib/json-flow/parser";
import { layoutElements, type LayoutDirection } from "@/lib/json-flow/layout";
import {
  EXPORT_HEIGHT,
  EXPORT_PADDING,
  EXPORT_WIDTH,
  downloadDiagramImage,
  downloadDiagramPdf,
  type ExportFormat,
} from "@/lib/json-flow/export";

// Defined once, outside the component, so React Flow sees a stable
// reference and doesn't treat it as a change on every render.
const nodeTypes = { jsonNode: JsonFlowNode };

export interface JsonVisualizerProps {
  /** Raw JSON text, or an already-parsed object/array. */
  json: string | Record<string, unknown> | unknown[];
  direction?: LayoutDirection;
  className?: string;
}

interface FlowResult {
  nodes: Node<JsonNodeData>[];
  edges: Edge[];
  error: string | null;
}

function useJsonFlow(json: JsonVisualizerProps["json"], direction: LayoutDirection): FlowResult {
  return useMemo<FlowResult>(() => {
    try {
      const parsedInput = typeof json === "string" ? safeParseJsonString(json) : json;
      const { nodes, edges } = parseJsonToFlow(parsedInput);
      const layoutedNodes = layoutElements<JsonNodeData>(nodes, edges, direction);
      return { nodes: layoutedNodes, edges, error: null };
    } catch (err) {
      const message =
        err instanceof JsonParseError
          ? err.message
          : "Something went wrong while parsing the JSON input.";
      return { nodes: [], edges: [], error: message };
    }
  }, [json, direction]);
}

function EmptyState({ icon: Icon, title, detail, tone }: {
  icon: typeof AlertCircle;
  title: string;
  detail: string;
  tone: "error" | "neutral";
}) {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div
        className={
          tone === "error"
            ? "flex max-w-sm flex-col items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/30"
            : "flex max-w-sm flex-col items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center dark:border-neutral-800 dark:bg-neutral-900/40"
        }
      >
        <Icon
          className={tone === "error" ? "h-6 w-6 text-red-500" : "h-6 w-6 text-neutral-400"}
        />
        <p
          className={
            tone === "error"
              ? "text-sm font-medium text-red-700 dark:text-red-400"
              : "text-sm font-medium text-neutral-600 dark:text-neutral-300"
          }
        >
          {title}
        </p>
        <p
          className={
            tone === "error"
              ? "text-xs text-red-600/80 dark:text-red-400/70"
              : "text-xs text-neutral-500 dark:text-neutral-400"
          }
        >
          {detail}
        </p>
      </div>
    </div>
  );
}

function DownloadPanel({ wrapperRef }: { wrapperRef: React.RefObject<HTMLDivElement> }) {
  const { getNodes } = useReactFlow();
  const [pending, setPending] = useState<ExportFormat | null>(null);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      const viewportEl = wrapperRef.current?.querySelector<HTMLElement>(".react-flow__viewport");
      if (!viewportEl || pending) return;

      setPending(format);
      try {
        const bounds = getNodesBounds(getNodes());
        const viewport = getViewportForBounds(bounds, EXPORT_WIDTH, EXPORT_HEIGHT, 0.1, 2, EXPORT_PADDING);
        if (format === "pdf") {
          await downloadDiagramPdf(viewportEl, viewport, "diagram.pdf");
        } else {
          await downloadDiagramImage(format, viewportEl, viewport, `diagram.${format === "jpeg" ? "jpg" : "png"}`);
        }
      } finally {
        setPending(null);
      }
    },
    [getNodes, pending, wrapperRef],
  );

  return (
    <Panel position="top-right" className="flex gap-1.5">
      {(
        [
          { format: "png" as const, label: "PNG", icon: FileImage },
          { format: "jpeg" as const, label: "JPG", icon: FileImage },
          { format: "pdf" as const, label: "PDF", icon: FileText },
        ]
      ).map(({ format, label, icon: Icon }) => (
        <Button
          key={format}
          type="button"
          variant="outline"
          size="sm"
          disabled={pending !== null}
          onClick={() => handleExport(format)}
          className="gap-1.5 bg-white/90 backdrop-blur-sm dark:bg-neutral-900/90"
        >
          {pending === format ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Icon className="h-3.5 w-3.5" />
          )}
          {label}
        </Button>
      ))}
    </Panel>
  );
}

function JsonVisualizerInner({ json, direction = "TB", className }: JsonVisualizerProps) {
  // Keeps typing responsive: if `json` is wired to a live textarea, the
  // (potentially expensive) parse + dagre layout runs at a lower priority
  // than keystrokes instead of blocking every render.
  const deferredJson = useDeferredValue(json);
  const { nodes, edges, error } = useJsonFlow(deferredJson, direction);
  const wrapperRef = useRef<HTMLDivElement>(null);

  if (error) {
    return (
      <div className={className ?? "h-full w-full"}>
        <EmptyState icon={AlertCircle} title="Could not render diagram" detail={error} tone="error" />
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className={className ?? "h-full w-full"}>
        <EmptyState
          icon={FileQuestion}
          title="Nothing to display yet"
          detail="Paste or generate some JSON to see the diagram."
          tone="neutral"
        />
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={className ?? "h-full w-full"}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        // Skips rendering nodes/edges outside the viewport — the main
        // lever for keeping pan/zoom smooth once the graph passes ~100 nodes.
        onlyRenderVisibleElements
        defaultEdgeOptions={{
          type: "smoothstep",
          // Explicit stroke instead of React Flow's CSS-variable default:
          // html-to-image (used for PNG/JPG/PDF export) clones only the
          // captured subtree, so a color pulled from a `var(--xy-edge-*)`
          // defined higher up the DOM doesn't resolve and the lines vanish.
          style: { stroke: "#94a3b8", strokeWidth: 1.5 },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          className="bg-neutral-50 dark:bg-neutral-950"
        />
        <Controls showInteractive={false} />
        <DownloadPanel wrapperRef={wrapperRef} />
        <MiniMap
          pannable
          zoomable
          nodeColor="#a3a3a3"
          className="!bg-white/80 dark:!bg-neutral-900/80"
        />
      </ReactFlow>
    </div>
  );
}

/**
 * Renders a nested JSON value as an interactive, auto-laid-out flowchart.
 * Wrap your app's root layout with a `TooltipProvider` already, or this
 * component will provide its own — either way, don't nest two.
 */
export function JsonVisualizer(props: JsonVisualizerProps) {
  return (
    <ReactFlowProvider>
      <TooltipProvider delayDuration={150}>
        <JsonVisualizerInner {...props} />
      </TooltipProvider>
    </ReactFlowProvider>
  );
}
