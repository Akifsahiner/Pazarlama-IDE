import { useEffect, useState } from "react";
import { highlightCode, normalizeHighlightLang } from "@renderer/lib/codeHighlight";

export function CodeHighlight({
  code,
  lang,
  className = "",
}: {
  code: string;
  lang: string;
  className?: string;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const normalized = normalizeHighlightLang(lang);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    void highlightCode(code, normalized).then((next) => {
      if (!cancelled) setHtml(next);
    });
    return () => {
      cancelled = true;
    };
  }, [code, normalized]);

  if (!html) {
    return (
      <pre className={`shiki-fallback font-mono text-body-sm text-text-2 ${className}`}>
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div
      className={`shiki-root overflow-x-auto ${className}`}
      // Shiki emits trusted static HTML from bundled grammars.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
