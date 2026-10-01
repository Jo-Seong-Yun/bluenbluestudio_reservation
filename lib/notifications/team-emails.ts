/** 한 예약에 붙일 수 있는 팀원 이메일 최대 개수. */
export const MAX_TEAM_EMAILS = 10;

/** 팀원 칸이 들어 있는 폼에 함께 싣는 표시 — 칸을 전부 비운 채 보낸
 * 경우(팀원 삭제)와 팀원 칸이 아예 없는 폼을 구분하는 데 쓴다. */
export const TEAM_EMAILS_FIELD = "teamEmails";
export const TEAM_EMAILS_PRESENT_FIELD = "teamEmailsPresent";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type TeamEmailsResult =
  | { ok: true; emails: string[] }
  | { ok: false; error: string };

/**
 * 관리자가 적은 팀원 주소들을 정리한다. 빈 칸은 버리고, 앞뒤 공백을
 * 지우고 소문자로 맞춘 뒤 중복과 예약자 본인 주소를 뺀다(같은 메일이
 * 두 번 가지 않게). 형식이 틀린 주소가 하나라도 있으면 발송 전에
 * 막는다 — 조용히 버리면 사장님은 보냈다고 생각하게 된다.
 */
export function normalizeTeamEmails(
  raw: readonly string[],
  customerEmail?: string | null,
): TeamEmailsResult {
  const customer = customerEmail?.trim().toLowerCase() ?? "";
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const value of raw) {
    const email = value.trim().toLowerCase();
    if (!email) continue;
    if (!EMAIL_RE.test(email)) {
      return { ok: false, error: `팀원 이메일 "${value.trim()}"의 형식이 올바르지 않습니다.` };
    }
    if (email === customer || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  if (emails.length > MAX_TEAM_EMAILS) {
    return {
      ok: false,
      error: `팀원 이메일은 최대 ${MAX_TEAM_EMAILS}개까지 추가할 수 있습니다.`,
    };
  }
  return { ok: true, emails };
}

/**
 * 폼에서 팀원 주소를 읽는다. 팀원 칸이 없는 폼이면 `null`(저장된 값을
 * 건드리지 않는다는 뜻), 있으면 정리된 목록(비어 있을 수 있음)을 준다.
 */
export function readTeamEmailsFromForm(
  formData: FormData,
  customerEmail?: string | null,
): TeamEmailsResult | null {
  if (!formData.has(TEAM_EMAILS_PRESENT_FIELD)) return null;
  const raw = formData.getAll(TEAM_EMAILS_FIELD).map(String);
  return normalizeTeamEmails(raw, customerEmail);
}

/** 확인창을 처음 열 때 보여줄 팀원 칸 수 — 저장된 팀원이 있으면 그
 * 수만큼, 없으면 상품 최대 인원에서 예약자 1명을 뺀 만큼 빈 칸을 둔다. */
export function initialTeamEmailRows(
  saved: readonly string[],
  productMaxPeople: number | null,
): string[] {
  if (saved.length > 0) return [...saved];
  const blanks = productMaxPeople && productMaxPeople > 1 ? productMaxPeople - 1 : 0;
  return Array.from({ length: Math.min(blanks, MAX_TEAM_EMAILS) }, () => "");
}
