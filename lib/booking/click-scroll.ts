/** Called from explicit selection handlers only; never from draft/state restoration. */
export function scrollAfterClick(target: HTMLElement | null): () => void {
  let frame = 0;
  let cancelled = false;
  const stop = () => {
    cancelled = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("pointerdown", stop);
    window.removeEventListener("keydown", stop);
  };
  if (!target) return stop;
  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("pointerdown", stop, { passive: true });
  window.addEventListener("keydown", stop);

  frame = requestAnimationFrame(() => {
    if (cancelled || !target.isConnected) return stop();
    const rect = target.getBoundingClientRect();
    if (rect.top >= 24 && rect.bottom <= window.innerHeight - 110)
      return stop();
    const start = window.scrollY;
    const end = Math.max(
      0,
      Math.min(
        start + rect.top - 24,
        document.documentElement.scrollHeight - window.innerHeight,
      ),
    );
    if (Math.abs(end - start) < 2) return stop();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo({ top: end, behavior: "instant" });
      return stop();
    }
    const duration = Math.min(450, Math.max(280, Math.abs(end - start) * 0.4));
    let started: number | undefined;
    const tick = (now: number) => {
      if (cancelled || !target.isConnected) return stop();
      started ??= now;
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      window.scrollTo({
        top: start + (end - start) * eased,
        behavior: "instant",
      });
      if (progress < 1) frame = requestAnimationFrame(tick);
      else stop();
    };
    frame = requestAnimationFrame(tick);
  });
  return stop;
}
