import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type CustomField = Database["public"]["Tables"]["custom_fields"]["Row"];

/** 예약 폼에 붙일 커스텀 문항을 순서대로 가져온다. */
export async function loadActiveCustomFields(): Promise<CustomField[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_fields")
    .select("id, label, type, options, required, sort_order, created_at")
    .order("sort_order");
  return data ?? [];
}

/** 문항 하나의 FormData 필드 이름. 폼과 액션이 같은 규칙을 써야 한다. */
export function fieldFormName(fieldId: string): string {
  return `custom_${fieldId}`;
}

export type CustomFieldAnswer = { fieldId: string; value: string };

export type ExtractAnswersResult =
  { ok: true; answers: CustomFieldAnswer[] } | { ok: false; error: string };

/**
 * FormData에서 커스텀 문항 답변을 뽑는다. 필수인데 비어 있으면 그
 * 즉시 에러 메시지를 돌려준다(다른 필드처럼 폼 전체를 한 번에 검사
 * 하진 않는다 — 문항 수가 가변적이라 이 정도로 충분하다).
 */
export function extractCustomFieldAnswers(
  fields: CustomField[],
  formData: FormData,
): ExtractAnswersResult {
  const answers: CustomFieldAnswer[] = [];

  for (const field of fields) {
    const name = fieldFormName(field.id);

    if (field.type === "multi_choice") {
      const values = formData.getAll(name).map(String).filter(Boolean);
      if (field.required && values.length === 0) {
        return { ok: false, error: `"${field.label}"에 답해주세요.` };
      }
      if (values.length > 0) {
        answers.push({ fieldId: field.id, value: JSON.stringify(values) });
      }
      continue;
    }

    if (field.type === "checkbox") {
      const checked = formData.get(name) === "on";
      if (field.required && !checked) {
        return { ok: false, error: `"${field.label}"에 동의해주세요.` };
      }
      answers.push({ fieldId: field.id, value: checked ? "true" : "false" });
      continue;
    }

    const raw = String(formData.get(name) ?? "").trim();
    if (field.required && !raw) {
      return { ok: false, error: `"${field.label}"에 답해주세요.` };
    }
    if (raw) {
      answers.push({ fieldId: field.id, value: raw });
    }
  }

  return { ok: true, answers };
}
