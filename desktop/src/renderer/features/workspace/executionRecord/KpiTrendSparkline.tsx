import type { KpiTrendPoint } from "@shared/kpiTrendSeries";

export function KpiTrendSparkline({
  points,
  width = 80,
  height = 24,
}: {
  points: KpiTrendPoint[];
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;

  const sorted = [...points].sort((a, b) => a.day_index - b.day_index);
  const values = sorted.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = sorted.map((p, i) => {
    const x = (i / (sorted.length - 1)) * (width - 4) + 2;
    const y = height - 2 - ((p.value - min) / range) * (height - 4);
    return `${x},${y}`;
  });

  return (
    <svg
      width={width}
      height={height}
      className="inline-block text-accent"
      aria-hidden
      data-testid="kpi-trend-sparkline"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        points={coords.join(" ")}
      />
    </svg>
  );
}
