import {
  EMAIL_VARIABLES,
  renderEmailTemplate,
  type CtaButton,
} from "./email-rules-shared";
export type CustomerEmailContext = {
  phone: string;
  name: string;
  reservations: {
    id: string;
    label: string;
    variables: Record<string, string>;
  }[];
  variables: Record<string, string>;
};
export function parseCustomerVariableOverrides(
  raw: string,
): Record<string, string> {
  const value: unknown = JSON.parse(raw || "{}");
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("변수 입력 형식이 올바르지 않습니다.");
  const allowed = new Set(EMAIL_VARIABLES.map((v) => v.key));
  const result: Record<string, string> = {};
  for (const [key, text] of Object.entries(value)) {
    if (!allowed.has(key) || typeof text !== "string" || text.length > 10000)
      throw new Error("변수 입력을 확인해 주시기 바랍니다.");
    result[key] = text;
  }
  return result;
}
export function customerEmailValues(
  context: CustomerEmailContext,
  reservationId: string,
  overrides: Record<string, string>,
) {
  const reservation = reservationId
    ? context.reservations.find((r) => r.id === reservationId)
    : null;
  if (reservationId && !reservation)
    throw new Error(
      "선택한 예약이 해당 고객의 예약이 아닙니다. 다시 불러와 주세요.",
    );
  return { ...(reservation?.variables ?? context.variables), ...overrides };
}
export function renderCustomerCtas(
  ctas: CtaButton[],
  variables: Record<string, string>,
): CtaButton[] {
  return ctas.map((c) => ({
    text: renderEmailTemplate(c.text, variables),
    url: renderEmailTemplate(c.url, variables),
  }));
}
