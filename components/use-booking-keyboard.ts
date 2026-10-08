"use client";

import { useEffect, type RefObject } from "react";

function isTextInput(
  element: Element | null,
): element is HTMLInputElement | HTMLTextAreaElement {
  return (
    element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLInputElement &&
      ![
        "radio",
        "checkbox",
        "hidden",
        "button",
        "submit",
        "reset",
        "file",
        "range",
        "color",
      ].includes(element.type))
  );
}

/** Use the visible viewport after the mobile keyboard opens, rather than layout height. */
export function useBookingKeyboard(formRef: RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const viewport = window.visualViewport;
    let baseline = Math.max(
      window.innerHeight,
      document.documentElement.clientHeight,
      viewport?.height ?? 0,
    );
    let width = window.innerWidth;
    let frame = 0;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const height = viewport?.height ?? window.innerHeight;
      const layoutHeight = Math.max(
        window.innerHeight,
        document.documentElement.clientHeight,
      );
      if (width !== window.innerWidth) {
        baseline = Math.max(layoutHeight, height);
        width = window.innerWidth;
      }
      baseline = Math.max(baseline, layoutHeight, height);
      const keyboard =
        mobile && (viewport?.scale ?? 1) <= 1.05 && baseline - height > 120;
      form.dataset.keyboardOpen = keyboard ? "true" : "false";
      if (keyboard)
        form.style.setProperty(
          "--booking-keyboard-room",
          `${baseline - height + height / 2}px`,
        );
      else form.style.removeProperty("--booking-keyboard-room");
      const input = document.activeElement;
      if (!mobile || !isTextInput(input) || !form.contains(input)) return;
      const target =
        input.closest<HTMLElement>(".booking-birth-slots") ?? input;
      const rect = target.getBoundingClientRect();
      const top = viewport?.offsetTop ?? 0;
      const dock = keyboard
        ? 0
        : (form
            .querySelector<HTMLElement>(".booking-form-actions")
            ?.getBoundingClientRect().height ?? 0);
      const bottom = top + height - dock;
      // Keep the action centered when keyboard resize/pan changes the visible area.
      if (keyboard || rect.bottom > bottom - 16 || rect.top < top + 16) {
        const desired = Math.max(
          0,
          window.scrollY +
            rect.top +
            rect.height / 2 -
            (top + (height - dock) / 2),
        );
        if (Math.abs(window.scrollY - desired) > 2)
          window.scrollTo({
            top: desired,
            behavior:
              keyboard ||
              window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "instant"
                : "smooth",
          });
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
      clearTimeout(settle);
      settle = setTimeout(sync, 350); // Safari may pan after the keyboard resize event.
    };
    form.addEventListener("focusin", schedule);
    form.addEventListener("focusout", schedule);
    viewport?.addEventListener("resize", schedule);
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      form.removeEventListener("focusin", schedule);
      form.removeEventListener("focusout", schedule);
      viewport?.removeEventListener("resize", schedule);
      window.removeEventListener("resize", schedule);
      delete form.dataset.keyboardOpen;
      form.style.removeProperty("--booking-keyboard-room");
    };
  }, [formRef]);
}
