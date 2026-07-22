export type ExecutionQueueKind = "edit" | "browse";

export interface ExecutionQueueItem {
  id: string;
  kind: ExecutionQueueKind;
  goal: string;
  label: string;
  planTaskId?: string;
  sourceMessageId?: string;
  enqueuedAt: number;
}

export const EXECUTION_QUEUE_MAX = 8;

export function makeQueueItem(
  partial: Omit<ExecutionQueueItem, "id" | "enqueuedAt" | "label"> & { label?: string },
): ExecutionQueueItem {
  const goal = partial.goal.trim();
  return {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    enqueuedAt: Date.now(),
    label: partial.label ?? goal.slice(0, 72),
    ...partial,
    goal,
  };
}

export function enqueueExecution(
  queue: ExecutionQueueItem[],
  item: Omit<ExecutionQueueItem, "id" | "enqueuedAt"> & {
    id?: string;
    label?: string;
    enqueuedAt?: number;
  },
): { queue: ExecutionQueueItem[]; item: ExecutionQueueItem; dropped?: ExecutionQueueItem } {
  const full = item.id
    ? ({ ...makeQueueItem(item), id: item.id, enqueuedAt: item.enqueuedAt ?? Date.now() } as ExecutionQueueItem)
    : makeQueueItem(item);
  let next = [...queue, full];
  let dropped: ExecutionQueueItem | undefined;
  if (next.length > EXECUTION_QUEUE_MAX) {
    dropped = next[0];
    next = next.slice(1);
  }
  return { queue: next, item: full, dropped };
}

export function dequeueExecution(
  queue: ExecutionQueueItem[],
): { head: ExecutionQueueItem | undefined; queue: ExecutionQueueItem[] } {
  if (queue.length === 0) return { head: undefined, queue: [] };
  const [head, ...rest] = queue;
  return { head, queue: rest };
}

export function removeQueuedExecution(
  queue: ExecutionQueueItem[],
  id: string,
): ExecutionQueueItem[] {
  return queue.filter((q) => q.id !== id);
}

export function isQueueFull(queue: ExecutionQueueItem[]): boolean {
  return queue.length >= EXECUTION_QUEUE_MAX;
}

/** True when no edit run or browser task is in flight — safe to dequeue. */
export function canDrainExecutionQueue(input: {
  runStatus?: string;
  browserRunning: boolean;
  kernelActive?: boolean;
}): boolean {
  const activeRun =
    input.runStatus === "running" ||
    input.runStatus === "planning" ||
    input.runStatus === "created";
  if (input.kernelActive) return false;
  return !activeRun && !input.browserRunning;
}
