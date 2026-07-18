/**
 * Dev panel — last skill quality eval snapshot (structural gate).
 */
import { useEffect, useState } from "react";

interface SkillAuditRow {
  id: string;
  excellenceReady: boolean;
  layerPass: number;
  layerTotal: number;
}

export function SkillQualityPanel() {
  const [rows, setRows] = useState<SkillAuditRow[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/skills/_audit/gap-matrix.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((data: { generatedAt?: string; skills?: SkillAuditRow[] }) => {
        setGeneratedAt(data.generatedAt ?? null);
        setRows(data.skills ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const ready = rows.filter((r) => r.excellenceReady).length;

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 p-3">
      <div>
        <div className="text-body-sm font-medium text-text">Skill quality (dev)</div>
        <p className="text-caption text-text-3">
          Structural audit from skills/_audit/gap-matrix.json — run server skill:audit to refresh.
        </p>
      </div>
      {error && <p className="text-caption text-danger">{error}</p>}
      {!error && rows.length > 0 && (
        <>
          <p className="text-micro text-text-2">
            {ready}/{rows.length} excellence-ready
            {generatedAt ? ` · ${new Date(generatedAt).toLocaleString()}` : ""}
          </p>
          <ul className="max-h-32 overflow-y-auto text-micro text-text-3">
            {rows.map((r) => (
              <li key={r.id}>
                {r.excellenceReady ? "✓" : "○"} {r.id} ({r.layerPass}/{r.layerTotal})
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
