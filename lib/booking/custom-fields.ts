import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  nameField,
  phoneField,
  emailField,
  genderField,
  birthDateField,
} from "@/lib/validation/reservation";
import {
  fieldFormName,
  selectedLabelsFromAnswers,
  selectedPricedOptions,
  type CustomField,
  type PricedSelection,
} from "./custom-fields-shared";

export type { CustomField, PricedSelection };
export {
  SPECIAL_FIELD_TYPES,
  FIELD_TYPE_LABELS,
  fieldFormName,
} from "./custom-fields-shared";
export type { SpecialFieldType } from "./custom-fields-shared";

/**
 * 이미 접수된 예약 하나가 선택한 유료 옵션 목록 — 이메일의
 * {{추가옵션}}/{{모든옵션}} 변수용. 신청 시점 계산(selectedPricedOptions)과
 * 같은 로직을 reservation_answers에 실제 저장된 답변에 그대로 적용한다.
 * 문항이 나중에 삭제되거나 가격이 바뀌면 그 이후엔 신청 당시와 다른
 * 값이 나올 수 있다 — 답변 자체에 당시 가격을 따로 못박아 두지 않기
 * 때문이다(지금 규모에서는 감수할 만한 단순화).
 *
 * 관리용 클라이언트를 쓴다 — 접수(on_requested) 알림은 손님이 방금 낸
 * 요청 안에서(관리자 로그인 세션 없이) 나가는데, reservation_answers는
 * "관리자만 답변 관리" RLS라 로그인 세션 기반 클라이언트로는 못 읽는다
 * (손님 쪽엔 등록만 허용돼 있다 — supabase/migrations의 정책 참고).
 */
export async function loadSelectedPricedOptions(
  reservationId: string,
): Promise<PricedSelection[]> {
  const supabase = createAdminClient();
  const { data: answers } = await supabase
    .from("reservation_answers")
    .select("field_id, value")
    .eq("reservation_id", reservationId);
  if (!answers || answers.length === 0) return [];

  const fieldIds = [...new Set(answers.map((a) => a.field_id))];
  const { data: fields } = await supabase
    .from("custom_fields")
    .select(
      "id, product_id, label, type, options, option_prices, description, required, active, sort_order, created_at",
    )
    .in("id", fieldIds);
  if (!fields || fields.length === 0) return [];

  const selectedLabels = selectedLabelsFromAnswers(
    fields,
    answers.map((a) => ({ fieldId: a.field_id, value: a.value })),
  );
  return selectedPricedOptions(fields, selectedLabels);
}

/** 이 상품의 예약 폼에 붙일, 켜져 있는 문항을 순서대로 가져온다. */
export async function loadActiveCustomFields(
  productId: string,
): Promise<CustomField[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_fields")
    .select(
      "id, product_id, label, type, options, option_prices, description, required, active, sort_order, created_at",
    )
    .eq("product_id", productId)
    .eq("active", true)
    .order("sort_order");
  return data ?? [];
}

export type CustomFieldAnswer = { fieldId: string; value: string };

/** 이름/연락처/이메일/성별/생년월일 문항의 답변. reservations INSERT에 그대로 실린다. */
export type SpecialAnswers = {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  gender: "male" | "female" | null;
  birthDate: string | null;
};

const EMPTY_SPECIAL_ANSWERS: SpecialAnswers = {
  customerName: "",
  customerPhone: "",
  customerEmail: null,
  gender: null,
  birthDate: null,
};

export type ExtractReservationResult =
  | { ok: true; special: SpecialAnswers; answers: CustomFieldAnswer[] }
  | { ok: false; error: string };

/**
 * FormData에서 이 상품의 문항 답변을 전부 뽑는다. 이름/연락처/이메일/
 * 성별/생년월일은 special로, 나머지(인원·요청사항을 포함한 일반 문항)는
 * answers로 나뉜다. 필수인데 비어 있으면 그 즉시 에러 메시지를
 * 돌려준다(다른 필드처럼 폼 전체를 한 번에 검사하진 않는다 — 문항 수가
 * 가변적이라 이 정도로 충분하다).
 */
export function extractReservationFormData(
  fields: CustomField[],
  formData: FormData,
): ExtractReservationResult {
  const special: SpecialAnswers = { ...EMPTY_SPECIAL_ANSWERS };
  const answers: CustomFieldAnswer[] = [];

  for (const field of fields) {
    const name = fieldFormName(field.id);

    if (field.type === "name") {
      const raw = String(formData.get(name) ?? "").trim();
      if (field.required && !raw) {
        return { ok: false, error: `"${field.label}"에 답변해 주시기 바랍니다.` };
      }
      if (raw) {
        const parsed = nameField.safeParse(raw);
        if (!parsed.success) {
          return {
            ok: false,
            error: parsed.error.issues[0]?.message ?? "이름을 확인해 주시기 바랍니다.",
          };
        }
        special.customerName = parsed.data;
      }
      continue;
    }

    if (field.type === "phone") {
      const raw = String(formData.get(name) ?? "").trim();
      if (field.required && !raw) {
        return { ok: false, error: `"${field.label}"에 답변해 주시기 바랍니다.` };
      }
      if (raw) {
        const parsed = phoneField.safeParse(raw);
        if (!parsed.success) {
          return {
            ok: false,
            error: parsed.error.issues[0]?.message ?? "연락처를 확인해 주시기 바랍니다.",
          };
        }
        special.customerPhone = parsed.data;
      }
      continue;
    }

    if (field.type === "email") {
      const raw = String(formData.get(name) ?? "").trim();
      if (field.required && !raw) {
        return { ok: false, error: `"${field.label}"에 답변해 주시기 바랍니다.` };
      }
      const parsed = emailField.safeParse(raw);
      if (!parsed.success) {
        return {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "이메일을 확인해 주시기 바랍니다.",
        };
      }
      if (parsed.data) special.customerEmail = parsed.data;
      continue;
    }

    if (field.type === "gender") {
      const raw = formData.get(name);
      if (field.required && !raw) {
        return { ok: false, error: `"${field.label}"을 선택해 주시기 바랍니다.` };
      }
      if (raw) {
        const parsed = genderField.safeParse(String(raw));
        if (!parsed.success) {
          return { ok: false, error: `"${field.label}"을 선택해 주시기 바랍니다.` };
        }
        special.gender = parsed.data;
      }
      continue;
    }

    if (field.type === "birth_date") {
      const raw = String(formData.get(name) ?? "").trim();
      if (field.required && !raw) {
        return { ok: false, error: `"${field.label}"을 입력해 주시기 바랍니다.` };
      }
      if (raw) {
        const parsed = birthDateField.safeParse(raw);
        if (!parsed.success) {
          return {
            ok: false,
            error:
              parsed.error.issues[0]?.message ?? "생년월일을 확인해 주시기 바랍니다.",
          };
        }
        special.birthDate = parsed.data;
      }
      continue;
    }

    if (field.type === "multi_choice") {
      const values = formData.getAll(name).map(String).filter(Boolean);
      if (field.required && values.length === 0) {
        return { ok: false, error: `"${field.label}"에 답변해 주시기 바랍니다.` };
      }
      if (values.length > 0) {
        answers.push({ fieldId: field.id, value: JSON.stringify(values) });
      }
      continue;
    }

    if (field.type === "checkbox") {
      const checked = formData.get(name) === "on";
      if (field.required && !checked) {
        return { ok: false, error: `"${field.label}"에 동의해 주시기 바랍니다.` };
      }
      answers.push({ fieldId: field.id, value: checked ? "true" : "false" });
      continue;
    }

    const raw = String(formData.get(name) ?? "").trim();
    if (field.required && !raw) {
      return { ok: false, error: `"${field.label}"에 답변해 주시기 바랍니다.` };
    }
    if (raw) {
      answers.push({ fieldId: field.id, value: raw });
    }
  }

  return { ok: true, special, answers };
}
