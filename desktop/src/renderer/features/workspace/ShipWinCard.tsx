import { ExternalLink, Rocket, BarChart3 } from "lucide-react";
import type { FirstShipLedger } from "@shared/types";
import { hasGa4Connected } from "@shared/cmoProofLoop";
import { assessMeasurementBaseline } from "@shared/measurementBaseline";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { useApp } from "@renderer/state/store";

export function ShipWinCard({
  ledger,
  compact,
  onContinueCmo,
}: {
  ledger: FirstShipLedger;
  compact?: boolean;
  onContinueCmo?: () => void;
}) {
  const { before, after, commitSha, files, previewUrl, summary, linesDelta } = ledger;
  const profile = useApp((s) => s.marketingProfile);
  const project = useApp((s) => s.project);
  const navigate = useApp((s) => s.navigate);
  const openMeasurementIntake = useApp((s) => s.openMeasurementIntake);
  const baseline = assessMeasurementBaseline(profile, project);
  const ga4 = hasGa4Connected(profile);

  return (
    <Card
      className={compact ? "border-ok/30 bg-ok-soft/10 p-4" : "mt-4 border-ok/30 bg-ok-soft/10 p-5"}
      data-testid="ship-win-card"
    >
      <div className="flex items-start gap-2">
        <Rocket size={16} className="mt-0.5 text-ok" />
        <div className="min-w-0 flex-1">
          <h3 className="text-body-sm font-semibold text-text">You shipped a real change</h3>
          <p className="mt-1 text-mini text-text-2">
            {summary}
            {commitSha && files.length > 0 && (
              <>
                {" "}
                · <span className="font-mono">{files[0]}</span>
              </>
            )}
          </p>
        </div>
        {commitSha && (
          <Badge tone="ok" data-testid="ship-win-commit">
            {commitSha.slice(0, 7)}
          </Badge>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div data-testid="ship-win-before">
          <p className="text-[10px] font-semibold uppercase text-text-3">Before</p>
          {before?.metaTitle && (
            <p className="mt-1 text-mini text-text-2">
              <span className="text-text-3">Title:</span> {before.metaTitle}
            </p>
          )}
          {before?.heroHeadline && (
            <p className="mt-1 text-mini text-text-2">
              <span className="text-text-3">Hero:</span> {before.heroHeadline}
            </p>
          )}
          {!before?.metaTitle && !before?.heroHeadline && (
            <p className="mt-1 text-mini text-text-3">Baseline captured at scan</p>
          )}
        </div>
        <div data-testid="ship-win-after">
          <p className="text-[10px] font-semibold uppercase text-text-3">After</p>
          {after?.metaTitle && (
            <p className="mt-1 text-mini text-text">
              <span className="text-text-3">Title:</span> {after.metaTitle}
            </p>
          )}
          {after?.heroHeadline && (
            <p className="mt-1 text-mini text-text">
              <span className="text-text-3">Hero:</span> {after.heroHeadline}
            </p>
          )}
          {!after?.metaTitle && !after?.heroHeadline && files.length > 0 && (
            <p className="mt-1 text-mini text-text">{files.join(", ")}</p>
          )}
        </div>
      </div>

      {linesDelta && (
        <p className="mt-2 text-[10px] text-text-3">
          +{linesDelta.add}/−{linesDelta.del} lines
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {!baseline.ready && (
          <Button
            size="sm"
            variant="primary"
            iconLeft={<BarChart3 size={13} />}
            data-testid="ship-win-measurement-cta"
            onClick={() => (ga4 ? navigate("settings") : openMeasurementIntake())}
          >
            {ga4 ? "Connect GA4" : "Log baseline KPI"}
          </Button>
        )}
        {previewUrl && (
          <Button
            size="sm"
            variant="secondary"
            iconLeft={<ExternalLink size={13} />}
            data-testid="ship-win-preview-url"
            onClick={() => window.open(previewUrl, "_blank", "noopener")}
          >
            Open preview
          </Button>
        )}
        {onContinueCmo && (
          <Button size="sm" variant="ghost" onClick={onContinueCmo}>
            Continue CMO setup
          </Button>
        )}
      </div>
    </Card>
  );
}
