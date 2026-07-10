"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { heroAgentCopy } from "@/lib/tokens";
import type { HeroIDEDemoState } from "@/components/ide-ui/useHeroIDEDemo";
import type { IDETheme } from "@/lib/ide-themes";

type AgentPanelProps = {
  theme: IDETheme;
  demo?: HeroIDEDemoState | null;
};

function TypingIndicator({ isGlass }: { isGlass: boolean }) {
  return (
    <div
      className={`flex w-fit gap-1 rounded-xl px-2.5 py-2 ${
        isGlass ? "border border-white/8 bg-black/25" : "border border-white/10 bg-white/5"
      }`}
      aria-label="Agent is typing"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1 rounded-full bg-white/55"
          animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

export function AgentPanel({ theme, demo }: AgentPanelProps) {
  const isGlass = theme.blur !== "0px";
  const interactive = Boolean(demo);
  const approved = demo?.phase === "approved";
  const approving = demo?.phase === "approving";
  const messages =
    demo?.messages ??
    ([
      { id: "user-1", role: "user" as const, text: heroAgentCopy.command },
      { id: "agent-1", role: "agent" as const, text: heroAgentCopy.response },
    ] as const);

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center gap-1.5">
        <Sparkles className="size-3 text-accent" />
        <span className="text-[10px] font-semibold tracking-widest text-white/60 uppercase">
          Agent
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overflow-x-hidden pr-0.5">
        <AnimatePresence initial={false}>
          {(messages as Array<{ id: string; role: "user" | "agent"; text: string }>).map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
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

        <AnimatePresence>
          {demo?.isTyping ? (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              <TypingIndicator isGlass={isGlass} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          disabled={approving}
          onClick={interactive ? demo?.approve : undefined}
          className={`w-full rounded-lg py-1.5 text-[10px] font-semibold text-white shadow-md transition-all duration-300 ${
            approved
              ? "cursor-default bg-gradient-to-b from-[#1f9d57] to-[#157a41]"
              : approving
                ? "cursor-wait bg-gradient-to-b from-[#3c83f6]/80 to-[#1d4ed8]/80"
                : interactive
                  ? "cursor-pointer bg-gradient-to-b from-[#3c83f6] to-[#1d4ed8] hover:brightness-110 active:scale-[0.98]"
                  : "bg-gradient-to-b from-[#3c83f6] to-[#1d4ed8]"
          }`}
        >
          {approved ? (
            <span className="inline-flex items-center justify-center gap-1">
              <Check className="size-3" aria-hidden="true" />
              Approved
            </span>
          ) : approving ? (
            "Approving…"
          ) : (
            "Approve plan"
          )}
        </button>
        <button
          type="button"
          onClick={interactive && approved ? demo?.reset : undefined}
          className={`w-full rounded-lg py-1.5 text-[10px] font-medium text-white/65 transition-colors ${
            isGlass
              ? "border border-white/12 bg-black/20"
              : "border border-white/15"
          } ${interactive && approved ? "cursor-pointer hover:border-white/25 hover:text-white/85" : ""}`}
        >
          Edit
        </button>
      </div>

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
