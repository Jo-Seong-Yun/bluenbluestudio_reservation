"use client";

/**
 * 홍보 링크 끝에 붙이는 "?ref=insta" 같은 유입경로 값을 손님이 사이트
 * 안을 돌아다니는 동안 계속 들고 다니게 하는 쿠키. 손님이 처음 들어온
 * 페이지에만 ?ref=가 붙어 있고 그 뒤로 클릭해 넘어가는 내부 링크들은
 * 쿼리스트링을 안 들고 다니므로, 처음 본 값을 쿠키에 저장해뒀다가
 * 상품 상세/신청서 진입 기록과 실제 예약 제출 시점까지 같은 값을 쓴다.
 */
const COOKIE_NAME = "ref";
const COOKIE_DAYS = 30;
const MAX_LENGTH = 50;

/** 현재 URL에 ?ref=...가 있으면 쿠키에 저장한다. 없으면 아무 것도 안 한다
 * (이미 저장된 값을 지우지 않는다 — 내부 링크로 넘어온 페이지에는
 * 당연히 ?ref=가 없다). */
export function captureRefFromUrl(): void {
  if (typeof window === "undefined") return;
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (!ref) return;

  const value = encodeURIComponent(ref.slice(0, MAX_LENGTH));
  const expires = new Date(
    Date.now() + COOKIE_DAYS * 24 * 60 * 60 * 1000,
  ).toUTCString();
  document.cookie = `${COOKIE_NAME}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

/** 지금 들고 있는 유입경로 값. 없으면 null. */
export function readRefCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}
