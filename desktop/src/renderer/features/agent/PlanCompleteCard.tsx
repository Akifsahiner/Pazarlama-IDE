import { PartyPopper } from "lucide-react";
import { motion } from "framer-motion";
import { milestonePop } from "@renderer/design/animations";
import { useApp } from "@renderer/state/store";

/** In-thread celebration when the full launch plan reaches terminal state. */
export function PlanCompleteCard() {
  const navigate = useApp((s) => s.navigate);
  const setActiveCanvas = useApp((s) => s.setActiveCanvas);
  const reducedMotion = useApp((s) => s.settings.reducedMotion);

  const openReport = () => {
    setActiveCanvas("campaign-plan");
    navigate("workspace");
    requestAnimationFrame(() => {
      document.getElementById("session-launch-report")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <motion.div
      variants={reducedMotion ? undefined : milestonePop}
      initial={reducedMotion ? false : "hidden"}
      animate={reducedMotion ? undefined : "visible"}
      className="max-w-[96%] rounded-[var(--radius-lg)] border border-ok-border bg-ok-soft p-4"
    >
      <div className="flex items-center gap-2 text-body-sm font-semibold text-text">
        <PartyPopper size={16} className="text-ok" /> Launch plan complete
      </div>
      <p className="mt-1 text-body-sm text-text-2">
        Every task across your playbooks is done. Review the session report and decide what to
        measure next.
      </p>
      <button
        type="button"
        onClick={openReport}
        className="btn-accent mt-3 rounded-[var(--radius-sm)] px-3 py-1.5 text-mini"
      >
        View launch report
      </button>
    </motion.div>
  );
}
