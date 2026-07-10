import { useCallback, useEffect, useRef, useState } from "react";

interface ResizablePanelProps {
  side: "left" | "right";
  storageKey: string;
  defaultWidth: number;
  min?: number;
  max?: number;
  children: React.ReactNode;
}

/** A horizontally resizable panel with a drag handle and persisted width. */
export function ResizablePanel({
  side,
  storageKey,
  defaultWidth,
  min = 200,
  max = 560,
  children,
}: ResizablePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem(storageKey));
    return saved >= min && saved <= max ? saved : defaultWidth;
  });

  const clamp = useCallback((w: number) => Math.min(max, Math.max(min, w)), [min, max]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = side === "left" ? e.clientX - rect.left : rect.right - e.clientX;
      setWidth(clamp(next));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [side, clamp]);

  useEffect(() => {
    localStorage.setItem(storageKey, String(Math.round(width)));
  }, [storageKey, width]);

  const startDrag = () => {
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handle = (
    <div
      onMouseDown={startDrag}
      onDoubleClick={() => setWidth(defaultWidth)}
      className="group relative z-10 w-1 shrink-0 cursor-col-resize"
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/8 transition-colors group-hover:bg-accent-blue/60" />
    </div>
  );

  return (
    <div ref={containerRef} className="flex h-full shrink-0" style={{ width }}>
      {side === "right" && handle}
      <div className="min-w-0 flex-1">{children}</div>
      {side === "left" && handle}
    </div>
  );
}
