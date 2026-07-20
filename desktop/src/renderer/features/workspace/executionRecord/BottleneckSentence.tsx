export function BottleneckSentence({ sentence }: { sentence: string }) {
  const arrowIdx = sentence.indexOf("→");
  if (arrowIdx < 0) {
    return (
      <p
        className="shrink-0 px-4 py-3 text-center text-[15px] font-medium leading-snug text-text md:text-[17px]"
        data-testid="bottleneck-sentence"
      >
        {sentence}
      </p>
    );
  }

  const before = sentence.slice(0, arrowIdx).trim();
  const after = sentence.slice(arrowIdx + 1).trim();

  return (
    <p
      className="shrink-0 px-4 py-3 text-center text-[15px] leading-snug md:text-[17px]"
      data-testid="bottleneck-sentence"
    >
      <span className="font-medium text-text">{before}</span>
      <span className="mx-2 text-text-3">→</span>
      <span className="font-semibold text-accent">{after}</span>
    </p>
  );
}
