import { useState } from "react";
import { ArrowRight, HelpCircle } from "lucide-react";
import { useApp } from "@renderer/state/store";

/** Single brain missing_info question — answer continues the conversation. */
export function InlineQuestionCard({
  questions,
  eventId,
}: {
  questions: string[];
  eventId: string;
}) {
  const sendMessage = useApp((s) => s.sendMessage);
  const markMissingInfoAnswered = useApp((s) => s.markMissingInfoAnswered);
  const [value, setValue] = useState("");
  const question = questions[0];
  if (!question) return null;

  const submit = () => {
    const answer = value.trim();
    if (!answer) return;
    markMissingInfoAnswered(eventId);
    void sendMessage(answer);
    setValue("");
  };

  return (
    <div className="w-full rounded-[var(--radius-lg)] border border-warn/30 bg-warn/[0.06] p-3">
      <div className="mb-1.5 flex items-center gap-2 text-mini text-warn">
        <HelpCircle size={13} />
        Quick answer to go deeper
      </div>
      <p className="text-body-sm font-medium text-text">{question}</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Your answer…"
          className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-line bg-bg px-3 py-1.5 text-body-sm text-text outline-none focus:border-[var(--accent-border)]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          className="btn-accent flex h-7 items-center gap-1 rounded-[var(--radius-md)] px-3 text-mini disabled:opacity-40"
        >
          Continue <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
