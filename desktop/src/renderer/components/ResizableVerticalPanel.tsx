import { useCallback, useEffect, useRef, useState } from "react";

interface ResizableVerticalPanelProps {
  storageKey: string;
  defaultHeight: number;
  min?: number;
  max?: number;
  children: React.ReactNode;
}

/** Vertically resizable bottom dock with persisted height. */
export function ResizableVerticalPanel({
  storageKey,
  defaultHeight,
  min = 120,
  max = 360,
  children,
}: ResizableVerticalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [height, setHeight] = useState(() => {
    const saved = Number(localStorage.getItem(storageKey));
    return saved >= min && saved <= max ? saved : defaultHeight;
  });

  const clamp = useCallback((h: number) => Math.min(max, Math.max(min, h)), [min, max]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const next = rect.bottom - e.clientY;
      setHeight(clamp(next));
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
  }, [clamp]);

  useEffect(() => {
    localStorage.setItem(storageKey, String(Math.round(height)));
    document.documentElement.style.setProperty("--execution-feed-h", `${height - 40}px`);
  }, [storageKey, height]);

  const startDrag = () => {
    dragging.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div ref={containerRef} className="relative shrink-0" style={{ height }}>
      <div
        onMouseDown={startDrag}
        onDoubleClick={() => setHeight(defaultHeight)}
        className="group absolute inset-x-0 top-0 z-10 h-1 cursor-row-resize"
      >
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/8 transition-colors group-hover:bg-accent-blue/60" />
      </div>
      <div className="h-full pt-1">{children}</div>
    </div>
  );
}
