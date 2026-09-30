"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animated count-up number for stat cards. Counts from 0 to `value` on
 * first render with an ease-out curve. Purely presentational.
 */
export function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);

  return <span>{display.toLocaleString()}</span>;
}
