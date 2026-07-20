"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseScrollSectionOptions = {
  count: number;
  /** When true, use click-to-advance instead of scroll (reduced motion) */
  reducedMotion?: boolean;
};

/**
 * Scroll-driven section activation via IntersectionObserver.
 * Returns activeIndex for timeline/workbench/path steps.
 */
export function useScrollSection({ count, reducedMotion = false }: UseScrollSectionOptions) {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const setRef = useCallback((index: number) => (el: HTMLElement | null) => {
    itemRefs.current[index] = el;
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const elements = itemRefs.current.filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;

    const ratios = new Map<Element, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target, entry.intersectionRatio);
        }
        let bestIdx = 0;
        let bestRatio = 0;
        elements.forEach((el, i) => {
          const r = ratios.get(el) ?? 0;
          if (r > bestRatio) {
            bestRatio = r;
            bestIdx = i;
          }
        });
        if (bestRatio > 0.2) {
          setActiveIndex(bestIdx);
        }
      },
      { threshold: [0, 0.2, 0.35, 0.55, 0.7, 0.85, 1], rootMargin: "-18% 0px -32% 0px" },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [count, reducedMotion]);

  const activate = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  return { activeIndex, setRef, activate, itemRefs };
}
