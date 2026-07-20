type SectionSeamProps = {
  variant: "hero-bridge" | "bridge-timeline" | "timeline-path" | "path-workbench" | "workbench-dark";
};

/** Soft gradient seam between major page sections — avoids hard color cliffs */
export function SectionSeam({ variant }: SectionSeamProps) {
  return <div className={`canvas-section-seam canvas-section-seam--${variant}`} aria-hidden="true" />;
}
