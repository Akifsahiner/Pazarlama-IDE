import { motion } from "framer-motion";
import { ArrowRight, Eye, FileDiff, Search } from "lucide-react";
import { Button } from "@renderer/components/ui/Button";
import { staggerItem, staggerList } from "@renderer/design/animations";
import { FIRST_HOUR_MILESTONES, FIRST_TEN_MINUTES } from "@shared/firstHour";

const VALUE_PROPS = [
  { icon: FileDiff, text: "Edits your site as reviewable diffs" },
  { icon: Eye, text: "Verifies in a real browser, live" },
  { icon: Search, text: "Researches leads and drafts outreach — you send" },
];

/**
 * First-launch brand moment. Renders inside the onboarding stage (the stage
 * owns the logo + progress rail), so typography stays on one scale.
 */
export function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center text-center">
      <div className="text-caption uppercase tracking-[0.14em]">Claude for Marketing &amp; Sales</div>
      <h1 className="mt-3 max-w-[16ch] text-display text-text">
        It does the work. You stay in command.
      </h1>
      <p className="mt-4 max-w-[48ch] text-body text-text-2">
        Built your product in Cursor. Run professional GTM from the same folder — edits, browser
        research, and launch playbooks without re-uploading your repo.
      </p>

      <motion.div
        className="mt-8 flex flex-col gap-2.5"
        variants={staggerList}
        initial="hidden"
        animate="visible"
      >
        {VALUE_PROPS.map((v) => (
          <motion.div
            key={v.text}
            variants={staggerItem}
            className="flex items-center gap-3 text-body text-text-2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent">
              <v.icon size={16} />
            </span>
            {v.text}
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-8 w-full max-w-md rounded-[var(--radius-md)] border border-line bg-surface-2/80 px-4 py-3 text-left">
        <div className="mb-2 text-micro font-semibold uppercase tracking-wider text-text-3">
          Your first hour
        </div>
        <ol className="space-y-2">
          {FIRST_TEN_MINUTES.map((row) => (
            <li key={row.step} className="flex gap-3 text-body-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-micro font-semibold text-accent">
                {row.step}
              </span>
              <span>
                <span className="font-medium text-text">{row.label}</span>
                <span className="text-text-2"> — {row.detail}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-3 border-t border-line pt-3">
          <div className="mb-2 text-micro font-semibold uppercase tracking-wider text-text-3">
            Minutes 10–60
          </div>
          <ol className="space-y-2">
            {FIRST_HOUR_MILESTONES.map((row) => (
              <li key={row.label} className="flex gap-3 text-body-sm">
                <span className="w-14 shrink-0 text-micro font-medium tabular-nums text-text-3">
                  {row.minutes}
                </span>
                <span>
                  <span className="font-medium text-text">{row.label}</span>
                  <span className="text-text-2"> — {row.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <motion.div
        className="mt-9 flex flex-col items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.4 } }}
      >
        <Button variant="primary" iconRight={<ArrowRight size={15} />} onClick={onStart}>
          Get started
        </Button>
        <p className="max-w-[36ch] text-micro text-text-3">
          After your first scan, open <span className="text-text-2">Help</span> in the left rail for the
          full 30-day playbook.
        </p>
      </motion.div>
    </div>
  );
}
