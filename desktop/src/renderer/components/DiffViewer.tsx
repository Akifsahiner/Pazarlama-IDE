import { motion } from "framer-motion";
import { Check, FileCode2, X } from "lucide-react";
import { diffLineReveal, staggerContainer } from "@renderer/design/animations";
import { CodeHighlight } from "@renderer/components/CodeHighlight";
import { langFromPath } from "@renderer/lib/codeHighlight";

interface DiffViewerProps {
  file: string;
  removed: string[];
  added: string[];
  onApprove?: () => void;
  onReject?: () => void;
  approveLabel?: string;
  approveDisabled?: boolean;
  approveTitle?: string;
  secondaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    title?: string;
  };
}

export function DiffViewer({
  file,
  removed,
  added,
  onApprove,
  onReject,
  approveLabel = "Apply",
  approveDisabled,
  approveTitle,
  secondaryAction,
}: DiffViewerProps) {
  const lang = langFromPath(file);
  const addedSource = added.join("\n");

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-line bg-bg">
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-mini text-text">
          <FileCode2 size={14} className="shrink-0 text-text-3" />
          <span className="truncate font-mono">{file}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
              title={secondaryAction.title}
              className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-micro text-text-2 transition-colors hover:bg-elevated hover:text-text disabled:opacity-40"
            >
              {secondaryAction.label}
            </button>
          )}
          {onReject && (
            <button
              type="button"
              onClick={onReject}
              className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-micro text-text-2 transition-colors hover:bg-elevated hover:text-text"
            >
              <X size={12} /> Reject
            </button>
          )}
          {onApprove && (
            <button
              type="button"
              onClick={onApprove}
              disabled={approveDisabled}
              title={approveTitle}
              className="btn-accent flex items-center gap-1 rounded-md px-2.5 py-1 text-micro disabled:opacity-40"
            >
              <Check size={12} /> {approveLabel}
            </button>
          )}
        </div>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="px-2 py-2 font-mono text-mini leading-relaxed"
      >
        {removed.map((line, i) => (
          <motion.div
            key={`r-${i}`}
            variants={diffLineReveal}
            className="diff-removed flex gap-3 rounded px-3 py-0.5"
          >
            <span className="select-none text-danger/60">-</span>
            <span className="whitespace-pre-wrap text-text">{line}</span>
          </motion.div>
        ))}
        {added.length > 0 && (
          <motion.div variants={diffLineReveal} className="diff-added rounded px-2 py-2">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-ok/80">
              <span className="select-none">+</span>
              Added · {lang}
            </div>
            <CodeHighlight code={addedSource} lang={lang} className="text-[12px] leading-relaxed" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
