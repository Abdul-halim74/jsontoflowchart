"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Boxes, Braces, FileJson, List, type LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { JsonNodeData, JsonNodeKind } from "@/lib/json-flow/parser";

const KIND_STYLES: Record<
  JsonNodeKind,
  { border: string; badge: string; icon: LucideIcon }
> = {
  root: {
    border: "border-sky-400/70 dark:border-sky-500/50",
    badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    icon: Braces,
  },
  object: {
    border: "border-violet-400/60 dark:border-violet-500/40",
    badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    icon: Boxes,
  },
  array: {
    border: "border-amber-400/60 dark:border-amber-500/40",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    icon: List,
  },
  leaf: {
    border: "border-emerald-400/60 dark:border-emerald-500/40",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    icon: FileJson,
  },
};

const MAX_TOOLTIP_ROWS = 12;

function JsonFlowNodeImpl({ data, isConnectable, targetPosition, sourcePosition }: NodeProps<JsonNodeData>) {
  const style = KIND_STYLES[data.nodeKind];
  const Icon = style.icon;
  const hasProperties = data.properties.length > 0;

  const card = (
    <div
      className={cn(
        "w-72 rounded-lg border bg-white/95 px-4 py-3.5 shadow-sm backdrop-blur-sm transition-shadow duration-150",
        "hover:shadow-md dark:bg-neutral-900/95",
        style.border,
      )}
    >
      {data.nodeKind !== "root" && (
        <Handle
          type="target"
          position={targetPosition ?? Position.Top}
          isConnectable={isConnectable}
          className="!h-2 !w-2 !border-0 !bg-neutral-400 dark:!bg-neutral-600"
        />
      )}
      <div className="flex items-center gap-3">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", style.badge)}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-neutral-900 dark:text-neutral-100">
            {data.label}
          </p>
          {data.subtitle && (
            <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">{data.subtitle}</p>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={sourcePosition ?? Position.Bottom}
        isConnectable={isConnectable}
        className="!h-2 !w-2 !border-0 !bg-neutral-400 dark:!bg-neutral-600"
      />
    </div>
  );

  if (!hasProperties) return card;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent side="right" align="start" className="max-w-xs">
        <p className="mb-1 truncate text-xs font-semibold text-neutral-300">{data.path || "root"}</p>
        <dl className="space-y-0.5">
          {data.properties.slice(0, MAX_TOOLTIP_ROWS).map((prop) => (
            <div key={prop.key} className="flex gap-2 text-xs">
              <dt className="shrink-0 font-medium text-neutral-400">{prop.key}:</dt>
              <dd className="truncate text-neutral-100">{prop.value}</dd>
            </div>
          ))}
        </dl>
        {data.properties.length > MAX_TOOLTIP_ROWS && (
          <p className="pt-1 text-[11px] text-neutral-500">
            +{data.properties.length - MAX_TOOLTIP_ROWS} more…
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// Memoized: with 100+ nodes on screen, React Flow re-renders the nodes
// array on every pan/zoom tick, so an unmemoized component here means
// every node re-renders on every frame.
export const JsonFlowNode = memo(JsonFlowNodeImpl);
