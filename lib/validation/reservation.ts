import { z } from "zod";
import { parseBirthDate8 } from "../age";
import { kstToday } from "../time";

/**
 * 연락처. 하이픈을 넣든 안 넣든("010-1234-5678", "01012345678") 알아서
 * 숫자만 남기고 인식한다.
 */
const phoneField = z
  .string()
  .trim()
  .transform((value) => value.replace(/[^0-9]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^01[0-9]{8,9}$/, "연락처는 숫자만, 010으로 시작해 입력해주세요."),
  );

/** "19990101" 8자리 → "1999-01-01". 실존하는 날짜, 미래가 아닌 날짜만 통과한다. */
const birthDateField = z
  .string()
  .trim()
  .regex(/^\d{8}$/, "생년월일 8자리를 입력해주세요. 예: 19990101")
  .refine((value) => parseBirthDate8(value) !== null, {
    message: "실제 존재하는 날짜를 입력해주세요.",
  })
  .refine((value) => (parseBirthDate8(value) ?? "9999-99-99") <= kstToday(), {
    message: "생년월일이 미래일 수 없어요.",
  })
  .transform((value) => parseBirthDate8(value)!);

const genderField = z.enum(["male", "female"], {
  error: "성별을 선택해주세요.",
});

/**
 * 예약 신청 폼 검증.
 */
export const reservationSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "시간 형식이 올바르지 않습니다."),
  customerName: z.string().trim().min(1, "이름을 입력해주세요.").max(50),
  customerPhone: phoneField,
  // 선택 입력. 입력하면 SMS와 함께 이메일로도 안내를 보낸다.
  customerEmail: z
    .union([
      z.literal(""),
      z.string().trim().email("이메일 형식을 확인해주세요."),
    ])
    .optional()
    .default("")
    .transform((value) => (value ? value : null)),
  gender: genderField,
  birthDate: birthDateField,
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
 * 성별·생년월일도 전화로 못 물어봤을 수 있어 선택 입력으로 둔다.
 */
export const manualReservationSchema = reservationSchema
  .omit({ agreePrivacy: true, gender: true, birthDate: true })
  .extend({
    productId: z.string().uuid("상품을 선택해주세요."),
    gender: genderField.optional(),
    birthDate: z
      .union([z.literal(""), birthDateField])
      .optional()
      .default(""),
  });

export type ManualReservationInput = z.infer<typeof manualReservationSchema>;

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
