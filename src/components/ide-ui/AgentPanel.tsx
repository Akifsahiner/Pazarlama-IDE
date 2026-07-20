"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { heroAgentCopy } from "@/lib/tokens";
import type { HeroIDEDemoState } from "@/components/ide-ui/useHeroIDEDemo";
import { useHeroDemoContext } from "@/components/ide-ui/HeroDemoContext";
import type { TimelinePreset } from "@/lib/timeline-ide-presets";
import type { IDETheme } from "@/lib/ide-themes";

type AgentPanelProps = {
  theme: IDETheme;
  demo?: HeroIDEDemoState | null;
  preset?: TimelinePreset | null;
  onApprove?: () => void;
};

export function AgentPanel({ theme, demo: demoProp, preset, onApprove }: AgentPanelProps) {
  const heroDemo = useHeroDemoContext();
  const demo = demoProp ?? heroDemo;
  const isGlass = theme.blur !== "0px";
  const approved = demo?.phase === "approved";
  const approving = demo?.phase === "approving";
  const messages =
    preset?.messages ??
    demo?.messages ??
    ([
      { id: "user-1", role: "user" as const, text: heroAgentCopy.command },
      { id: "agent-1", role: "agent" as const, text: heroAgentCopy.response },
    ] as const);

  const handleApprove = () => {
    if (onApprove) {
      onApprove();
      return;
    }
    demo?.approve();
  };

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center gap-1.5">
        <Sparkles className="size-3 text-accent" />
        <span className="text-[10px] font-semibold tracking-widest text-white/60 uppercase">Agent</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overflow-x-hidden pr-0.5">
        <AnimatePresence initial={false}>
          {(messages as Array<{ id: string; role: "user" | "agent"; text: string }>).map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[92%] rounded-xl rounded-br-sm bg-gradient-to-b from-[#1d4ed8] to-[#0b3aa0] px-2.5 py-2 text-[10px] font-medium leading-relaxed text-white shadow-lg"
                  : "max-w-[96%] text-[10px] leading-[1.65] text-white/88"
              }
            >
              {message.text}
            </motion.div>
          ))}
        </AnimatePresence>

        {demo?.isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 px-1 py-1"
            aria-live="polite"
            aria-label="Agent is typing"
          >
            <span className="size-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:0ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:120ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:240ms]" />
          </motion.div>
        )}
      </div>

      {!preset && demo && (
        <div className="relative z-[5] flex flex-col gap-1.5">
          <button
            type="button"
            data-hero-approve
            disabled={approving}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleApprove();
            }}
            className={`relative z-[5] w-full cursor-pointer rounded-lg py-2 text-[10px] font-semibold text-white shadow-md transition-transform touch-manipulation ${
              approved
                ? "bg-gradient-to-b from-[#1f9d57] to-[#157a41]"
                : approving
                  ? "bg-gradient-to-b from-[#3c83f6] to-[#1d4ed8] opacity-80"
                  : "bg-gradient-to-b from-[#3c83f6] to-[#1d4ed8] hero-approve-pulse"
            }`}
          >
            {approved ? "Approved ✓" : approving ? "Approving…" : "Approve plan"}
          </button>
        </div>
      )}

      <div
        className={`rounded-lg px-2.5 py-2 text-[9px] text-white/35 ${
          isGlass ? "border border-white/8 bg-black/25" : "border border-white/10 bg-white/4"
        }`}
      >
        Ask Marketing IDE anything…
      </div>
    </div>
  );
}
