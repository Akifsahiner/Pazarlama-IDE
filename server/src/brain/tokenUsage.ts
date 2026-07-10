/** Accumulates Anthropic token counts across a single agent turn. */
export interface TokenUsageSink {
  input: number;
  output: number;
}

export function addMessageUsage(
  sink: TokenUsageSink | undefined,
  msg: { usage?: { input_tokens?: number; output_tokens?: number } },
): void {
  if (!sink || !msg.usage) return;
  sink.input += msg.usage.input_tokens ?? 0;
  sink.output += msg.usage.output_tokens ?? 0;
}
