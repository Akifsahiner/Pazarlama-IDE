"use client";

import { useSyncExternalStore } from "react";
import { ShimmerButton } from "@/components/ui/ShimmerButton";
import {
  detectDownloadPlatform,
  resolveDownloadTarget,
  type DownloadPlatform,
} from "@/lib/download";
import { platformIcon } from "./PlatformIcons";

function subscribePlatform() {
  return () => {};
}

function getClientPlatform(): DownloadPlatform {
  return detectDownloadPlatform(navigator.userAgent, navigator.platform);
}

/** SSR + first paint default — direct Windows artifact (never /download). */
function getServerPlatform(): DownloadPlatform {
  return "windows";
}

type Props = {
  id?: string;
  compact?: boolean;
  animated?: boolean;
  className?: string;
};

/** Primary download CTA — detects OS, labels "Get for …", direct GitHub artifact. */
export function PlatformDownloadButton({ id, compact, animated, className }: Props) {
  const platform = useSyncExternalStore(
    subscribePlatform,
    getClientPlatform,
    getServerPlatform,
  );
  const target = resolveDownloadTarget(platform);

  return (
    <ShimmerButton
      id={id}
      label={target.label}
      href={target.href}
      download={target.fileName}
      compact={compact}
      animated={animated}
      className={className}
      icon={platformIcon(target.platform)}
    />
  );
}
