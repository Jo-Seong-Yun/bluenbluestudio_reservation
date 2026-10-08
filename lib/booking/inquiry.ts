export const DEFAULT_INQUIRY_URL = "https://open.kakao.com/o/sfRpIEKi";

/** Public inquiry destinations must be HTTPS links, never executable URLs. */
export function inquiryUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
