"use client";
import { captureRefFromUrl, readRefCookie } from "@/lib/booking/ref-cookie";
import { logBookingEvents } from "./actions";
import type { ClientAnalyticsEvent } from "./shared";
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let lastEventTime = 0;
const TIMEOUT = 30 * 60 * 1000;
let fallback: { id: string; last: number } | null = null;
const attempts = new Map<string, string>();
const queue: ClientAnalyticsEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
function session() {
  let value = fallback;
  try {
    const stored = localStorage.getItem("booking-analytics-session-v2");
    if (stored !== null) value = JSON.parse(stored);
  } catch {}
  const now = Date.now();
  if (
    !value ||
    typeof value.id !== "string" ||
    !UUID.test(value.id) ||
    typeof value.last !== "number" ||
    now - value.last > TIMEOUT
  ) {
    value = { id: crypto.randomUUID(), last: now };
    attempts.clear();
  }
  value.last = now;
  fallback = value;
  try {
    localStorage.setItem("booking-analytics-session-v2", JSON.stringify(value));
  } catch {}
  return value.id;
}
export function analyticsContext(productId?: string) {
  captureRefFromUrl();
  const sessionId = session();
  let attemptId: string | null = null;
  if (productId) {
    const key = `booking-attempt-v2-${sessionId}-${productId}`;
    attemptId = attempts.get(key) ?? null;
    if (!attemptId)
      try {
        attemptId = sessionStorage.getItem(key);
      } catch {}
    if (attemptId && !UUID.test(attemptId)) attemptId = null;
    attemptId = attemptId ?? attempts.get(key) ?? crypto.randomUUID();
    attempts.set(key, attemptId);
    try {
      sessionStorage.setItem(key, attemptId);
    } catch {}
  }
  return {
    sessionId,
    attemptId,
    ref: readRefCookie(),
    device: window.matchMedia("(max-width: 767px)").matches
      ? ("mobile" as const)
      : ("desktop" as const),
  };
}
export function finishAnalyticsAttempt(productId: string) {
  const ctx = analyticsContext(productId);
  const key = `booking-attempt-v2-${ctx.sessionId}-${productId}`;
  const next = crypto.randomUUID();
  attempts.set(key, next);
  try {
    sessionStorage.setItem(key, next);
  } catch {}
}
export function trackBooking(
  kind: ClientAnalyticsEvent["kind"],
  productId?: string,
  extra: Partial<
    Pick<
      ClientAnalyticsEvent,
      "fieldId" | "formVersion" | "durationMs" | "errorCode"
    >
  > = {},
) {
  if (typeof window === "undefined") return;
  try {
    queue.push({
      occurredAt: new Date(
        (lastEventTime = Math.max(Date.now(), lastEventTime + 1)),
      ).toISOString(),
      id: crypto.randomUUID(),
      ...analyticsContext(productId),
      productId: productId ?? null,
      kind,
      fieldId: null,
      formVersion: null,
      durationMs: null,
      errorCode: null,
      ...extra,
    });
    if (!timer)
      timer = setTimeout(() => {
        timer = null;
        const batch = queue.splice(0, 30);
        void logBookingEvents(batch).catch(() => {});
        if (queue.length) flushAnalytics();
      }, 250);
  } catch {
    /* 저장소 접근 실패가 예약 동작을 막지 않습니다. */
  }
}
export function flushAnalytics() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  while (queue.length) {
    const batch = queue.splice(0, 30);
    void logBookingEvents(batch).catch(() => {});
  }
}
