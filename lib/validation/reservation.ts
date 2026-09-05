import { z } from "zod";

/**
 * 예약 신청 폼 검증.
 */
export const reservationSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "시간 형식이 올바르지 않습니다."),
  customerName: z.string().trim().min(1, "이름을 입력해주세요.").max(50),
  customerPhone: z
    .string()
    .trim()
    .regex(/^01[0-9]{8,9}$/, "연락처는 숫자만, 010으로 시작해 입력해주세요."),
  peopleCount: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(100)])
    .transform((value) => (value === "" ? null : value)),
  memo: z.string().trim().max(500).optional().default(""),
  agreePrivacy: z.literal("on", {
    error: "개인정보 수집·이용에 동의해주세요.",
  }),
});

export type ReservationInput = z.infer<typeof reservationSchema>;

/**
 * 관리자가 전화·DM으로 받은 예약을 직접 등록할 때. 손님용 폼과 거의
 * 같은 규칙이지만 개인정보 동의 체크박스가 없다 — 관리자가 이미 통화로
 * 확인하고 넣는 것이라 화면에 그 동의 문구를 보여줄 대상이 없다.
 */
export const manualReservationSchema = reservationSchema
  .omit({ agreePrivacy: true })
  .extend({
    productId: z.string().uuid("상품을 선택해주세요."),
  });

export type ManualReservationInput = z.infer<typeof manualReservationSchema>;

const phoneField = z
  .string()
  .trim()
  .regex(/^01[0-9]{8,9}$/, "연락처는 숫자만, 010으로 시작해 입력해주세요.");

/** 전화번호만으로 예약 목록을 찾을 때. */
export const phoneLookupSchema = z.object({
  phone: phoneField,
});

/**
 * 예약번호 + 연락처로 정확히 한 건을 집을 때(취소 직전 등).
 * 예약번호는 화면에 항상 대문자로 보여주지만, 손님이 소문자로 치거나
 * 붙여넣기 하면서 앞뒤 공백이 붙을 수 있어 정리한다.
 */
export const lookupSchema = z.object({
  code: z.string().trim().toUpperCase().min(1, "예약번호를 입력해주세요."),
  phone: phoneField,
});
