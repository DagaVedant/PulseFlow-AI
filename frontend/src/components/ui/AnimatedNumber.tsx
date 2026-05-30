/* Smoothly animates a numeric value change using a requestAnimationFrame loop. */
"use client";
import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}

export function AnimatedNumber({ value, duration = 700, format = String, className }: AnimatedNumberProps) {
  const [current, setCurrent] = useState(value);
  const startRef = useRef(value);
  const rafRef = useRef<number>();

  useEffect(() => {
    const start = startRef.current;
    const end = value;
    if (Math.abs(start - end) < 0.5) return;

    const startTime = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = start + (end - start) * eased;
      setCurrent(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        startRef.current = end;
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startRef.current = value;
    };
  }, [value, duration]);

  return <span className={className}>{format(Math.round(current))}</span>;
}
