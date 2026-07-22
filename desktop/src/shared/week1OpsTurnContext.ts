/**
 * Week 1 ops context injected into agent turns — composer steers today's task, not generic chat.
 */
import { getNowTask, type CmoOpsCadence } from "./cmoOpsCadence";
import type { ChannelThesis } from "./cmoIntake";
import type { AgentTurnContext } from "./agentTurnContext";

export interface Week1OpsTurnContext {
  day_index: number;
  task_id: string;
  what: string;
  why: string;
  done_when: string;
  owner: string;
  execution_mode?: string;
  bottleneck?: string;
  thesis_title?: string;
}

export function buildWeek1OpsTurnContext(input: {
  opsCadence?: CmoOpsCadence | null;
  channelThesis?: ChannelThesis | null;
  bottleneck?: string;
}): Week1OpsTurnContext | undefined {
  const cadence = input.opsCadence;
  if (!cadence?.tasks?.length) return undefined;
  const now = getNowTask(cadence);
  if (!now) return undefined;
  return {
    day_index: cadence.day_index,
    task_id: now.id,
    what: now.what,
    why: now.why,
    done_when: now.done_when,
    owner: now.owner,
    execution_mode: now.execution_mode,
    bottleneck: input.bottleneck,
    thesis_title: input.channelThesis?.title,
  };
}

export function mergeWeek1OpsIntoAgentContext(
  base: AgentTurnContext | undefined,
  week1: Week1OpsTurnContext | undefined,
): AgentTurnContext | undefined {
  if (!week1) return base;
  return {
    ...base,
    week1_ops: week1,
  } as AgentTurnContext & { week1_ops: Week1OpsTurnContext };
}

/** Prefill when user sends minimal / empty steer message during Week 1. */
export function buildOpsSteerPrompt(week1: Week1OpsTurnContext): string {
  return [
    `Help me execute today's Week 1 ops task.`,
    `Day ${week1.day_index}: ${week1.what}`,
    `Done when: ${week1.done_when}`,
    week1.execution_mode ? `Mode: ${week1.execution_mode}` : "",
    "Suggest the next concrete step — diff, post kit copy, or proof — grounded in this task only.",
  ]
    .filter(Boolean)
    .join("\n");
}
