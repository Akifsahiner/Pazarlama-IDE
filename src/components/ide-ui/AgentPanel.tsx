import { Sparkles } from "lucide-react";
import { heroAgentCopy } from "@/lib/tokens";
import type { IDETheme } from "@/lib/ide-themes";

type AgentPanelProps = {
  theme: IDETheme;
};

export function AgentPanel({ theme }: AgentPanelProps) {
  const isGlass = theme.blur !== "0px";

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center gap-1.5">
        <Sparkles className="size-3 text-[#749cff]" />
        <span className="text-[10px] font-semibold tracking-widest text-white/60 uppercase">
          Agent
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-hidden">
        <div className="ml-auto max-w-[92%] rounded-xl rounded-br-sm bg-gradient-to-b from-[#0544a9] to-[#022c70] px-2.5 py-2 text-[10px] font-medium leading-relaxed text-white shadow-lg">
          {heroAgentCopy.command}
        </div>

        <p className="text-[10px] leading-[1.65] text-white/85">
          {heroAgentCopy.response}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          className="w-full rounded-lg bg-gradient-to-b from-[#2f6bf0] to-[#1d4ed8] py-1.5 text-[10px] font-medium text-white shadow-md"
        >
          Approve plan
        </button>
        <button
          type="button"
          className={`w-full rounded-lg py-1.5 text-[10px] font-medium text-white/65 ${
            isGlass
              ? "border border-white/12 bg-black/20"
              : "border border-white/15"
          }`}
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
