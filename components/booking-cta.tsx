"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui";

/** Emphasize a valid next action without moving focus or advancing the form. */
export function BookingCTA({
  ready,
  waitForScroll = false,
  className = "",
  children,
  ...props
}: ComponentProps<typeof Button> & {
  ready: boolean;
  waitForScroll?: boolean;
}) {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!ready || !waitForScroll) return;
    let frame = 0;
    let previous = window.scrollY;
    let stable = 0;
    const started = performance.now();
    const tick = (now: number) => {
      stable = Math.abs(window.scrollY - previous) < 1 ? stable + 1 : 0;
      previous = window.scrollY;
      if (now - started >= 500 && stable >= 3) setSettled(true);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      setSettled(false);
    };
  }, [ready, waitForScroll]);
  const emphasize = ready && !props.disabled && (!waitForScroll || settled);
  return (
    <Button
      {...props}
      className={[className, emphasize ? "booking-cta-ripple" : ""].filter(Boolean).join(" ")}
    >
      <span className="relative z-[1]">{children}</span>
    </Button>
  );
}
