export function CommandSurfaceField({
  label,
  value,
  labelId,
  emphasis,
}: {
  label: string;
  value: string;
  labelId: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className="min-w-0 rounded-[var(--radius-md)] border border-line/70 bg-surface/55 p-3"
      aria-labelledby={labelId}
    >
      <div
        id={labelId}
        className="text-[10px] font-semibold uppercase tracking-wider text-text-3"
      >
        {label}
      </div>
      <p className={`mt-1 text-body-sm ${emphasis ? "font-medium text-text" : "text-text-2"}`}>
        {value}
      </p>
    </div>
  );
}
