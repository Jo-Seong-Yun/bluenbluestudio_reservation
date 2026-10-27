"use client";

import { useEffect } from "react";

/** Reserve the visible fixed action bar once, without keyboard/scroll based growth. */
export function BookingPageSpacing() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".booking-workspace");
    if (!root) return;
    let frame = 0;
    const observed = new Set<Element>();
    const resize = new ResizeObserver(schedule);
    function sync() {
      for (const dock of observed) {
        if (!root!.contains(dock)) {
          resize.unobserve(dock);
          observed.delete(dock);
        }
      }
      const pages = root!.querySelectorAll<HTMLElement>(".booking-page");
      for (const page of pages) {
        let room = 0;
        for (const dock of page.querySelectorAll<HTMLElement>(
          ".booking-primary-dock, .booking-form-actions",
        )) {
          if (!observed.has(dock)) {
            observed.add(dock);
            resize.observe(dock);
          }
          if (
            getComputedStyle(dock).position === "fixed" &&
            dock.getClientRects().length
          )
            room = Math.max(room, dock.getBoundingClientRect().height);
        }
        page.style.setProperty("--booking-dock-space", `${room}px`);
      }
    }
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    }
    const mutation = new MutationObserver(schedule);
    mutation.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["hidden", "class", "data-keyboard-open"],
    });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      window.removeEventListener("resize", schedule);
      root
        .querySelectorAll<HTMLElement>(".booking-page")
        .forEach((page) => page.style.removeProperty("--booking-dock-space"));
    };
  }, []);
  return null;
}
