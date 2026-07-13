"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JsonVisualizer } from "@/components/json-flow/JsonVisualizer";
import { VisitorCounter } from "@/components/VisitorCounter";

const SAMPLE_JSON = `{
  "appName": "EcomPlus",
  "version": "2.1",
  "infrastructure": {
    "webServer": {
      "type": "Nginx",
      "location": "US-East-1",
      "services": [
        { "name": "Frontend API", "endpoints": 25 },
        { "name": "Admin Portal", "microservices": ["UserAuth", "ProductCatalog"] }
      ]
    },
    "databaseCluster": {
      "primary": "PostgreSQL",
      "replicas": 3,
      "backup": "Daily S3"
    }
  }
}`;

const MIN_PANEL_PERCENT = 20;
const MAX_PANEL_PERCENT = 80;

export default function Home() {
  const [draft, setDraft] = useState(SAMPLE_JSON);
  const [committed, setCommitted] = useState(SAMPLE_JSON);
  const [leftWidth, setLeftWidth] = useState(50);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    setLeftWidth(Math.min(MAX_PANEL_PERCENT, Math.max(MIN_PANEL_PERCENT, percent)));
  }, []);

  const stopDragging = useCallback(() => {
    isDragging.current = false;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", stopDragging);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [handlePointerMove]);

  const startDragging = useCallback(() => {
    isDragging.current = true;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [handlePointerMove, stopDragging]);

  useEffect(() => stopDragging, [stopDragging]);

  return (
    <div className="flex h-screen flex-col bg-neutral-100 dark:bg-neutral-950">
      <main
        ref={containerRef}
        style={{ "--left-width": `${leftWidth}%` } as React.CSSProperties}
        className="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:flex-row lg:gap-0"
      >
        <section className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:w-[var(--left-width)]">
          <header className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <h1 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Complex JSON Data Input
            </h1>
          </header>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="flex-1 resize-none bg-transparent p-4 font-mono text-sm text-neutral-800 outline-none dark:text-neutral-200"
          />
          <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
            <Button onClick={() => setCommitted(draft)} className="w-full gap-2">
              <Wand2 className="h-4 w-4" />
              Generate Interactive Diagram
            </Button>
          </div>
        </section>

        <div
          onPointerDown={startDragging}
          className="hidden shrink-0 cursor-col-resize items-center justify-center lg:mx-2 lg:flex lg:w-2"
          role="separator"
          aria-orientation="vertical"
        >
          <div className="h-10 w-1 rounded-full bg-neutral-300 transition-colors hover:bg-neutral-500 dark:bg-neutral-700 dark:hover:bg-neutral-500" />
        </div>

        <section className="flex-1 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <header className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <h1 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Interactive Architecture Diagram
            </h1>
          </header>
          <div className="h-[calc(100%-49px)]">
            <JsonVisualizer json={committed} />
          </div>
        </section>
      </main>
      <VisitorCounter />
    </div>
  );
}
