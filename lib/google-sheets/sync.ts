import "server-only";
import { createClient } from "@/lib/supabase/server";
import { kstDateString, kstTimeString } from "@/lib/time";
import { calculateAge } from "@/lib/age";
import { googleSheetsConfigured } from "./env";
import {
  appendValues,
  ensureSheet,
  getValues,
  updateValues,
} from "./sheets-api";

/**
 * 예약을 구글 스프레드시트로 백업(단방향: DB → 시트)한다.
 *
 * 알림 발송(lib/notifications/notify.ts)과 같은 자리에서, 같은 정신으로
 * 쓴다 — 예약이 생성/변경되는 모든 지점에서 `after(() =>
 * syncReservationToSheet(id))`로 부르고, 이 함수들은 절대 throw하지
 * 않는다(실패해도 예약 흐름은 이미 끝났고 백업만 못 남긴 것뿐이라
 * console.error로만 남긴다).
 *
 * 탭은 두 개다.
 *   "예약"    — 예약 한 건 = 행 하나(백업/열람용, 예약번호 기준 upsert).
 *   "고객DB"  — 손님 한 명 = 행 하나(연락처 기준 upsert). 이름·성별·
 *              생년월일 같은 인적사항과 "완료" 처리된 예약 기준
 *              방문 이력(첫방문일/최근방문일/총방문횟수)을 그 손님의
 *              모든 예약을 다시 모아 계산한다 — 그래서 삭제·취소처럼
 *              집계에 영향을 줄 수 있는 지점에서만 따로 부른다.
 */

const STATUS_LABEL: Record<string, string> = {
  requested: "접수됨",
  confirmed: "확정됨",
  completed: "촬영 완료",
  cancelled: "취소됨",
  no_show: "노쇼",
};

const GENDER_LABEL: Record<string, string> = { male: "남성", female: "여성" };

const RESERVATION_SHEET = "예약";
const RESERVATION_HEADERS = [
  "예약번호",
  "상태",
  "상품명",
  "촬영일시",
  "예약자",
  "연락처",
  "이메일",
  "인원",
  "성별",
  "생년월일",
  "지불액",
  "지불액메모",
  "원가",
  "원가메모",
  "사장님메모",
  "손님요청사항",
  "등록일",
  "수정일",
];
const RESERVATION_LAST_COLUMN = "R"; // 헤더 18개 = A~R

const CUSTOMER_SHEET = "고객DB";
const CUSTOMER_HEADERS = [
  "고객성명",
  "연령",
  "성별",
  "연락처",
  "메일주소",
  "첫방문일",
  "최근방문일",
  "총방문횟수",
];
const CUSTOMER_LAST_COLUMN = "H"; // 헤더 8개 = A~H
/** 연락처(고유 식별자)가 들어가는 열 — upsert 대상 행을 여기서 찾는다. */
const CUSTOMER_KEY_COLUMN = "D";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${kstDateString(d)} ${kstTimeString(d)}`;
}

async function ensureHeaders(
  sheet: string,
  lastColumn: string,
  headers: string[],
): Promise<void> {
  const first = await getValues(`'${sheet}'!A1:${lastColumn}1`);
  if (first.length > 0 && first[0].some((cell) => cell)) return;
  await updateValues(`'${sheet}'!A1:${lastColumn}1`, [headers]);
}

/** 지정한 열 전체를 읽어 value가 있는 행 번호(1-based)를 찾는다. */
async function findRowByValue(
  sheet: string,
  column: string,
  value: string,
): Promise<number | null> {
  const cells = await getValues(`'${sheet}'!${column}:${column}`);
  const index = cells.findIndex((row) => row[0] === value);
  return index === -1 ? null : index + 1;
}

type ReservationForSheet = {
  code: string;
  status: string;
  shoot_start: string | null;
  shoot_end: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  people_count: number | null;
  gender: string | null;
  birth_date: string | null;
  charged_amount: number | null;
  charged_amount_memo: string | null;
  cost: number | null;
  cost_memo: string | null;
  admin_memo: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

function buildReservationRow(
  reservation: ReservationForSheet,
  productName: string,
): (string | number)[] {
  return [
    reservation.code,
    STATUS_LABEL[reservation.status] ?? reservation.status,
    productName,
    reservation.shoot_start && reservation.shoot_end
      ? `${formatDateTime(reservation.shoot_start)} ~ ${kstTimeString(new Date(reservation.shoot_end))}`
      : "확정 대기 중",
    reservation.customer_name,
    reservation.customer_phone,
    reservation.customer_email ?? "",
    reservation.people_count ?? "",
    reservation.gender ? (GENDER_LABEL[reservation.gender] ?? reservation.gender) : "",
    reservation.birth_date
      ? `${reservation.birth_date} (만 ${calculateAge(reservation.birth_date).manAge}세)`
      : "",
    reservation.charged_amount ?? "",
    reservation.charged_amount_memo ?? "",
    reservation.cost ?? "",
    reservation.cost_memo ?? "",
    reservation.admin_memo ?? "",
    reservation.memo ?? "",
    formatDateTime(reservation.created_at),
    formatDateTime(reservation.updated_at),
  ];
}

async function upsertRow(
  sheet: string,
  lastColumn: string,
  headers: string[],
  keyColumn: string,
  key: string,
  row: (string | number)[],
): Promise<void> {
  await ensureSheet(sheet);
  await ensureHeaders(sheet, lastColumn, headers);

  const rowIndex = await findRowByValue(sheet, keyColumn, key);
  if (rowIndex) {
    await updateValues(`'${sheet}'!A${rowIndex}:${lastColumn}${rowIndex}`, [
      row,
    ]);
  } else {
    await appendValues(`'${sheet}'!A:${lastColumn}`, [row]);
  }
}

/** 예약 하나를 최신 상태로 "예약" 탭에 반영한다(있으면 갱신, 없으면 새 행). */
export async function syncReservationToSheet(
  reservationId: string,
): Promise<void> {
  if (!googleSheetsConfigured()) return;

  try {
    const supabase = await createClient();
    const { data: reservation } = await supabase
      .from("reservations")
      .select(
        "code, status, shoot_start, shoot_end, customer_name, customer_phone, customer_email, people_count, gender, birth_date, charged_amount, charged_amount_memo, cost, cost_memo, admin_memo, memo, created_at, updated_at, product_id",
      )
      .eq("id", reservationId)
      .maybeSingle();
    if (!reservation) return;

    const { data: product } = await supabase
      .from("products")
      .select("name")
      .eq("id", reservation.product_id)
      .maybeSingle();

    await upsertRow(
      RESERVATION_SHEET,
      RESERVATION_LAST_COLUMN,
      RESERVATION_HEADERS,
      "A",
      reservation.code,
      buildReservationRow(reservation, product?.name ?? "(삭제된 상품)"),
    );
  } catch (error) {
    console.error("구글 시트 동기화 실패:", error);
  }
}

/**
 * 예약이 DB에서 완전히 삭제된 뒤 부른다 — 이미 지워진 행이라 다시
 * 조회할 수 없으니, "예약" 탭에 남아있는 마지막 기록의 상태 칸만
 * "삭제됨"으로 바꾼다(백업 목적상 행 자체를 지우지 않고 마지막 기록을
 * 남겨둔다). 애초에 한 번도 동기화된 적 없는 예약(시트에 없음)이면
 * 조용히 넘어간다.
 */
export async function markReservationDeletedInSheet(
  code: string,
): Promise<void> {
  if (!googleSheetsConfigured()) return;

  try {
    await ensureSheet(RESERVATION_SHEET);
    const rowIndex = await findRowByValue(RESERVATION_SHEET, "A", code);
    if (!rowIndex) return;
    await updateValues(`'${RESERVATION_SHEET}'!B${rowIndex}`, [["삭제됨"]]);
  } catch (error) {
    console.error("구글 시트 삭제 표시 실패:", error);
  }
}

/**
 * 손님 한 명(연락처 기준)의 인적사항·방문 이력을 다시 계산해 "고객DB"
 * 탭에 반영한다. 그 손님의 예약을 전부 다시 모아 계산하므로(단순히
 * 지금 건 하나만 반영하는 게 아니라), 예약 하나가 취소되거나 삭제돼도
 * 항상 정확한 최신 집계가 된다.
 *
 * 방문 = 상태가 "completed"(촬영 완료)로 표시된 예약만 센다 — 확정만
 * 되고 아직 안 온 예약이나, 노쇼·취소는 "방문"이 아니다.
 */
export async function syncCustomerToSheet(phone: string): Promise<void> {
  if (!googleSheetsConfigured() || !phone) return;

  try {
    const supabase = await createClient();
    const { data: rows } = await supabase
      .from("reservations")
      .select("customer_name, customer_email, gender, birth_date, status, shoot_start, created_at")
      .eq("customer_phone", phone)
      .order("created_at", { ascending: false });
    if (!rows || rows.length === 0) return;

    // 이름·이메일·성별·생년월일은 최근 예약 기준으로 채우되, 그 건에
    // 값이 비어 있으면(예: 이번엔 이메일을 안 적음) 과거 예약 중 값이
    // 있는 걸 찾아 채운다.
    const latestName = rows[0].customer_name;
    const email = rows.find((r) => r.customer_email)?.customer_email ?? "";
    const gender = rows.find((r) => r.gender)?.gender;
    const birthDate = rows.find((r) => r.birth_date)?.birth_date;

    const visitDates = rows
      .filter((r) => r.status === "completed" && r.shoot_start)
      .map((r) => new Date(r.shoot_start!))
      .sort((a, b) => a.getTime() - b.getTime());

    const row = [
      latestName,
      birthDate ? calculateAge(birthDate).manAge : "",
      gender ? (GENDER_LABEL[gender] ?? gender) : "",
      phone,
      email,
      visitDates[0] ? kstDateString(visitDates[0]) : "",
      visitDates.length > 0
        ? kstDateString(visitDates[visitDates.length - 1])
        : "",
      visitDates.length,
    ];

    await upsertRow(
      CUSTOMER_SHEET,
      CUSTOMER_LAST_COLUMN,
      CUSTOMER_HEADERS,
      CUSTOMER_KEY_COLUMN,
      phone,
      row,
    );
  } catch (error) {
    console.error("구글 시트 고객DB 동기화 실패:", error);
  }
}
