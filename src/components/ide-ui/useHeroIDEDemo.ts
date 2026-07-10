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

export function useHeroIDEDemo(enabled: boolean): HeroIDEDemoState | null {
  const [phase, setPhase] = useState<HeroDemoPhase>("idle");
  const [messages, setMessages] = useState<HeroDemoMessage[]>(buildInitialDemoMessages);
  const [weekProgress, setWeekProgress] = useState<number[]>(INITIAL_WEEKS);
  const [activeTaskIndex, setActiveTaskIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

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
    if (!enabled || phaseRef.current === "approving") return;
    startApproveSequence();
  }, [enabled, startApproveSequence]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  if (!enabled) return null;

  const statusText =
    phase === "idle"
      ? "Waiting for approval"
      : phase === "approving"
        ? "Reviewing plan…"
        : "Executing Week 1 · 3 tasks in progress";

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
};
