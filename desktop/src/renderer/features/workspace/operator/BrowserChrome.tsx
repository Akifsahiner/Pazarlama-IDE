import { Globe, Loader2, Lock, ShieldCheck } from "lucide-react";

interface BrowserChromeProps {
  url?: string;
  title?: string;
  reloading: boolean;
}

/** A lightweight browser-chrome header: URL bar + secure/sandbox badges. */
export function BrowserChrome({ url, title, reloading }: BrowserChromeProps) {
  const secure = !!url && url.startsWith("https://");
  return (
    <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-warn/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-ok/60" />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-bg px-2.5 py-1">
        {reloading ? (
          <Loader2 size={12} className="shrink-0 animate-spin text-text-3" />
        ) : secure ? (
          <Lock size={12} className="shrink-0 text-ok" />
        ) : (
          <Globe size={12} className="shrink-0 text-text-3" />
        )}
        <span className="min-w-0 flex-1 truncate font-mono text-micro text-text-2">
          {url ?? "about:blank"}
        </span>
        {title && (
          <span className="hidden max-w-[40%] shrink-0 truncate text-micro text-text-3 sm:inline">
            {title}
          </span>
        )}
      </div>
      <span
        title="Isolated sandbox — your machine is not exposed"
        className="flex shrink-0 items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10.5px] text-text-3"
      >
        <ShieldCheck size={11} className="text-ok" /> Sandbox
      </span>
    </div>
  );
}
