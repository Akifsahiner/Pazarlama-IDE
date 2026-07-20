/**
 * Part 6 — "Why?" evidence drawer (Cursor-minimal).
 */
import { ChevronDown, ExternalLink, FileText, HelpCircle } from "lucide-react";
import { useState } from "react";
import type {
  ClaimConfidence,
  EvidenceRef,
  ProductClaim,
  ProductUnderstandingGraph,
} from "@shared/productUnderstandingInput";
import { claimForDimension } from "@shared/productUnderstandingPolicy";
import type { ProductUnderstandingDimension } from "@shared/productUnderstandingInput";
import { DIMENSION_REGISTRY } from "@shared/productUnderstandingRegistry";
import { useApp } from "@renderer/state/store";

const CONFIDENCE_TONE: Record<ClaimConfidence, string> = {
  measured: "border-ok/30 bg-ok/10 text-ok",
  assumption: "border-warn/30 bg-warn/10 text-warn",
  missing: "border-line bg-surface-2 text-text-3",
  needs_confirmation: "border-warn/40 bg-warn/5 text-warn",
};

function ConfidencePill({ confidence }: { confidence: ClaimConfidence }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CONFIDENCE_TONE[confidence]}`}
    >
      {confidence.replace(/_/g, " ")}
    </span>
  );
}

function EvidenceRow({ ref: evidence }: { ref: EvidenceRef }) {
  const project = useApp((s) => s.project);
  const isUrl = evidence.kind === "live_url" || evidence.ref.startsWith("http");
  const isRepo = evidence.kind === "repo_path" && !isUrl;

  const open = () => {
    if (isUrl && window.api?.shell?.openExternal) {
      void window.api.shell.openExternal(evidence.ref);
      return;
    }
    if (isRepo && window.api?.shell?.openInEditor) {
      const root =
        project?.source.kind === "folder" ? project.source.path : project?.localPath;
      if (!root) return;
      const rel = evidence.ref.replace(/^[\\/]+/, "");
      const abs = `${root.replace(/[\\/]+$/, "")}/${rel.replace(/\\/g, "/")}`;
      void window.api.shell.openInEditor({
        editor: "cursor",
        path: abs,
        line: evidence.startLine,
      });
    }
  };

  return (
    <li className="flex items-start gap-2 text-[11px] text-text-2">
      {isRepo ? (
        <FileText size={12} className="mt-0.5 shrink-0 text-text-3" />
      ) : isUrl ? (
        <ExternalLink size={12} className="mt-0.5 shrink-0 text-text-3" />
      ) : (
        <HelpCircle size={12} className="mt-0.5 shrink-0 text-text-3" />
      )}
      <div className="min-w-0">
        {isUrl || isRepo ? (
          <button
            type="button"
            onClick={open}
            className="text-left text-accent hover:underline"
            data-testid={`evidence-ref-${evidence.id}`}
          >
            {evidence.label}
          </button>
        ) : (
          <span className="text-text-2">{evidence.label}</span>
        )}
        {isRepo && (
          <p className="mt-0.5 font-mono text-[10px] text-text-3">
            {evidence.ref}
            {evidence.startLine != null ? `:${evidence.startLine}` : ""}
            {evidence.endLine != null && evidence.endLine !== evidence.startLine
              ? `–${evidence.endLine}`
              : ""}
          </p>
        )}
        {evidence.excerpt && (
          <p className="mt-0.5 line-clamp-2 text-[10px] text-text-3">{evidence.excerpt}</p>
        )}
      </div>
    </li>
  );
}

function ClaimBlock({ claim }: { claim: ProductClaim }) {
  const def = DIMENSION_REGISTRY[claim.dimension];
  return (
    <div
      className="rounded-[var(--radius-md)] border border-line/80 bg-surface/40 p-2.5"
      data-testid={`claim-${claim.dimension}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
          {def.label}
        </span>
        <ConfidencePill confidence={claim.confidence} />
      </div>
      <p className="mt-1 text-body-sm text-text">
        {claim.value != null && claim.value !== "" ? String(claim.value) : "Not known yet"}
      </p>
      {claim.evidence.length > 0 && (
        <ul className="mt-2 space-y-1.5 border-t border-line/60 pt-2">
          {claim.evidence.map((e) => (
            <EvidenceRow key={e.id} ref={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function WhyPanel({
  graph,
  dimensions,
  title = "Why we concluded this",
  defaultOpen = false,
  compact = false,
}: {
  graph?: ProductUnderstandingGraph | null;
  dimensions?: ProductUnderstandingDimension[];
  title?: string;
  defaultOpen?: boolean;
  compact?: boolean;
}) {
  const profileGraph = useApp((s) => s.marketingProfile?.product_understanding);
  const resolved = graph ?? profileGraph;
  const [open, setOpen] = useState(defaultOpen);

  if (!resolved?.claims.length) return null;

  const claims = dimensions?.length
    ? dimensions
        .map((d) => claimForDimension(resolved, d))
        .filter((c): c is ProductClaim => Boolean(c))
    : resolved.claims.slice(0, compact ? 4 : 11);

  if (!claims.length) return null;

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-[var(--radius-md)] border border-line/70 bg-surface/30"
      data-testid="why-panel"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-mini text-text-2 [&::-webkit-details-marker]:hidden">
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
        <HelpCircle size={13} className="text-accent" />
        <span className="font-medium text-text">{title}</span>
        <span className="text-text-3">· {claims.length} sourced claims</span>
      </summary>
      <div className="space-y-2 border-t border-line/60 px-3 pb-3 pt-2">
        {claims.map((c) => (
          <ClaimBlock key={c.dimension} claim={c} />
        ))}
      </div>
    </details>
  );
}

export function BindingWhyChip() {
  const graph = useApp((s) => s.marketingProfile?.product_understanding);
  const plane = useApp((s) => s.growthControlPlane ?? s.marketingProfile?.growth_control_plane);
  if (!plane?.binding || !graph) return null;
  return (
    <WhyPanel
      graph={graph}
      dimensions={["site_structure", "traffic_analytics", "product_category", "activation_event"]}
      title="Why this bottleneck"
      compact
    />
  );
}
