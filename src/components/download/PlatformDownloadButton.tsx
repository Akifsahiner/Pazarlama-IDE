"use client";

import { useEffect, useState } from "react";
import { ShimmerButton } from "@/components/ui/ShimmerButton";
import {
  detectDownloadPlatform,
  resolveDownloadTarget,
  type DownloadOption,
  type DownloadPlatform,
} from "@/lib/download";
import { platformIcon } from "./PlatformIcons";

const GENERIC = resolveDownloadTarget("unknown");

type Props = {
  id?: string;
  compact?: boolean;
  animated?: boolean;
  className?: string;
};

/** Primary download CTA — detects OS client-side (Cluely-style). */
export function PlatformDownloadButton({ id, compact, animated, className }: Props) {
  const [target, setTarget] = useState<DownloadOption>(GENERIC);
  const [platform, setPlatform] = useState<DownloadPlatform>("unknown");

  useEffect(() => {
    const detected = detectDownloadPlatform(navigator.userAgent, navigator.platform);
    setPlatform(detected);
    setTarget(resolveDownloadTarget(detected));
  }, []);

  return (
    <ShimmerButton
      id={id}
      label={target.label}
      href={target.href}
      compact={compact}
      animated={animated}
      className={className}
      icon={platform === "unknown" ? undefined : platformIcon(target.platform)}
    />
  );
}
