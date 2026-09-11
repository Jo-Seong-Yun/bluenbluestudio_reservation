import { z } from "zod";
import { parseBirthDate8 } from "../age";
import { kstToday } from "../time";

/**
 * 이름·연락처·이메일·성별·생년월일은 더 이상 이 파일에 고정된 필드가
 * 아니다 — 상품마다 문항편집에서 만드는 custom_fields 중 하나(타입이
 * name/phone/email/gender/birth_date)일 뿐이고, 있을 수도 없을 수도
 * 있다. 검증 규칙만 여기 남겨서 손님용 동적 신청서(lib/booking/
 * custom-fields.ts)와 관리자 수기 등록(manualReservationSchema)이
 * 같은 규칙을 쓰게 한다.
 */
export const nameField = z
  .string()
  .trim()
  .min(1, "이름을 입력해 주시기 바랍니다.")
  .max(50);

/**
 * 연락처. 하이픈을 넣든 안 넣든("010-1234-5678", "01012345678") 알아서
 * 숫자만 남기고 인식한다.
 */
export const phoneField = z
  .string()
  .trim()
  .transform((value) => value.replace(/[^0-9]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^01[0-9]{8,9}$/, "연락처는 숫자만, 010으로 시작해 입력해 주시기 바랍니다."),
  );

/** 빈 문자열이면 null로, 아니면 이메일 형식을 검사한다. */
export const emailField = z
  .union([
    z.literal(""),
    z.string().trim().email("이메일 형식을 확인해 주시기 바랍니다."),
  ])
  .transform((value) => (value ? value : null));

export const genderField = z.enum(["male", "female"], {
  error: "성별을 선택해 주시기 바랍니다.",
});

/** "19990101" 8자리 → "1999-01-01". 실존하는 날짜, 미래가 아닌 날짜만 통과한다. */
export const birthDateField = z
  .string()
  .trim()
  .regex(/^\d{8}$/, "생년월일 8자리를 입력해 주시기 바랍니다. 예: 19990101")
  .refine((value) => parseBirthDate8(value) !== null, {
    message: "실제 존재하는 날짜를 입력해 주시기 바랍니다.",
  })
  .refine((value) => (parseBirthDate8(value) ?? "9999-99-99") <= kstToday(), {
    message: "생년월일이 미래일 수 없습니다.",
  })
  .transform((value) => parseBirthDate8(value)!);

const candidateSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "시간 형식이 올바르지 않습니다."),
});

export type CandidateInput = z.infer<typeof candidateSchema>;

/**
 * 예약 신청 폼 검증. 날짜·시간·개인정보 동의는 예약이라는 행위 자체에
 * 항상 딸린 것이라 문항편집 대상이 아니고, 여기 고정으로 남는다. 이름
 * 이하 문항들은 lib/booking/custom-fields.ts의 extractReservationFormData가
 * 상품별 custom_fields 목록을 보고 그때그때 검증한다.
 *
 * 손님이 시간 하나가 아니라 최대 3개까지 후보(1지망~3지망)를 낼 수
 * 있다 — 관리자가 그중 하나를 골라 확정한다. 후보는 1개 이상 3개
 * 이하이고, 같은 (날짜,시간) 조합을 중복으로 낼 수 없다(의미가 없어서).
 */
export const reservationSchema = z.object({
  candidates: z
    .array(candidateSchema)
    .min(1, "최소 1개 이상의 희망 시간을 선택해 주시기 바랍니다.")
    .max(3, "희망 시간은 최대 3개까지 선택할 수 있습니다.")
    .refine(
      (list) => {
        const keys = list.map((c) => `${c.date}T${c.time}`);
        return new Set(keys).size === keys.length;
      },
      { message: "같은 시간을 두 번 이상 선택할 수 없습니다." },
    ),
  agreePrivacy: z.literal("on", {
    error: "개인정보 수집·이용에 동의해 주시기 바랍니다.",
  }),
});

export type ReservationInput = z.infer<typeof reservationSchema>;

/**
 * 관리자가 전화·DM으로 받은 예약을 직접 등록할 때. 손님용 문항편집과
 * 무관한, 관리자 전용의 고정된 빠른 등록 폼이라 독립적으로 정의한다 —
 * 개인정보 동의 체크박스가 없고(이미 통화로 확인했으니), 성별·생년월일도
 * 아예 받지 않는다(전화로 못 물어봤을 수 있어서).
 */
export const manualReservationSchema = z.object({
  productId: z.string().uuid("상품을 선택해 주시기 바랍니다."),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "시간 형식이 올바르지 않습니다."),
  customerName: nameField,
  customerPhone: phoneField,
  peopleCount: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(100)])
    .transform((value) => (value === "" ? null : value)),
  memo: z.string().trim().max(500).optional().default(""),
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
  code: z.string().trim().toUpperCase().min(1, "예약번호를 입력해 주시기 바랍니다."),
  phone: phoneField,
});
