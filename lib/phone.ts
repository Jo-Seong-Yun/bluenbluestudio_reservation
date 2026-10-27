/** Preserve incomplete/invalid input for validation; never truncate autofill. */
export function normalizeKoreanPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits.startsWith("82")) return digits;
  const national = digits.slice(2);
  const normalized = national.startsWith("0") ? national : `0${national}`;
  return /^01[0-9]{8,9}$/.test(normalized) ? normalized : digits;
}
