import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  Compass,
  Globe,
  Loader2,
  Mail,
  MessageSquare,
  PenLine,
  Rocket,
  Search,
  Sparkles,
  Square,
  Target,
  Wand2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { resolveIntent } from "@shared/conversationIntent";
import { normalizePlan } from "@shared/planPlaybooks";
import { useApp } from "@renderer/state/store";
import { Segmented } from "@renderer/components/ui/Segmented";
import { Menu } from "@renderer/components/ui/Menu";
import {
  COMPOSER_HINTS,
  COMPOSER_PLACEHOLDERS,
  COMPOSER_QUICK_UI,
  QUICK_ACTION_GOALS,
  isQuickActionDisabled,
  resolveQuickAction,
  type ComposerMode,
  type QuickActionId,
} from "@shared/quickActions";
import { ConnectGate } from "./ConnectGate";
import { IntentPreviewChip } from "./IntentPreviewChip";

const MODE_OPTIONS: { value: ComposerMode; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "ask", label: "Ask" },
  { value: "edit", label: "Edit project" },
  { value: "browse", label: "Browse web" },
];

const MODE_BY_DIGIT: Record<string, ComposerMode> = {
  "0": "auto",
  "1": "ask",
  "2": "edit",
  "3": "browse",
};

const QUICK_ICONS: Record<string, LucideIcon> = {
  Wand2,
  PenLine,
  Rocket,
  Search,
  Compass,
  Target,
  Mail,
};

const MODE_ICON: Record<ComposerMode, LucideIcon> = {
  auto: Sparkles,
  ask: MessageSquare,
  edit: Rocket,
  browse: Globe,
};

export function Composer() {
  const submitComposerText = useApp((s) => s.submitComposerText);
  const interruptRun = useApp((s) => s.interruptRun);
  const cancelPlan = useApp((s) => s.cancelPlan);
  const cancelAgent = useApp((s) => s.cancelAgent);
  const stopBrowser = useApp((s) => s.stopBrowser);
  const streaming = useApp((s) => s.agentStreaming);
  const planLoading = useApp((s) => s.planLoading);
  const browserRunning = useApp((s) => s.browser.running);
  const run = useApp((s) => s.run);
  const plan = useApp((s) => s.plan);
  const planProgress = useApp((s) => s.planProgress);
  const activePlanTaskId = useApp((s) => s.activePlanTaskId);
  const project = useApp((s) => s.project);
  const runtime = useApp((s) => s.runtime);
  const openConnectFlow = useApp((s) => s.openConnectFlow);
  const connected = runtime === "connected";
  const composerMode = useApp((s) => s.composerMode);
  const composerDraft = useApp((s) => s.composerDraft);
  const composerFocusTick = useApp((s) => s.composerFocusTick);
  const editingMessageId = useApp((s) => s.editingMessageId);
  const setComposerMode = useApp((s) => s.setComposerMode);
  const setComposerDraft = useApp((s) => s.setComposerDraft);
  const launchComposerAction = useApp((s) => s.launchComposerAction);
  const runQuickAction = useApp((s) => s.runQuickAction);
  const editUserMessage = useApp((s) => s.editUserMessage);
  const cancelEditMessage = useApp((s) => s.cancelEditMessage);

  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasFolder = project?.source.kind === "folder";
  const runActive =
    run?.status === "running" || run?.status === "planning" || run?.status === "created";
  const busy = streaming || browserRunning || planLoading || runActive;
  const canSend = !!text.trim() && !busy && connected;

  const autoResolved = useMemo(() => {
    if (composerMode !== "auto" || !text.trim()) return null;
    const suite = plan ? normalizePlan(plan) : null;
    return resolveIntent({
      message: text.trim(),
      plan: suite,
      planProgress,
      activeRunId: run?.runId,
      planTaskId: activePlanTaskId,
    });
  }, [composerMode, text, plan, planProgress, run?.runId, activePlanTaskId]);

  const quickDisabled = (id: QuickActionId | "plan_pill") => {
    if (id === "plan_pill") {
      if (!connected) return "Connect a backend to generate a plan.";
      if (!project) return "Open a project first.";
      if (planLoading) return "Plan generation in progress.";
      return null;
    }
    return isQuickActionDisabled(resolveQuickAction(id), { connected, hasFolder });
  };

  const primaryActions = COMPOSER_QUICK_UI.filter((a) => a.tier === "primary");
  const moreActions = COMPOSER_QUICK_UI.filter((a) => a.tier === "more");

  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };
  useEffect(autoGrow, [text]);

  useEffect(() => {
    if (composerDraft) setText(composerDraft);
  }, [composerDraft, composerFocusTick]);

  useEffect(() => {
    if (composerFocusTick > 0) {
      textareaRef.current?.focus();
    }
  }, [composerFocusTick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const mode = MODE_BY_DIGIT[e.key];
      if (mode) {
        e.preventDefault();
        setComposerMode(mode);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setComposerMode]);

  const submit = () => {
    const value = text.trim();
    if (!value || busy || !connected) return;
    if (editingMessageId) {
      void editUserMessage(editingMessageId, value);
    } else {
      void submitComposerText(value);
    }
    setText("");
    setComposerDraft("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && editingMessageId) {
      e.preventDefault();
      cancelEditMessage();
      setText("");
      return;
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submit();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const stop = () => {
    if (planLoading) cancelPlan();
    else if (streaming) cancelAgent();
    else if (browserRunning) stopBrowser();
    else if (runActive) interruptRun();
  };

  const runPrimary = (id: QuickActionId | "plan_pill") => {
    const blocked = quickDisabled(id);
    if (blocked) {
      if (id === "plan_pill") runQuickAction("plan");
      else if (id === "landing_copy") runQuickAction("landing_copy");
      else runQuickAction(id);
      return;
    }
    if (id === "plan_pill") {
      runQuickAction("plan");
      return;
    }
    if (id === "landing_copy") {
      launchComposerAction({ mode: "auto", draft: QUICK_ACTION_GOALS.LANDING_COPY });
      return;
    }
    runQuickAction(id);
  };

  const hint =
    composerMode === "edit" && !hasFolder
      ? `${COMPOSER_HINTS.edit} Open a local folder to edit files.`
      : COMPOSER_HINTS[composerMode];

  const placeholder = COMPOSER_PLACEHOLDERS[composerMode][connected ? "connected" : "offline"];
  const landingDraftActive = text === QUICK_ACTION_GOALS.LANDING_COPY;
  const ModeIcon = MODE_ICON[composerMode];

  const connectFeature =
    composerMode === "browse" ? "browser" : composerMode === "edit" ? "run" : "chat";

  return (
    <div className="border-t border-line">
      {editingMessageId && (
        <div className="flex items-center justify-between gap-2 border-b border-accent/20 bg-accent-soft/20 px-3 py-1.5">
          <p className="text-micro text-text-2">
            Editing message — Send to replace from here.
          </p>
          <button
            type="button"
            onClick={() => {
              cancelEditMessage();
              setText("");
            }}
            className="flex items-center gap-1 text-micro text-text-3 hover:text-text"
            aria-label="Cancel edit"
          >
            <X size={12} /> Cancel
          </button>
        </div>
      )}

      <div className="p-3">
        {runtime !== "connected" && (
          <div className="mb-3">
            <ConnectGate
              feature={connectFeature}
              capability={runtime}
              onConnect={openConnectFlow}
              compact
            />
          </div>
        )}
        <Segmented
          options={MODE_OPTIONS}
          value={composerMode}
          onChange={setComposerMode}
          className="mb-2 w-full justify-stretch [&>button]:flex-1 [&>button]:text-micro"
        />
        <p id="composer-mode-hint" className="mb-1 text-mini leading-snug text-text-2">
          {hint}
        </p>
        <p className="mb-2 text-micro text-text-3">
          Ctrl+0 Auto · Ctrl+1 Ask · Ctrl+2 Edit · Ctrl+3 Browse
        </p>

        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {primaryActions.map((action) => {
            const Icon = QUICK_ICONS[action.icon] ?? Wand2;
            const blocked = quickDisabled(action.id);
            const isLanding = action.id === "landing_copy";
            const active =
              isLanding &&
              (composerMode === "ask" || composerMode === "auto") &&
              landingDraftActive;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => runPrimary(action.id)}
                disabled={!!blocked}
                title={blocked ?? undefined}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-micro transition-colors disabled:opacity-40 ${
                  active
                    ? "border-accent/40 bg-accent-soft text-accent"
                    : "border-line bg-surface-2 text-text-2 hover:bg-elevated hover:text-text"
                }`}
              >
                <Icon size={12} /> {action.label}
              </button>
            );
          })}

          <Menu
            side="top"
            align="left"
            items={moreActions.map((a) => {
              const Icon = QUICK_ICONS[a.icon] ?? Search;
              const blocked = quickDisabled(a.id);
              return {
                id: a.id,
                label: a.label,
                icon: <Icon size={13} />,
                disabled: !!blocked,
                title: blocked ?? undefined,
                onSelect: () => {
                  if (blocked) {
                    if (a.id === "plan_pill") runQuickAction("plan");
                    else runQuickAction(a.id);
                    return;
                  }
                  if (a.id !== "plan_pill") runQuickAction(a.id);
                },
              };
            })}
            trigger={({ toggle }) => (
              <button
                type="button"
                onClick={toggle}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-micro text-text-2 transition-colors hover:bg-elevated hover:text-text"
              >
                More <ChevronDown size={11} />
              </button>
            )}
          />

          {(planLoading || streaming || browserRunning || runActive) && (
            <button
              onClick={stop}
              className="inline-flex items-center gap-1.5 rounded-full border border-danger-border bg-danger-soft px-2.5 py-1 text-micro text-danger"
            >
              <Square size={11} fill="currentColor" /> Stop
            </button>
          )}
        </div>

        {composerMode === "auto" && autoResolved && autoResolved.intent.kind !== "ask_only" && (
          <IntentPreviewChip resolved={autoResolved} message={text.trim()} />
        )}

        <div className="flex items-end gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 focus-within:border-accent/50">
          <span className="pb-1 text-text-3" aria-hidden>
            <ModeIcon size={14} />
          </span>
          <textarea
            id="agent-composer"
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={placeholder}
            aria-describedby="composer-mode-hint"
            className="max-h-40 flex-1 resize-none bg-transparent text-body-sm leading-relaxed text-text outline-none placeholder:text-text-3"
          />
          <button
            onClick={submit}
            disabled={!canSend}
            aria-label="Send"
            title={
              !connected
                ? "Connect a backend to send messages"
                : editingMessageId
                  ? "Send edited message"
                  : composerMode === "auto"
                    ? "Send — Auto picks the right action"
                    : "Send (Enter)"
            }
            className="btn-accent flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] disabled:opacity-40"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
