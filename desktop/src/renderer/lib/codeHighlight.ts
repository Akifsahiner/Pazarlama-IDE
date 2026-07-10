import { codeToHtml } from "shiki";

const LANG_ALIASES: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  md: "markdown",
  mdx: "markdown",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  sass: "scss",
  less: "css",
  yaml: "yaml",
  yml: "yaml",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  ps1: "powershell",
  sql: "sql",
  py: "python",
  rs: "rust",
  go: "go",
  txt: "plaintext",
};

export function normalizeHighlightLang(raw?: string): string {
  if (!raw) return "plaintext";
  const key = raw.replace(/^language-/, "").trim().toLowerCase();
  return LANG_ALIASES[key] ?? key;
}

export function langFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return LANG_ALIASES[ext] ?? (ext || "plaintext");
}

function resolveShikiTheme(): "github-dark" | "github-light" {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light") return "github-light";
  if (attr === "dark") return "github-dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "github-light"
    : "github-dark";
}

let highlightChain: Promise<string> = Promise.resolve("");

/** Serialize highlight requests so Shiki init stays single-flight in Electron. */
export function highlightCode(code: string, lang: string): Promise<string> {
  const normalized = normalizeHighlightLang(lang);
  highlightChain = highlightChain.then(async () => {
    try {
      return await codeToHtml(code, {
        lang: normalized,
        theme: resolveShikiTheme(),
        transformers: [
          {
            pre(node) {
              node.properties.class = "shiki-pre";
            },
            code(node) {
              node.properties.class = "shiki-code";
            },
          },
        ],
      });
    } catch {
      try {
        return await codeToHtml(code, { lang: "plaintext", theme: resolveShikiTheme() });
      } catch {
        return `<pre class="shiki-pre"><code>${escapeHtml(code)}</code></pre>`;
      }
    }
  });
  return highlightChain;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
