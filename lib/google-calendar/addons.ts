import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  priceForOption,
  selectedLabelsFromAnswers,
  type CustomField,
} from "@/lib/booking/custom-fields-shared";

/** 유료 선택 문항과 '추가옵션' 문항의 무료 선택도 캘린더에 표시합니다. */
export function calendarAddonLines(
  fields: CustomField[],
  answers: { fieldId: string; value: string }[],
): string[] {
  const selected = selectedLabelsFromAnswers(fields, answers);
  return [...fields]
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter(
      (field) =>
        /추가\s*옵션/.test(field.label) ||
        field.option_prices?.some((price) => price !== 0),
    )
    .flatMap((field) =>
      (selected.get(field.id) ?? []).map((label) => {
        const price = priceForOption(field, label);
        return price === 0
          ? label
          : `${label} (${price > 0 ? "+" : ""}${price.toLocaleString("ko-KR")}원)`;
      }),
    );
}

export async function loadCalendarAddonLines(reservationId: string) {
  const supabase = createAdminClient();
  const { data: answers, error: answerError } = await supabase
    .from("reservation_answers")
    .select("field_id, value")
    .eq("reservation_id", reservationId);
  // 조회 실패를 옵션 '없음'으로 덮어쓰지 않습니다.
  if (answerError || !answers)
    throw new Error("캘린더 추가옵션 답변 조회 실패");
  if (!answers.length) return [];
  const { data: fields, error: fieldError } = await supabase
    .from("custom_fields")
    .select("*")
    .in("id", [...new Set(answers.map((a) => a.field_id))]);
  if (fieldError || !fields) throw new Error("캘린더 추가옵션 문항 조회 실패");
  return calendarAddonLines(
    fields,
    answers.map((a) => ({ fieldId: a.field_id, value: a.value })),
  );
}
