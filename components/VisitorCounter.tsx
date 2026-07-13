"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

export function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/visits")
      .then((res) => res.json())
      .then((data: { count: number | null }) => {
        if (!cancelled) setCount(data.count);
      })
      .catch(() => {
        if (!cancelled) setCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className="flex shrink-0 items-center justify-center gap-1.5 py-2 text-xs text-neutral-500 dark:text-neutral-400">
      <Users className="h-3.5 w-3.5" />
      {count === null ? "Total visitors: —" : `Total visitors: ${count.toLocaleString()}`}
    </footer>
  );
}
