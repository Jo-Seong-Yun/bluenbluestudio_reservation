import "server-only";
import { createClient } from "@/lib/supabase/server";
import { kstDateString, kstTimeString, weekdayOf } from "@/lib/time";
import {
  APPLICANT_FIELD_LABELS,
  SNS_CONSENT_FIELD_LABEL,
  selectedLabelsFromAnswers,
  selectedPricedOptions,
  type CustomField,
} from "@/lib/booking/custom-fields-shared";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const GENDER_LABEL: Record<string, string> = { male: "남", female: "여" };

/** lib/record-sheet/template.docx의 {태그}와 이름을 맞춘 값들. */
export type RecordSheetTags = {
  성명: string;
  생년월일: string;
  성별: string;
  연락처: string;
  이메일: string;
  신청자성명: string;
  신청자생년월일: string;
  신청자성별: string;
  신청자연락처: string;
  신청자관계: string;
  촬영일시: string;
  전달예정일: string;
  기본가: string;
  옵션1라벨: string;
  옵션1금액: string;
  옵션2라벨: string;
  옵션2금액: string;
  옵션3라벨: string;
  옵션3금액: string;
  옵션4라벨: string;
  옵션4금액: string;
  합계: string;
  계좌: string;
  SNS동의: string;
  서명일: string;
};

export type RecordSheetResult =
  | { ok: true; productName: string; code: string; tags: RecordSheetTags }
  | { ok: false; error: string };

function formatShootDateTime(instant: Date): string {
  const date = kstDateString(instant);
  const [y, m, d] = date.split("-");
  const weekday = WEEKDAY_LABELS[weekdayOf(date)];
  return `${y}. ${m}. ${d}. (${weekday}) ${kstTimeString(instant)}`;
}

function formatSignDate(instant: Date): string {
  const [y, m, d] = kstDateString(instant).split("-");
  return `${y}. ${Number(m)}. ${Number(d)}.`;
}

/** 문항 라벨로 답변 하나를 찾는다 — 관리자가 문항편집에서 라벨을 그대로
 * 고정해서 써야 매칭이 유지된다(custom-fields-shared.ts의 상수 참고). */
function answerByLabel(
  fields: CustomField[],
  answers: { field_id: string; value: string }[],
  label: string,
): string {
  const field = fields.find((f) => f.label === label);
  if (!field) return "";
  return answers.find((a) => a.field_id === field.id)?.value ?? "";
}

/**
 * 예약 하나의 정보를 촬영 기록표 양식(lib/record-sheet/template.docx)의
 * 병합 필드에 맞춰 채운다. docx 다운로드 라우트와 인쇄 미리보기 페이지가
 * 둘 다 이 함수 하나로 같은 데이터를 얻어써서, 두 화면이 어긋나지 않는다.
 */
export async function buildRecordSheetData(
  reservationId: string,
): Promise<RecordSheetResult> {
  const supabase = await createClient();

  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      "id, code, product_id, customer_name, customer_phone, customer_email, gender, birth_date, shoot_start, estimated_amount, charged_amount",
    )
    .eq("id", reservationId)
    .maybeSingle();

  if (!reservation) return { ok: false, error: "예약을 찾을 수 없습니다." };
  if (!reservation.shoot_start) {
    return {
      ok: false,
      error:
        "아직 날짜가 확정되지 않은 예약입니다. 먼저 희망 시간 중 하나를 확정해 주시기 바랍니다.",
    };
  }

  const [
    { data: product },
    { data: settings },
    { data: customFields },
    { data: answerRows },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("name, price, sale_price, delivery_note")
      .eq("id", reservation.product_id)
      .single(),
    supabase.from("settings").select("bank_account").eq("id", 1).single(),
    supabase
      .from("custom_fields")
      .select(
        "id, product_id, label, type, options, option_prices, description, required, active, sort_order, created_at",
      )
      .eq("product_id", reservation.product_id),
    supabase
      .from("reservation_answers")
      .select("field_id, value")
      .eq("reservation_id", reservationId),
  ]);

  if (!product) return { ok: false, error: "상품 정보를 찾을 수 없습니다." };

  const fields: CustomField[] = customFields ?? [];
  const answers = answerRows ?? [];

  const basePrice = product.sale_price ?? product.price;
  const selectedLabels = selectedLabelsFromAnswers(
    fields,
    answers.map((a) => ({ fieldId: a.field_id, value: a.value })),
  );
  const pricedItems = selectedPricedOptions(fields, selectedLabels);

  // 서식엔 옵션 칸이 4개뿐이다 — 5개 이상 고른 경우 앞 3개는 그대로,
  // 나머지는 "외 N건"으로 묶어 4번째 칸에 합쳐 보여준다.
  const optionRows: { label: string; price: number }[] = [];
  if (pricedItems.length <= 4) {
    optionRows.push(...pricedItems);
  } else {
    optionRows.push(...pricedItems.slice(0, 3));
    const rest = pricedItems.slice(3);
    optionRows.push({
      label: `외 ${rest.length}건`,
      price: rest.reduce((sum, item) => sum + item.price, 0),
    });
  }
  while (optionRows.length < 4) optionRows.push({ label: "", price: 0 });

  const itemizedTotal =
    basePrice + pricedItems.reduce((sum, item) => sum + item.price, 0);
  const finalTotal =
    reservation.charged_amount ?? reservation.estimated_amount ?? itemizedTotal;

  const money = (n: number) => n.toLocaleString();

  const tags: RecordSheetTags = {
    성명: reservation.customer_name,
    생년월일: reservation.birth_date ?? "",
    성별: reservation.gender ? (GENDER_LABEL[reservation.gender] ?? "") : "",
    연락처: reservation.customer_phone,
    이메일: reservation.customer_email ?? "",
    신청자성명: answerByLabel(fields, answers, APPLICANT_FIELD_LABELS.name),
    신청자생년월일: answerByLabel(
      fields,
      answers,
      APPLICANT_FIELD_LABELS.birthDate,
    ),
    신청자성별: answerByLabel(fields, answers, APPLICANT_FIELD_LABELS.gender),
    신청자연락처: answerByLabel(fields, answers, APPLICANT_FIELD_LABELS.phone),
    신청자관계: answerByLabel(fields, answers, APPLICANT_FIELD_LABELS.relation),
    촬영일시: formatShootDateTime(new Date(reservation.shoot_start)),
    전달예정일: product.delivery_note ?? "",
    기본가: money(basePrice),
    옵션1라벨: optionRows[0].label,
    옵션1금액: optionRows[0].price ? money(optionRows[0].price) : "",
    옵션2라벨: optionRows[1].label,
    옵션2금액: optionRows[1].price ? money(optionRows[1].price) : "",
    옵션3라벨: optionRows[2].label,
    옵션3금액: optionRows[2].price ? money(optionRows[2].price) : "",
    옵션4라벨: optionRows[3].label,
    옵션4금액: optionRows[3].price ? money(optionRows[3].price) : "",
    합계: money(finalTotal),
    계좌: settings?.bank_account ?? "",
    SNS동의: answerByLabel(fields, answers, SNS_CONSENT_FIELD_LABEL),
    서명일: formatSignDate(new Date()),
  };

  return {
    ok: true,
    productName: product.name,
    code: reservation.code,
    tags,
  };
}
