export function ExecutionRecordField({
  label,
  value,
  emptyLabel,
  emphasis,
  quote,
}: {
  label: string;
  value?: string | null;
  emptyLabel?: string;
  emphasis?: boolean;
  quote?: boolean;
}) {
  const display = value?.trim() || emptyLabel;
  const isEmpty = !value?.trim();

  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-3">{label}</div>
      {quote && !isEmpty ? (
        <blockquote className="mt-1 border-l-2 border-accent/40 pl-3 text-body-sm italic leading-relaxed text-text-2">
          {display}
        </blockquote>
      ) : (
        <p
          className={`mt-1 text-body-sm leading-relaxed ${
            isEmpty
              ? "text-text-3"
              : emphasis
                ? "font-medium text-text"
                : "text-text-2"
          }`}
        >
          {display}
        </p>
      )}
    </div>
  );
}
