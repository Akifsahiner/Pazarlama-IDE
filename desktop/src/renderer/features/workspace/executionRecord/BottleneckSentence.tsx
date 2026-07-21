import { parseBottleneckSentence } from "./executionRecordUi";

/** Slim context strip — supports standalone use (Home) without duplicating hero. */
export function BottleneckSentence({ sentence }: { sentence: string }) {
  const parsed = parseBottleneckSentence(sentence);

  if (!parsed.constraint) {
    return (
      <p
        className="px-4 py-2 text-center text-mini text-text-3"
        data-testid="bottleneck-sentence"
      >
        {sentence}
      </p>
    );
  }

  return (
    <p
      className="px-4 py-2 text-center text-mini leading-relaxed"
      data-testid="bottleneck-sentence"
    >
      <span className="text-text-3">Darboğaz </span>
      <span className="text-text-2">{parsed.constraint}</span>
      {parsed.move && (
        <>
          <span className="mx-1.5 text-text-3">→</span>
          <span className="font-medium text-accent">{parsed.move}</span>
        </>
      )}
    </p>
  );
}
