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
 * 예약 조회 폼 검증. 예약번호는 화면에 항상 대문자로 보여주지만,
 * 손님이 소문자로 치거나 붙여넣기 하면서 앞뒤 공백이 붙을 수 있어 정리한다.
 */
export const lookupSchema = z.object({
  code: z.string().trim().toUpperCase().min(1, "예약번호를 입력해주세요."),
  phone: z
    .string()
    .trim()
    .regex(/^01[0-9]{8,9}$/, "연락처는 숫자만, 010으로 시작해 입력해주세요."),
});
