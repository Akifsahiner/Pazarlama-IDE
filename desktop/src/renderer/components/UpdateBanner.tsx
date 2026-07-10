import { useEffect, useState } from "react";
import { Check, Download } from "lucide-react";

export function UpdateBanner() {
  const [available, setAvailable] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<string | null>(null);

  useEffect(() => {
    const offA = window.api.updater.onAvailable((info) => setAvailable(info.version));
    const offD = window.api.updater.onDownloaded((info) => setDownloaded(info.version));
    return () => {
      offA();
      offD();
    };
  }, []);

  if (!available && !downloaded) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-line bg-accent-soft px-3 py-1.5 text-mini text-text">
      <span className="flex items-center gap-2">
        {downloaded ? <Check size={14} className="text-ok" /> : <Download size={14} />}
        {downloaded ? `Update v${downloaded} ready` : `Update v${available} downloading…`}
      </span>
      {downloaded && (
        <button
          onClick={() => window.api.updater.install()}
          className="rounded-[6px] bg-accent px-2 py-0.5 text-micro text-white"
        >
          Restart to update
        </button>
      )}
    </div>
  );
}
