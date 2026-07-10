import {
  adPackToZipEntries,
  buildAdExportPack,
} from "@shared/adExportPack";
import { buildZip, type ZipEntry } from "@shared/downloadZip";
import {
  buildSessionReportHtml,
  buildSessionReportMarkdown,
  type SessionReportInput,
} from "@shared/sessionReport";
import type { MarketingAsset } from "@shared/types";

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadZip(entries: ZipEntry[], filename: string): void {
  const zip = buildZip(entries);
  downloadBlob(new Blob([zip.slice()], { type: "application/zip" }), filename);
}

export function downloadAdExportZip(asset: MarketingAsset, projectName: string): void {
  const pack = buildAdExportPack(asset, projectName);
  const date = pack.generatedAt.slice(0, 10);
  const filename = `ad-pack-${projectName.replace(/\s+/g, "-").toLowerCase()}-${date}.zip`;
  downloadZip(adPackToZipEntries(pack), filename);
}

export function downloadSessionReportMarkdown(input: SessionReportInput): void {
  const md = buildSessionReportMarkdown(input);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const date = new Date().toISOString().slice(0, 10);
  const slug = (input.projectName ?? "session").replace(/\s+/g, "-").toLowerCase();
  downloadBlob(blob, `session-report-${slug}-${date}.md`);
}

/** Open print dialog — user saves as PDF (browser fallback). */
export function printSessionReportPdf(input: SessionReportInput): void {
  const md = buildSessionReportMarkdown(input);
  const title = `Session report — ${input.projectName ?? "Launch"}`;
  const html = buildSessionReportHtml(md, title);
  const win = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function sessionReportPdfFilename(input: SessionReportInput): string {
  const date = new Date().toISOString().slice(0, 10);
  const slug = (input.projectName ?? "session").replace(/\s+/g, "-").toLowerCase();
  return `session-report-${slug}-${date}.pdf`;
}

/** Save a real PDF via Electron printToPDF (falls back to print dialog). */
export async function downloadSessionReportPdf(input: SessionReportInput): Promise<void> {
  const md = buildSessionReportMarkdown(input);
  const title = `Session report — ${input.projectName ?? "Launch"}`;
  const html = buildSessionReportHtml(md, title);
  const defaultFilename = sessionReportPdfFilename(input);
  try {
    const result = await window.api.export.saveHtmlAsPdf({ html, defaultFilename });
    if (result.ok || result.cancelled) return;
  } catch {
    /* preload unavailable — fall through */
  }
  printSessionReportPdf(input);
}
