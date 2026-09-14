import { calculateAge } from "./age";
import { kstDateString } from "./time";
import type { Gender } from "./supabase/database.types";

const GENDER_LABEL: Record<Gender, string> = { male: "남성", female: "여성" };

export type CustomerRecord = {
  phone: string;
  name: string;
  gender: Gender | null;
  birth_date: string | null;
  email: string | null;
};

export type VisitStats = {
  firstVisit: string | null;
  lastVisit: string | null;
  visitCount: number;
};

const EMPTY_VISIT_STATS: VisitStats = {
  firstVisit: null,
  lastVisit: null,
  visitCount: 0,
};

export type ReservationVisitRow = {
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
  const datesByPhone = new Map<string, Date[]>();
  for (const r of rows) {
    if (r.status !== "completed" || !r.shoot_start) continue;
    const list = datesByPhone.get(r.customer_phone) ?? [];
    list.push(new Date(r.shoot_start));
    datesByPhone.set(r.customer_phone, list);
  }

  const result = new Map<string, VisitStats>();
  for (const [phone, dates] of datesByPhone) {
    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
    result.set(phone, {
      firstVisit: kstDateString(sorted[0]),
      lastVisit: kstDateString(sorted[sorted.length - 1]),
      visitCount: sorted.length,
    });
  }
  return result;
}

export type CustomerSummary = {
  phone: string;
  name: string;
  age: number | null;
  /** "YYYY-MM-DD" 원본값 — 수기 수정 폼의 date input을 채울 때 쓴다. */
  birthDate: string | null;
  gender: Gender | null;
  genderLabel: string;
  email: string | null;
} & VisitStats;

/** customers 테이블 행(인적사항)과 computeVisitStats의 결과(방문 이력)를 합친다. */
export function summarizeCustomers(
  customers: CustomerRecord[],
  visitStatsByPhone: Map<string, VisitStats>,
): CustomerSummary[] {
  return customers.map((c) => ({
    phone: c.phone,
    name: c.name,
    age: c.birth_date ? calculateAge(c.birth_date).manAge : null,
    birthDate: c.birth_date,
    gender: c.gender,
    genderLabel: c.gender ? (GENDER_LABEL[c.gender] ?? c.gender) : "",
    email: c.email,
    ...(visitStatsByPhone.get(c.phone) ?? EMPTY_VISIT_STATS),
  }));
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
