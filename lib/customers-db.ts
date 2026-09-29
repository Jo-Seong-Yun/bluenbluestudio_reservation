import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Gender } from "@/lib/supabase/database.types";
import { SNS_CONSENT_FIELD_LABEL } from "@/lib/booking/custom-fields-shared";
import { kstToday } from "@/lib/time";
import {
  computeVisitStats,
  deriveIdentitiesByPhone,
  summarizeCustomers,
  type CustomerSummary,
  type IdentitySourceRow,
} from "./customers";

/**
 * customers 테이블 관련 DB 작업. 순수 계산(lib/customers.ts)과 분리해
 * 계산 로직만 유닛 테스트로 검증할 수 있게 둔다.
 */

/**
 * 가장 최근 방문(완료 처리된 예약)들의 SNS 게시 동의 답변을 찾는다.
 * 예약마다 상품이 다를 수 있고 "SNS 동의" 문항의 id도 상품별로
 * 따로 만들어지므로, 예약 → 상품 → 그 상품의 문항 id → 답변 순서로
 * 찾는다(record-sheet/build-data.ts의 answerByLabel과 같은 방식).
 */
async function loadSnsConsentForLastVisits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lastVisitReservations: { id: string; product_id: string }[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (lastVisitReservations.length === 0) return result;

  const reservationIds = lastVisitReservations.map((r) => r.id);
  const productIds = [...new Set(lastVisitReservations.map((r) => r.product_id))];

  const [{ data: snsFields }, { data: answers }] = await Promise.all([
    supabase
      .from("custom_fields")
      .select("id, product_id")
      .eq("label", SNS_CONSENT_FIELD_LABEL)
      .in("product_id", productIds),
    supabase
      .from("reservation_answers")
      .select("reservation_id, field_id, value")
      .in("reservation_id", reservationIds),
  ]);

  const snsFieldIdByProduct = new Map(
    (snsFields ?? []).map((f) => [f.product_id, f.id]),
  );
  const answersByReservation = new Map((answers ?? []).map((a) => [a.reservation_id + ":" + a.field_id, a.value]));

  for (const r of lastVisitReservations) {
    const fieldId = snsFieldIdByProduct.get(r.product_id);
    if (!fieldId) continue;
    const value = answersByReservation.get(r.id + ":" + fieldId);
    if (value) result.set(r.id, value);
  }
  return result;
}

/** 관리자 고객DB 화면·구글 시트 동기화가 함께 쓰는 조회. */
export async function loadCustomerSummaries(): Promise<CustomerSummary[]> {
  const supabase = await createClient();
  const [{ data: customers }, { data: visitRows }] = await Promise.all([
    supabase
      .from("customers")
      .select(
        "phone, name, gender, birth_date, email, created_at, first_visit_override, last_visit_override, visit_count_override, sns_consent_override, age_override",
      ),
    supabase
      .from("reservations")
      .select("id, customer_phone, product_id, status, shoot_start"),
  ]);

  const visitStats = computeVisitStats(visitRows ?? []);

  const lastVisitReservations = [...visitStats.values()]
    .map((s) => s.lastVisitReservationId)
    .filter((id): id is string => id !== null)
    .map((id) => (visitRows ?? []).find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => r !== undefined)
    .map((r) => ({ id: r.id, product_id: r.product_id }));

  const snsConsentByReservationId = await loadSnsConsentForLastVisits(
    supabase,
    lastVisitReservations,
  );

  return summarizeCustomers(
    customers ?? [],
    visitStats,
    kstToday(),
    snsConsentByReservationId,
  );
}

/**
 * 전화번호로 고객DB에 저장된 이메일을 찾는다. 고객DB의 email은 한 번
 * 채워지면 새 예약이 들어와도 절대 덮어써지지 않으므로(위 upsert 참고),
 * 관리자가 고객DB 화면에서 직접 고친 주소가 여기 있을 수 있다 — 예약
 * 건 자체에 적힌 customer_email보다 더 최신/정확한 주소로 취급한다.
 */
export async function getCustomerEmailByPhone(
  phone: string,
): Promise<string | null> {
  if (!phone) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("email")
    .eq("phone", phone)
    .maybeSingle();
  return data?.email ?? null;
}

/**
 * 예약 하나가 생성/변경될 때마다 그 손님의 customers 행을 "빈 칸만"
 * 채운다. 이미 값이 있는 칸은 절대 덮어쓰지 않는다 — 관리자가 고객DB
 * 화면에서 수기로 고친 값을, 다음 예약이 들어왔다고 신청서에 적힌
 * 원본 값으로 되돌리면 안 되기 때문이다. 손님이 처음 예약하는
 * 경우(customers에 행이 아직 없음)에는 그대로 새 행을 만든다.
 *
 * 알림 발송·구글 시트 동기화와 같은 자리(after())에서 부르는
 * best-effort 함수라 절대 throw하지 않는다. syncCustomerToSheet가
 * customers 테이블을 곧바로 읽으므로, 같은 after() 블록 안에서도
 * Promise.all로 동시에 돌리지 말고 이 함수를 먼저 await한 뒤에
 * 불러야 한다(먼저 채워놔야 그 다음에 읽을 값이 있다).
 */
export async function upsertCustomerFromReservation(info: {
  phone: string;
  name: string;
  gender: Gender | null;
  birthDate: string | null;
  email: string | null;
}): Promise<void> {
  if (!info.phone) return;

  try {
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("customers")
      .select("id, gender, birth_date, email")
      .eq("phone", info.phone)
      .maybeSingle();

    if (!existing) {
      await supabase.from("customers").insert({
        phone: info.phone,
        name: info.name,
        gender: info.gender,
        birth_date: info.birthDate,
        email: info.email,
      });
      return;
    }

    const patch: { gender?: Gender; birth_date?: string; email?: string } = {};
    if (!existing.gender && info.gender) patch.gender = info.gender;
    if (!existing.birth_date && info.birthDate) patch.birth_date = info.birthDate;
    if (!existing.email && info.email) patch.email = info.email;
    if (Object.keys(patch).length > 0) {
      await supabase.from("customers").update(patch).eq("id", existing.id);
    }
  } catch (error) {
    console.error("고객DB 자동 채우기 실패:", error);
  }
}

/**
 * customers 테이블에 아직 한 번도 안 만들어진 손님(이 기능을 붙이기
 * 전부터 있던 예약들)을 예약 기록에서 찾아 새로 채운다. 이미 행이
 * 있는 손님은 절대 건드리지 않는다 — "구글 시트 소급 반영" 버튼을
 * 다시 눌러도 수기로 고친 값이 되돌아가지 않아야 하므로, insert만
 * 하고 update는 하지 않는다.
 */
export async function backfillNewCustomers(
  reservations: IdentitySourceRow[],
): Promise<number> {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("customers").select("phone");
  const existingPhones = new Set((existing ?? []).map((c) => c.phone));

  const missing = reservations.filter(
    (r) => !existingPhones.has(r.customer_phone),
  );
  const identities = deriveIdentitiesByPhone(missing);
  if (identities.size === 0) return 0;

  const newCustomers = [...identities.entries()].map(([phone, identity]) => ({
    phone,
    name: identity.name,
    gender: identity.gender,
    birth_date: identity.birthDate,
    email: identity.email,
  }));

  const { error } = await supabase.from("customers").insert(newCustomers);
  if (error) throw new Error(`고객DB를 채우지 못했습니다: ${error.message}`);

  return newCustomers.length;
}
