"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildInitialDemoMessages,
  HERO_DEMO_WEEKS_APPROVED,
  HERO_DEMO_WEEKS_INITIAL,
  heroDemoFollowUp,
  type HeroDemoMessage,
  type HeroDemoPhase,
} from "@/lib/hero-ide-demo";

export type HeroIDEDemoState = {
  phase: HeroDemoPhase;
  messages: HeroDemoMessage[];
  weekProgress: number[];
  activeTaskIndex: number;
  isTyping: boolean;
  statusText: string;
  approve: () => void;
  reset: () => void;
};

const INITIAL_WEEKS = [...HERO_DEMO_WEEKS_INITIAL];
const APPROVED_WEEKS = [...HERO_DEMO_WEEKS_APPROVED];

const noopApprove = () => {};

/** Scripted hero demo — Approve plan drives messages, bars, and activity. */
export function useHeroIDEDemo(enabled: boolean): HeroIDEDemoState {
  const [phase, setPhase] = useState<HeroDemoPhase>("idle");
  const [messages, setMessages] = useState<HeroDemoMessage[]>(buildInitialDemoMessages);
  const [weekProgress, setWeekProgress] = useState<number[]>(INITIAL_WEEKS);
  const [activeTaskIndex, setActiveTaskIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const phaseRef = useRef(phase);
  const enabledRef = useRef(enabled);
  phaseRef.current = phase;
  enabledRef.current = enabled;

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setPhase("idle");
    setMessages(buildInitialDemoMessages());
    setWeekProgress(INITIAL_WEEKS);
    setActiveTaskIndex(-1);
    setIsTyping(false);
  }, [clearTimers]);

  const startApproveSequence = useCallback(() => {
    clearTimers();
    setMessages(buildInitialDemoMessages());
    setWeekProgress(INITIAL_WEEKS);
    setActiveTaskIndex(-1);
    setIsTyping(false);
    setPhase("approving");

    schedule(() => {
      setPhase("approved");
      setWeekProgress(APPROVED_WEEKS);
      setActiveTaskIndex(0);
    }, 520);

    schedule(() => setIsTyping(true), 900);

    schedule(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: "agent-2", role: "agent", text: heroDemoFollowUp[0] },
      ]);
    }, 1700);

    schedule(() => setIsTyping(true), 2600);

    schedule(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: "agent-3", role: "agent", text: heroDemoFollowUp[1] },
      ]);
    }, 3400);
  }, [clearTimers, schedule]);

  const approve = useCallback(() => {
    if (!enabledRef.current) return;
    if (phaseRef.current === "approving") return;
    startApproveSequence();
  }, [startApproveSequence]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const statusText =
    phase === "idle"
      ? "Waiting for approval"
      : phase === "approving"
        ? "Reviewing plan…"
        : "Executing Week 1 · 3 tasks in progress";

  if (!enabled) {
    return {
      phase: "idle",
      messages: buildInitialDemoMessages(),
      weekProgress: INITIAL_WEEKS,
      activeTaskIndex: -1,
      isTyping: false,
      statusText: "Waiting for approval",
      approve: noopApprove,
      reset,
    };
  }

  return {
    phase,
    messages,
    weekProgress,
    activeTaskIndex,
    isTyping,
    statusText,
    approve,
    reset,
  };
}
