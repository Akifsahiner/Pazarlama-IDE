import type { FirstShipSnapshot } from "@shared/firstShipSnapshot";

export function ShipBeforeAfterGrid({
  before,
  after,
  files,
  beforeTestId = "ship-before",
  afterTestId = "ship-after",
}: {
  before?: Partial<FirstShipSnapshot> | null;
  after?: Partial<FirstShipSnapshot> | null;
  files?: string[];
  beforeTestId?: string;
  afterTestId?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" data-testid="ship-before-after-grid">
      <div data-testid={beforeTestId}>
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
      <div data-testid={afterTestId}>
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
        {!after?.metaTitle && !after?.heroHeadline && files && files.length > 0 && (
          <p className="mt-1 text-mini text-text">{files.join(", ")}</p>
        )}
      </div>
    </div>
  );
}
