import { calculateAge } from "./age";
import { diffDays, kstDateString, kstToday, type DateString } from "./time";
import type { Gender } from "./supabase/database.types";

const GENDER_LABEL: Record<Gender, string> = { male: "남", female: "여" };

export type CustomerRecord = {
  phone: string;
  name: string;
  gender: Gender | null;
  birth_date: string | null;
  email: string | null;
  /** 이 손님의 고객DB 행이 처음 만들어진 시각(=개인정보 최초 수집 시점). */
  created_at: string;
};

export type VisitStats = {
  firstVisit: string | null;
  lastVisit: string | null;
  visitCount: number;
  /** 가장 최근 방문(완료 처리)의 예약 id — 그 예약의 SNS 게시 동의
   * 답변을 찾아올 때 쓴다. 방문 이력이 없으면 null. */
  lastVisitReservationId: string | null;
};

const EMPTY_VISIT_STATS: VisitStats = {
  firstVisit: null,
  lastVisit: null,
  visitCount: 0,
  lastVisitReservationId: null,
};

export type ReservationVisitRow = {
  id: string;
  customer_phone: string;
  status: string;
  shoot_start: string | null;
};

/**
 * 예약 목록에서 손님별 방문 이력을 계산한다.
 *
 * 방문 = 상태가 "completed"(촬영 완료)로 표시된 예약만 센다 — 확정만
 * 되고 아직 안 온 예약이나, 노쇼·취소는 "방문"이 아니다. 손님의
 * 인적사항(이름·성별 등, customers 테이블)과 달리 이 값은 고정
 * 저장하지 않고 항상 예약 기록에서 다시 계산한다 — 수기로 고칠
 * 대상이 아니라 실제 예약 상태를 그대로 반영해야 정확하다.
 */
export function computeVisitStats(
  rows: ReservationVisitRow[],
): Map<string, VisitStats> {
  const entriesByPhone = new Map<string, { id: string; date: Date }[]>();
  for (const r of rows) {
    if (r.status !== "completed" || !r.shoot_start) continue;
    const list = entriesByPhone.get(r.customer_phone) ?? [];
    list.push({ id: r.id, date: new Date(r.shoot_start) });
    entriesByPhone.set(r.customer_phone, list);
  }

  const result = new Map<string, VisitStats>();
  for (const [phone, entries] of entriesByPhone) {
    const sorted = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
    const last = sorted[sorted.length - 1];
    result.set(phone, {
      firstVisit: kstDateString(sorted[0].date),
      lastVisit: kstDateString(last.date),
      visitCount: sorted.length,
      lastVisitReservationId: last.id,
    });
  }
  return result;
}

/** SNS 게시 동의 문항의 답변 원본 값 — 이 두 값 중 하나가 아니면(무응답 등) null로 본다. */
export type SnsConsent = "동의" | "비동의";

export type CustomerSummary = {
  phone: string;
  name: string;
  age: number | null;
  /** "YYYY-MM-DD" 원본값 — 수기 수정 폼의 date input을 채울 때 쓴다. */
  birthDate: string | null;
  gender: Gender | null;
  genderLabel: string;
  email: string | null;
  /** 개인정보가 처음 수집된 시점(ISO). 나중에 보관기간에 따라 파기할 때
   * 기준이 된다. */
  collectedAt: string;
  /** collectedAt으로부터 오늘까지 경과한 일수. */
  daysSinceCollected: number;
  /** lastVisit로부터 오늘까지 경과한 일수 — 방문 이력이 없으면 null. */
  daysSinceLastVisit: number | null;
  /** 가장 최근 방문(완료 처리된 예약)에서 받은 SNS 게시 동의 답변 —
   * 방문 이력이 없거나, 그 상품에 이 문항이 없거나, 무응답이면 null. */
  lastVisitSnsConsent: SnsConsent | null;
} & VisitStats;

/**
 * customers 테이블 행(인적사항)과 computeVisitStats의 결과(방문 이력)를
 * 합친다. today를 인자로 받아 "경과 일수" 계산을 순수 함수로 유지한다
 * (테스트에서 고정된 기준일을 넣을 수 있게). snsConsentByReservationId는
 * "예약 id → SNS 동의 답변" — VisitStats.lastVisitReservationId로 찾는다.
 */
export function summarizeCustomers(
  customers: CustomerRecord[],
  visitStatsByPhone: Map<string, VisitStats>,
  today: DateString = kstToday(),
  snsConsentByReservationId: Map<string, string> = new Map(),
): CustomerSummary[] {
  return customers.map((c) => {
    const visitStats = visitStatsByPhone.get(c.phone) ?? EMPTY_VISIT_STATS;
    const rawConsent = visitStats.lastVisitReservationId
      ? snsConsentByReservationId.get(visitStats.lastVisitReservationId)
      : undefined;
    return {
      phone: c.phone,
      name: c.name,
      age: c.birth_date ? calculateAge(c.birth_date).manAge : null,
      birthDate: c.birth_date,
      gender: c.gender,
      genderLabel: c.gender ? (GENDER_LABEL[c.gender] ?? c.gender) : "",
      email: c.email,
      collectedAt: c.created_at,
      daysSinceCollected: diffDays(kstDateString(new Date(c.created_at)), today),
      daysSinceLastVisit: visitStats.lastVisit ? diffDays(visitStats.lastVisit, today) : null,
      lastVisitSnsConsent:
        rawConsent === "동의" || rawConsent === "비동의" ? rawConsent : null,
      ...visitStats,
    };
  });
}

export type IdentitySourceRow = {
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  gender: Gender | null;
  birth_date: string | null;
  created_at: string;
};

export type DerivedIdentity = {
  name: string;
  gender: Gender | null;
  birthDate: string | null;
  email: string | null;
};

/**
 * 예약 기록에서 손님별로 "가장 최근 값, 비어 있으면 과거 값"을 찾아
 * 인적사항을 추려낸다. customers 테이블에 아직 행이 없는 손님을 처음
 * 채워 넣을 때(백필)만 쓴다 — 이미 행이 있는 손님은 이걸로 절대
 * 덮어쓰지 않는다(수기로 고친 값을 보호해야 하므로).
 */
export function deriveIdentitiesByPhone(
  rows: IdentitySourceRow[],
): Map<string, DerivedIdentity> {
  const byPhone = new Map<string, IdentitySourceRow[]>();
  for (const r of rows) {
    const list = byPhone.get(r.customer_phone) ?? [];
    list.push(r);
    byPhone.set(r.customer_phone, list);
  }

  const result = new Map<string, DerivedIdentity>();
  for (const [phone, group] of byPhone) {
    const sorted = [...group].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const latest = sorted[0];
    result.set(phone, {
      name: latest.customer_name,
      gender: sorted.find((r) => r.gender)?.gender ?? null,
      birthDate: sorted.find((r) => r.birth_date)?.birth_date ?? null,
      email: sorted.find((r) => r.customer_email)?.customer_email ?? null,
    });
  }
  return result;
}
