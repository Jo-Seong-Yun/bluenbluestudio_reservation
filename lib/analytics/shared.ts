import { z } from "zod";
import type { CustomField } from "@/lib/booking/custom-fields-shared";
export const interactionKinds = [
  "month_change",
  "slots_error",
  "field_focus",
  "date_select",
  "time_select",
  "time_remove",
  "times_continue",
  "page_view",
  "page_next",
  "page_back",
  "field_change",
  "option_select",
  "option_deselect",
  "form_restore",
  "visibility_change",
] as const;
export const summaryEventKinds = [
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
  "completed",
] as const;
export const eventDetailsSchema = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .optional(),
    pageId: z.number().int().min(0).max(999).optional(),
    fromPage: z.number().int().min(0).max(999).optional(),
    toPage: z.number().int().min(0).max(999).optional(),
    optionIndex: z.number().int().min(0).max(1000).optional(),
    selectedCount: z.number().int().min(0).max(1000).optional(),
    date: z.iso.date().optional(),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    visibility: z.enum(["visible", "hidden"]).optional(),
  })
  .strict();
export type EventDetails = z.infer<typeof eventDetailsSchema>;
export const eventLabels: Record<string, string> = {
  list_view: "상품 목록 진입",
  detail_view: "상품 상세 진입",
  times_view: "일정 선택 진입",
  form_view: "신청서 진입",
  review_view: "최종 확인",
  completed: "접수 완료",
  field_view: "문항 진입",
  field_valid: "답변 검증 완료",
  field_invalid: "답변 미완료",
  field_error: "문항 오류",
  submit_attempt: "접수 시도",
  submit_error: "접수 실패",
  month_change: "달력 월 이동",
  slots_error: "희망 시간 조회 실패",
  field_focus: "입력란 초점",
  date_select: "날짜 선택",
  time_select: "희망 시간 추가",
  time_remove: "희망 시간 삭제",
  times_continue: "일정 선택 완료",
  page_view: "신청서 페이지 진입",
  page_next: "다음 페이지 이동",
  page_back: "이전 페이지 이동",
  field_change: "문항 입력 변경",
  option_select: "선택지 선택",
  option_deselect: "선택지 해제",
  form_restore: "작성 내용 복원",
  visibility_change: "화면 표시 변경",
};
export const clientEventKinds = [
  ...interactionKinds,
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
    details: eventDetailsSchema.optional(),
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
