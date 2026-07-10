import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, FileSearch, Loader2 } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { ProgressBar } from "@renderer/components/ui/ProgressBar";
import { sceneReveal, spring } from "@renderer/design/animations";

interface LogLine {
  id: number;
  text: string;
}

const MAX_LINES = 8;

/**
 * Full-screen live discovery scene shown while a project scan runs — the
 * first WOW moment. Streams real `scanProgress` messages as a discovery log.
 */
export function ScanTheater({ fullScreen }: { fullScreen?: boolean }) {
  const scanProgress = useApp((s) => s.scanProgress);
  const [lines, setLines] = useState<LogLine[]>([]);
  const nextId = useRef(1);
  const lastMessage = useRef<string | null>(null);

  useEffect(() => {
    const msg = scanProgress?.message;
    if (!msg || msg === lastMessage.current) return;
    lastMessage.current = msg;
    setLines((prev) => [...prev.slice(-(MAX_LINES - 1)), { id: nextId.current++, text: msg }]);
  }, [scanProgress]);

  const pct = scanProgress?.pct;

  const shell = fullScreen
    ? "relative flex min-h-full w-full flex-col items-center justify-center px-8 py-12"
    : "flex w-full max-w-md flex-col items-center text-center";

  return (
    <motion.div
      className={shell}
      variants={sceneReveal}
      initial="hidden"
      animate="visible"
      role="status"
      aria-live="polite"
      aria-label="Scanning project"
    >
      <motion.span
        className="mb-8 flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] bg-accent-soft text-accent shadow-[var(--shadow-2)]"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <FileSearch size={28} />
      </motion.span>

      <h2 className="text-h1 font-serif tracking-[-0.01em] text-text">Reading your product…</h2>
      <p className="mt-2 max-w-md text-center text-body-sm text-text-2">
        Scanning routes, stack, analytics, and README so the agent knows what it&apos;s marketing.
      </p>

      <div className="mt-8 w-full max-w-lg">
        {pct != null ? <ProgressBar value={pct / 100} /> : <ProgressBar indeterminate />}
      </div>

      <div className="mt-8 w-full max-w-lg space-y-2 text-left">
        <AnimatePresence initial={false}>
          {lines.map((line, i) => {
            const isLast = i === lines.length - 1;
            return (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: isLast ? 1 : 0.55, y: 0, transition: spring }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-line/60 bg-surface/40 px-3 py-2 text-body-sm text-text-2"
              >
                {isLast ? (
                  <Loader2 size={14} className="shrink-0 animate-spin text-accent" />
                ) : (
                  <Check size={14} className="shrink-0 text-ok" />
                )}
                <span className="min-w-0 flex-1">{line.text}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
