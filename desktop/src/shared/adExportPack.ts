import type { MarketingAsset } from "./types";
import { type ZipEntry } from "./downloadZip";

export interface AdExportPackFile {
  name: string;
  content: string;
  mime: string;
}

export interface AdExportPack {
  projectName: string;
  generatedAt: string;
  assetId: string;
  files: AdExportPackFile[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function metaPreviewHtml(asset: MarketingAsset, productName: string): string {
  const headline = escapeHtml(asset.after.split("\n")[0]?.slice(0, 80) ?? productName);
  const body = escapeHtml(asset.after.slice(0, 400));
  const brand = escapeHtml(productName);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Meta feed preview — ${brand}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f0f2f5; padding: 24px; }
    .card { max-width: 420px; background: #fff; border-radius: 8px; padding: 16px; box-shadow: 0 1px 2px rgba(0,0,0,.1); }
    .headline { font-weight: 600; margin-top: 12px; }
    .cta { display: block; margin-top: 12px; padding: 10px; text-align: center; background: #1877f2; color: #fff; border-radius: 6px; text-decoration: none; }
    .note { margin-top: 24px; font-size: 12px; color: #65676b; }
  </style>
</head>
<body>
  <div class="card">
    <div><strong>${brand}</strong> · Sponsored</div>
    <p style="white-space: pre-wrap;">${body}</p>
    <div class="headline">${headline}</div>
    <div style="font-size:12px;color:#65676b;">yourproduct.com</div>
    <span class="cta">Learn more</span>
  </div>
  <p class="note">Draft mock only — publish from Meta Ads Manager. Marketing IDE does not auto-publish.</p>
</body>
</html>`;
}

function googlePreviewHtml(asset: MarketingAsset, productName: string): string {
  const lines = asset.after.split("\n").filter(Boolean);
  const headline = escapeHtml(lines[0]?.slice(0, 30) ?? productName);
  const description = escapeHtml(lines.slice(1).join(" ").slice(0, 90) || asset.after.slice(0, 90));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Google Search preview — ${escapeHtml(productName)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; background: #fff; }
    .ad { max-width: 600px; }
    .url { font-size: 14px; color: #202124; }
    .headline { font-size: 20px; color: #1a0dab; margin: 4px 0; }
    .desc { font-size: 14px; color: #4d5156; line-height: 1.4; }
    .note { margin-top: 24px; font-size: 12px; color: #70757a; }
  </style>
</head>
<body>
  <div class="ad">
    <div class="url">Ad · yourproduct.com</div>
    <div class="headline">${headline}</div>
    <div class="desc">${description}</div>
  </div>
  <p class="note">Draft mock only — publish from Google Ads. Marketing IDE does not auto-publish.</p>
</body>
</html>`;
}

function publishChecklist(productName: string): string {
  return `# Ad publish checklist — ${productName}

## Before you publish
- [ ] Proofread headline and description character limits (Meta / Google)
- [ ] Landing page URL matches live site
- [ ] UTM parameters on destination URL
- [ ] Conversion pixel / GA4 events verified
- [ ] Budget and audience set in ad platform (you control spend)

## Files in this pack
- \`creative-copy.txt\` — raw draft from agent
- \`meta-preview.html\` — Meta feed mock (open in browser)
- \`google-preview.html\` — Google Search mock (open in browser)
- \`previews.svg\` — quick visual reference

## Trust
Draft only — you publish. No bulk unsupervised send. No in-app Meta OAuth (Faz 12).
`;
}

/** Simple SVG snapshot for designers (PNG substitute without canvas capture). */
function previewsSvg(asset: MarketingAsset, productName: string): string {
  const line1 = (asset.after.split("\n")[0] ?? productName).slice(0, 40);
  const line2 = asset.after.slice(0, 80).replace(/\n/g, " ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
  <rect width="800" height="400" fill="#f4f4f5"/>
  <rect x="40" y="40" width="340" height="320" rx="12" fill="#fff" stroke="#e4e4e7"/>
  <text x="60" y="80" font-family="system-ui" font-size="14" fill="#18181b">${escapeHtml(productName)} · Meta</text>
  <text x="60" y="120" font-family="system-ui" font-size="12" fill="#3f3f46">${escapeHtml(line2)}</text>
  <rect x="40" y="200" width="720" height="160" rx="12" fill="#fff" stroke="#e4e4e7"/>
  <text x="60" y="240" font-family="system-ui" font-size="14" fill="#1a0dab">${escapeHtml(line1)}</text>
  <text x="60" y="270" font-family="system-ui" font-size="12" fill="#52525b">Google Search mock</text>
</svg>`;
}

export function buildAdExportPack(asset: MarketingAsset, projectName: string): AdExportPack {
  const generatedAt = new Date().toISOString();
  const files: AdExportPackFile[] = [
    {
      name: "creative-copy.txt",
      content: `# Ad draft — ${projectName}\n\n${asset.after}\n\n— Draft only. You publish from your ad platform.`,
      mime: "text/plain",
    },
    {
      name: "meta-preview.html",
      content: metaPreviewHtml(asset, projectName),
      mime: "text/html",
    },
    {
      name: "google-preview.html",
      content: googlePreviewHtml(asset, projectName),
      mime: "text/html",
    },
    {
      name: "publish-checklist.md",
      content: publishChecklist(projectName),
      mime: "text/markdown",
    },
    {
      name: "previews.svg",
      content: previewsSvg(asset, projectName),
      mime: "image/svg+xml",
    },
    {
      name: "README.md",
      content: `# Ad export pack — ${projectName}\n\nGenerated ${generatedAt.slice(0, 10)}.\n\nOpen HTML files in a browser. Import copy into Meta Ads Manager or Google Ads.\n`,
      mime: "text/markdown",
    },
  ];
  return { projectName, generatedAt, assetId: asset.id, files };
}

export function adPackToZipEntries(pack: AdExportPack): ZipEntry[] {
  const encoder = new TextEncoder();
  const prefix = `ad-pack-${pack.projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "export"}`;
  return pack.files.map((f) => ({
    name: `${prefix}/${f.name}`,
    data: encoder.encode(f.content),
  }));
}
