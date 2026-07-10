/** Split streaming content when an unclosed ``` fence is at the tail. */
export function splitStreamingMarkdown(content: string): {
  markdown: string;
  streamingFence: string | null;
} {
  const lines = content.split("\n");
  let fenceCount = 0;
  for (const line of lines) {
    if (line.trimStart().startsWith("```")) fenceCount += 1;
  }
  if (fenceCount % 2 === 0) return { markdown: content, streamingFence: null };

  let lastFence = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trimStart().startsWith("```")) {
      lastFence = i;
      break;
    }
  }
  if (lastFence <= 0) return { markdown: "", streamingFence: content };

  return {
    markdown: lines.slice(0, lastFence).join("\n"),
    streamingFence: lines.slice(lastFence).join("\n"),
  };
}
