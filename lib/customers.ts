import { calculateAge } from "./age";
import { kstDateString } from "./time";

export type CustomerReservationRow = {
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  gender: string | null;
  birth_date: string | null;
  status: string;
  shoot_start: string | null;
  created_at: string;
};

const GENDER_LABEL: Record<string, string> = { male: "남성", female: "여성" };

export type CustomerSummary = {
  phone: string;
  name: string;
  age: number | null;
  gender: string | null;
  genderLabel: string;
  email: string | null;
  /** "YYYY-MM-DD" — "완료" 처리된 예약이 하나도 없으면 null. */
  firstVisit: string | null;
  lastVisit: string | null;
  visitCount: number;
};

/**
 * 예약 전체를 연락처(고유 식별자) 기준으로 묶어 손님별 요약을 만든다.
 *
 * 관리자 고객DB 화면(app/admin/(dashboard)/customers)과 구글 시트
 * 동기화(lib/google-sheets/sync.ts)가 이 로직을 함께 쓴다 — "방문"의
 * 정의(=상태가 완료인 예약)가 두 군데서 갈라지면 같은 손님인데 화면과
 * 시트의 숫자가 서로 달라 보이는 혼란이 생기니, 계산은 여기 한 곳에만
 * 둔다.
 */
export function summarizeCustomers(
  rows: CustomerReservationRow[],
): CustomerSummary[] {
  const byPhone = new Map<string, CustomerReservationRow[]>();
  for (const r of rows) {
    const list = byPhone.get(r.customer_phone) ?? [];
    list.push(r);
    byPhone.set(r.customer_phone, list);
  }

  const summaries: CustomerSummary[] = [];
  for (const [phone, group] of byPhone) {
    // 최신순으로 — 이름·이메일·성별·생년월일은 최근 예약 기준으로
    // 채우되, 그 건에 값이 비어 있으면(예: 이번엔 이메일을 안 적음)
    // 과거 예약 중 값이 있는 걸 찾아 채운다.
    const sorted = [...group].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const latest = sorted[0];
    const email = sorted.find((r) => r.customer_email)?.customer_email ?? null;
    const gender = sorted.find((r) => r.gender)?.gender ?? null;
    const birthDate = sorted.find((r) => r.birth_date)?.birth_date ?? null;

    // 방문 = 상태가 "completed"(촬영 완료)로 표시된 예약만 센다 —
    // 확정만 되고 아직 안 온 예약이나, 노쇼·취소는 "방문"이 아니다.
    const visitDates = sorted
      .filter((r) => r.status === "completed" && r.shoot_start)
      .map((r) => new Date(r.shoot_start!))
      .sort((a, b) => a.getTime() - b.getTime());

    summaries.push({
      phone,
      name: latest.customer_name,
      age: birthDate ? calculateAge(birthDate).manAge : null,
      gender,
      genderLabel: gender ? (GENDER_LABEL[gender] ?? gender) : "",
      email,
      firstVisit: visitDates[0] ? kstDateString(visitDates[0]) : null,
      lastVisit:
        visitDates.length > 0
          ? kstDateString(visitDates[visitDates.length - 1])
          : null,
      visitCount: visitDates.length,
    });
  }

  return summaries;
}
