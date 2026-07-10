/** Server-side HTML shell for shared client reports (mirrors desktop sessionReport). */
export function buildSessionReportHtml(markdown: string, title: string): string {
  const body = markdown
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; color: #18181b; line-height: 1.5; }
    h1 { font-size: 24px; border-bottom: 1px solid #e4e4e7; padding-bottom: 8px; }
    h2 { font-size: 18px; margin-top: 24px; }
    h3 { font-size: 14px; color: #52525b; }
    li { margin: 4px 0; }
  </style>
</head>
<body><p>${body}</p></body>
</html>`;
}
