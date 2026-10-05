import { z } from "zod";
import type { CustomField } from "@/lib/booking/custom-fields-shared";
export const clientEventKinds = [
  "list_view",
  "detail_view",
  "times_view",
  "form_view",
  "review_view",
  "field_view",
  "field_valid",
  "field_invalid",
  "field_error",
  "submit_attempt",
  "submit_error",
] as const;
export type AnalyticsKind = (typeof clientEventKinds)[number] | "completed";
export const analyticsEventSchema = z
  .object({
    occurredAt: z.iso.datetime(),
    id: z.uuid(),
    sessionId: z.uuid(),
    attemptId: z.uuid().nullable(),
    productId: z.uuid().nullable(),
    kind: z.enum(clientEventKinds),
    ref: z.string().max(50).nullable(),
    device: z.enum(["mobile", "desktop"]),
    formVersion: z
      .string()
      .regex(/^[a-f0-9]{8}$/)
      .nullable(),
    fieldId: z.uuid().nullable(),
    durationMs: z.number().int().min(0).max(86400000).nullable(),
    errorCode: z.enum(["validation", "availability", "server"]).nullable(),
  })
  .strict();
export type ClientAnalyticsEvent = z.infer<typeof analyticsEventSchema>;
export const batchSchema = z.array(analyticsEventSchema).min(1).max(30);
/** 문항 추가·순서·필수·선택지 변경 전후를 다른 버전으로 분석합니다. 답변은 포함하지 않습니다. */
export function bookingFormVersion(fields: CustomField[]): string {
  const text = JSON.stringify(
    fields.map((f) => [
      f.id,
      f.label,
      f.type,
      f.required,
      f.sort_order,
      f.options,
      f.option_prices,
    ]),
  );
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}
