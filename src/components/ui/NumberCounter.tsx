"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

type NumberCounterProps = {
  value: string;
  className?: string;
};

function parseValue(value: string) {
  const match = value.match(/^(\d+)(.*)$/);
  if (!match) return null;
  return { num: parseInt(match[1], 10), suffix: match[2] };
}

export function NumberCounter({ value, className = "" }: NumberCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const reducedMotion = useReducedMotion() ?? false;
  const parsed = useMemo(() => parseValue(value), [value]);
  const hasAnimatedRef = useRef(false);
  const [count, setCount] = useState<number | null>(null);

  const shouldAnimate = Boolean(parsed && inView && !reducedMotion);

  useEffect(() => {
    if (!shouldAnimate || !parsed || hasAnimatedRef.current) return;

    hasAnimatedRef.current = true;
    const duration = 1200;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * parsed.num);
      setCount(current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [shouldAnimate, parsed]);

  if (!parsed || reducedMotion) {
    return (
      <span ref={ref} className={className}>
        {value}
      </span>
    );
  }

  const display = inView
    ? `${count ?? 0}${parsed.suffix}`
    : `0${parsed.suffix}`;

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
