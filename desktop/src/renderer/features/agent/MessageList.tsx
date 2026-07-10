import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ClipboardCopy,
  Pencil,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useApp } from "@renderer/state/store";
import { EmptyState } from "@renderer/components/EmptyState";
import type { SessionEvent } from "@renderer/state/session";
import { fabPop, messageEnter, systemCollapse } from "@renderer/design/animations";
import { AgentMarkdown } from "./AgentMarkdown";
import { ContextQueue } from "./ContextQueue";
import { EventRow } from "./cards/EventRow";
import {
  NEAR_BOTTOM_PX,
  TIME_GAP_MS,
  VIRTUAL_THRESHOLD,
  blockKey,
  estimateBlockSize,
  formatRelativeTime,
  formatTime,
  groupThread,
  systemEventLabel,
  type ThreadBlock,
} from "./threadUtils";

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy message"
      title="Copy message"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className={`flex h-5 w-5 items-center justify-center rounded-[4px] text-text-3 opacity-0 transition-opacity hover:bg-elevated hover:text-text focus-visible:opacity-100 group-hover/msg:opacity-100 ${className ?? ""}`}
    >
      {copied ? <Check size={11} className="text-ok" /> : <ClipboardCopy size={11} />}
    </button>
  );
}

function EditButton({ eventId, className }: { eventId: string; className?: string }) {
  const startEditMessage = useApp((s) => s.startEditMessage);
  const streaming = useApp((s) => s.agentStreaming);
  const connected = useApp((s) => s.connection.state === "connected");
  return (
    <button
      type="button"
      aria-label="Edit message"
      title="Edit message"
      disabled={!connected || streaming}
      onClick={() => startEditMessage(eventId)}
      className={`flex h-5 w-5 items-center justify-center rounded-[4px] text-text-3 opacity-0 transition-opacity hover:bg-elevated hover:text-text focus-visible:opacity-100 group-hover/msg:opacity-100 disabled:opacity-30 ${className ?? ""}`}
    >
      <Pencil size={11} />
    </button>
  );
}

function RetryButton({ text, className }: { text: string; className?: string }) {
  const sendMessage = useApp((s) => s.sendMessage);
  const streaming = useApp((s) => s.agentStreaming);
  const connected = useApp((s) => s.connection.state === "connected");
  return (
    <button
      type="button"
      aria-label="Retry message"
      title="Retry message"
      disabled={!connected || streaming}
      onClick={() => void sendMessage(text)}
      className={`flex h-5 w-5 items-center justify-center rounded-[4px] text-text-3 opacity-0 transition-opacity hover:bg-elevated hover:text-text focus-visible:opacity-100 group-hover/msg:opacity-100 disabled:opacity-30 ${className ?? ""}`}
    >
      <RotateCcw size={11} />
    </button>
  );
}

function RunLinkChip({ runId }: { runId: string }) {
  const openRunReplay = useApp((s) => s.openRunReplay);
  const setActiveCanvas = useApp((s) => s.setActiveCanvas);
  const short = runId.length > 10 ? runId.slice(-8) : runId;
  return (
    <button
      type="button"
      onClick={() => {
        setActiveCanvas("run");
        void openRunReplay(runId);
      }}
      className="mt-1 inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft/30 px-2 py-0.5 text-micro text-accent transition-colors hover:bg-accent-soft"
      data-testid="message-run-link"
    >
      <ArrowRight size={10} /> Run #{short}
    </button>
  );
}

function TextBubble({
  event,
  streaming,
  showRetry,
  showEdit,
  animateEnter,
}: {
  event: SessionEvent;
  streaming: boolean;
  showRetry?: boolean;
  showEdit?: boolean;
  animateEnter?: boolean;
}) {
  const reducedMotion = useApp((s) => s.settings.reducedMotion);

  const bubble =
    event.role === "user" ? (
      <div className="group/msg ml-auto flex max-w-[88%] flex-col items-end gap-1">
        <div className="flex items-start gap-1">
          {showEdit ? <EditButton eventId={event.id} className="mt-1.5" /> : null}
          {showRetry && event.text ? <RetryButton text={event.text} className="mt-1.5" /> : null}
          <CopyButton text={event.text ?? ""} className="mt-1.5" />
          <div
            title={formatTime(event.ts)}
            className="rounded-[var(--radius-md)] rounded-br-[4px] bg-accent-soft px-3 py-2 text-body-sm leading-relaxed text-text"
          >
            {event.text}
          </div>
        </div>
        {event.linkedRunId && <RunLinkChip runId={event.linkedRunId} />}
      </div>
    ) : event.role === "system" ? (
      <div className="text-micro italic text-text-3">{event.text}</div>
    ) : !event.text && streaming ? null : (
      <div className="group/msg relative" title={formatTime(event.ts)}>
        <AgentMarkdown content={event.text ?? ""} streaming={streaming} />
        {!streaming && event.text && (
          <div className="absolute -right-1 top-0">
            <CopyButton text={event.text} />
          </div>
        )}
      </div>
    );

  if (!bubble) return null;
  if (!animateEnter || reducedMotion) return bubble;

  return (
    <motion.div variants={messageEnter} initial="hidden" animate="visible">
      {bubble}
    </motion.div>
  );
}

function SystemBlock({
  events,
  streaming,
  forceExpanded,
}: {
  events: SessionEvent[];
  streaming: boolean;
  forceExpanded?: boolean;
}) {
  const reducedMotion = useApp((s) => s.settings.reducedMotion);
  const collapsible = !streaming && !forceExpanded && events.length > 1;
  const [expanded, setExpanded] = useState(!collapsible);

  useEffect(() => {
    if (streaming || forceExpanded) setExpanded(true);
    else if (collapsible) setExpanded(false);
  }, [streaming, forceExpanded, collapsible]);

  const lastLabel = systemEventLabel(events[events.length - 1]!);
  const headerLabel = `${events.length} steps`;
  const headerSubtitle = lastLabel;

  if (!collapsible) {
    return (
      <div className="space-y-1 rounded-[var(--radius-sm)] border border-line/50 bg-surface/30 px-3 py-2">
        {events.map((event) => (
          <EventRow key={event.id} event={event} streaming={streaming} />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-sm)] border border-line/50 bg-surface/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-micro text-text-2"
      >
        <span className="truncate">
          {headerLabel} · {headerSubtitle}
        </span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={reducedMotion ? { duration: 0 } : undefined}
          className="shrink-0 text-text-3"
        >
          ▾
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="system-body"
            initial={reducedMotion ? false : systemCollapse.initial}
            animate={reducedMotion ? undefined : systemCollapse.animate}
            exit={reducedMotion ? undefined : systemCollapse.exit}
            className="overflow-hidden"
          >
            <div className="space-y-1 border-t border-line/40 px-3 py-2">
              {events.map((event) => (
                <EventRow key={event.id} event={event} streaming={false} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TurnBlock({
  block,
  streaming,
  lastUserTextId,
}: {
  block: Extract<ThreadBlock, { type: "turn" }>;
  streaming: boolean;
  lastUserTextId?: string;
}) {
  return (
    <div className={`space-y-2 ${block.role === "user" ? "items-end" : ""}`}>
      <div
        className={`flex items-center gap-2 text-micro text-text-3 ${block.role === "user" ? "justify-end" : ""}`}
      >
        <span>{block.role === "user" ? "You" : "Agent"}</span>
        <span aria-hidden>·</span>
        <time dateTime={new Date(block.ts).toISOString()}>{formatRelativeTime(block.ts)}</time>
      </div>
      {block.events.map((event, i) => {
        const isLastInBlock = i === block.events.length - 1;
        const isStreaming = streaming && isLastInBlock && block.role === "agent";
        return (
          <TextBubble
            key={event.id}
            event={event}
            streaming={isStreaming}
            showRetry={block.role === "user" && event.id === lastUserTextId}
            showEdit={block.role === "user" && event.id === lastUserTextId}
            animateEnter={block.role === "agent" && isLastInBlock}
          />
        );
      })}
    </div>
  );
}

function ThreadBlockRow({
  block,
  index,
  blocks,
  streaming,
  lastUserTextId,
}: {
  block: ThreadBlock;
  index: number;
  blocks: ThreadBlock[];
  streaming: boolean;
  lastUserTextId?: string;
}) {
  const blockTs = block.type === "single" ? block.event.ts : block.ts;
  const prev = index > 0 ? blocks[index - 1] : null;
  const prevTs = prev ? (prev.type === "single" ? prev.event.ts : prev.ts) : null;
  const showTimeDivider = prevTs != null && blockTs - prevTs > TIME_GAP_MS;
  const isLast = index === blocks.length - 1;

  return (
    <div className="flex flex-col pb-3">
      {showTimeDivider && (
        <div className="my-2 flex items-center gap-2" aria-hidden>
          <span className="h-px flex-1 bg-line/60" />
          <span className="text-micro text-text-3">{formatTime(blockTs)}</span>
          <span className="h-px flex-1 bg-line/60" />
        </div>
      )}
      {block.type === "turn" ? (
        <TurnBlock
          block={block}
          streaming={streaming && isLast}
          lastUserTextId={lastUserTextId}
        />
      ) : block.type === "system" ? (
        <SystemBlock
          events={block.events}
          streaming={streaming && isLast}
          forceExpanded={streaming && isLast}
        />
      ) : (
        <EventRow event={block.event} streaming={streaming && isLast} />
      )}
    </div>
  );
}

export function MessageList() {
  const thread = useApp((s) => s.thread);
  const streaming = useApp((s) => s.agentStreaming);
  const connected = useApp((s) => s.connection.state === "connected");
  const activeSessionId = useApp((s) => s.activeSessionId);
  const reducedMotion = useApp((s) => s.settings.reducedMotion);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);
  const pinnedRef = useRef(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevBlockCountRef = useRef(0);

  const blocks = useMemo(() => groupThread(thread), [thread]);
  const useVirtual = blocks.length > VIRTUAL_THRESHOLD;

  const lastUserTextId = useMemo(() => {
    for (let i = thread.length - 1; i >= 0; i -= 1) {
      const e = thread[i];
      if (e.kind === "text" && e.role === "user" && e.text?.trim()) return e.id;
    }
    return undefined;
  }, [thread]);

  const virtualizer = useVirtualizer({
    count: blocks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => estimateBlockSize(blocks[index]!),
    overscan: 6,
    enabled: useVirtual,
  });

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    pinnedRef.current = nearBottom;
    setPinned(nearBottom);
    if (nearBottom) setUnreadCount(0);
  }, []);

  useEffect(() => {
    pinnedRef.current = true;
    setPinned(true);
    setUnreadCount(0);
    prevBlockCountRef.current = 0;
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeSessionId]);

  useEffect(() => {
    if (pinnedRef.current) {
      prevBlockCountRef.current = blocks.length;
      setUnreadCount(0);
    } else if (blocks.length > prevBlockCountRef.current) {
      setUnreadCount((c) => c + (blocks.length - prevBlockCountRef.current));
      prevBlockCountRef.current = blocks.length;
    }
  }, [blocks.length]);

  useEffect(() => {
    if (!pinnedRef.current) return;
    const scroll = () => {
      if (useVirtual && blocks.length > 0) {
        virtualizer.scrollToIndex(blocks.length - 1, { align: "end" });
      } else {
        endRef.current?.scrollIntoView({ block: "end" });
      }
    };
    if (streaming) {
      const id = requestAnimationFrame(scroll);
      return () => cancelAnimationFrame(id);
    }
    scroll();
    // virtualizer identity changes each render; blocks.length/thread drive scroll targets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread, streaming, useVirtual, blocks.length]);

  const scrollToBottom = () => {
    if (useVirtual) {
      virtualizer.scrollToIndex(blocks.length - 1, { align: "end", behavior: reducedMotion ? "auto" : "smooth" });
    } else {
      endRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "end" });
    }
    pinnedRef.current = true;
    setPinned(true);
    setUnreadCount(0);
  };

  if (thread.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-4">
        <EmptyState
          icon={Sparkles}
          title="Start a session"
          description={
            connected
              ? "Steer strategy, tone, and approvals here — work surfaces and the execution feed show what happens."
              : "Connect a backend to start working with the agent."
          }
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto px-4 py-4">
        <ContextQueue />
        {useVirtual ? (
          <div
            style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}
          >
            {virtualizer.getVirtualItems().map((item) => {
              const block = blocks[item.index]!;
              return (
                <div
                  key={blockKey(block, item.index)}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${item.start}px)`,
                  }}
                >
                  <ThreadBlockRow
                    block={block}
                    index={item.index}
                    blocks={blocks}
                    streaming={streaming}
                    lastUserTextId={lastUserTextId}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            {blocks.map((block, i) => (
              <ThreadBlockRow
                key={blockKey(block, i)}
                block={block}
                index={i}
                blocks={blocks}
                streaming={streaming}
                lastUserTextId={lastUserTextId}
              />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <AnimatePresence>
        {!pinned && (
          <motion.button
            type="button"
            onClick={scrollToBottom}
            aria-label={unreadCount > 0 ? `${unreadCount} new messages — scroll to latest` : "Scroll to latest"}
            variants={reducedMotion ? undefined : fabPop}
            initial={reducedMotion ? false : "hidden"}
            animate={reducedMotion ? undefined : "visible"}
            exit={reducedMotion ? undefined : { opacity: 0, scale: 0.85 }}
            className="absolute bottom-3 left-1/2 z-10 flex h-8 min-w-8 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-elevated px-2 text-text-2 shadow-[var(--shadow-2)] transition-colors hover:text-text"
          >
            <ArrowDown size={15} />
            {unreadCount > 0 && (
              <span className="ml-1 rounded-full bg-accent px-1.5 text-micro font-medium text-on-accent">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
