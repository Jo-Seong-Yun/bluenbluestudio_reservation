import {
  birthDateField,
  emailField,
  nameField,
  phoneField,
} from "@/lib/validation/reservation";
import { fieldFormName, type CustomField } from "./custom-fields-shared";

/** Enter 이동과 전체 확인이 서버와 같은 문항 조건을 검사합니다. */
export function bookingFieldError(
  field: CustomField,
  data: FormData,
): string | null {
  const values = data.getAll(fieldFormName(field.id)).map(String);
  const raw = (values[0] ?? "").trim();
  if (field.type === "multi_choice") {
    if (field.required && values.length === 0)
      return "하나 이상 선택해 주십시오.";
    if (values.some((v) => !(field.options ?? []).includes(v)))
      return "선택 항목을 확인해 주십시오.";
    return null;
  }
  if (field.type === "checkbox")
    return field.required && values.length === 0
      ? "안내를 확인하고 선택해 주십시오."
      : null;
  if (field.required && !raw) return `"${field.label}"에 답변해 주십시오.`;
  if (!raw) return null;
  if (field.type === "single_choice" && !(field.options ?? []).includes(raw))
    return "선택 항목을 확인해 주십시오.";
  if (field.type === "gender" && !["male", "female"].includes(raw))
    return "성별을 선택해 주십시오.";
  const schema =
    field.type === "name"
      ? nameField
      : field.type === "phone"
        ? phoneField
        : field.type === "email"
          ? emailField
          : field.type === "birth_date"
            ? birthDateField
            : null;
  if (schema) {
    const result = schema.safeParse(raw);
    return result.success
      ? null
      : (result.error.issues[0]?.message ?? "입력값을 확인해 주십시오.");
  }
  const maxLength = field.type === "long_text" ? 1000 : 200;
  return raw.length > maxLength
    ? `${maxLength}자 이내로 입력해 주십시오.`
    : null;
}
