import { z } from "zod";
import {
  nameField,
  phoneField,
  emailField,
  birthDateField,
} from "@/lib/validation/reservation";
import { kstToInstant, kstDateString, kstTimeString } from "@/lib/time";
import type { Database } from "@/lib/supabase/database.types";
export type EditableReservation =
  Database["public"]["Tables"]["reservations"]["Row"];
export type EditData = {
  reservation: EditableReservation;
  products: {
    id: string;
    name: string;
    duration_min: number;
    buffer_after_min: number;
  }[];
  fields: {
    id: string;
    product_id: string | null;
    label: string;
    type: string;
    options: string[] | null;
    required: boolean;
    active: boolean;
  }[];
  answers: { field_id: string; value: string }[];
  candidates: { rank: number; shoot_start: string; shoot_end: string }[];
};
const amount = z
  .union([z.literal(""), z.coerce.number().int().min(0).max(2147483647)])
  .transform((v) => (v === "" ? null : v));
const instant = z
  .string()
  .refine(
    (v) =>
      !v ||
      (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) &&
        (() => {
          try {
            const d = kstToInstant(v.slice(0, 10), v.slice(11));
            return kstDateString(d) + "T" + kstTimeString(d) === v;
          } catch {
            return false;
          }
        })()),
    "날짜와 시간을 확인해 주세요.",
  )
  .transform((v) =>
    v ? kstToInstant(v.slice(0, 10), v.slice(11)).toISOString() : null,
  );
export const reservationEditSchema = z
  .object({
    id: z.uuid(),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    code: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .regex(/^[A-Za-z0-9]+$/, "예약번호는 영문·숫자로 입력해 주세요.")
      .transform((v) => v.toUpperCase()),
    product_id: z.uuid(),
    status: z.enum([
      "requested",
      "schedule_confirmed",
      "payment_confirmed",
      "completed",
      "cancelled",
      "no_show",
    ]),
    customer_name: nameField,
    customer_phone: phoneField,
    customer_email: emailField,
    gender: z.enum(["", "male", "female"]).transform((v) => v || null),
    birth_date: z
      .union([z.literal(""), birthDateField])
      .transform((v) => v || null),
    people_count: z
      .union([z.literal(""), z.coerce.number().int().min(1).max(1000)])
      .transform((v) => (v === "" ? null : v)),
    shoot_start: instant,
    shoot_end: instant,
    created_at: instant.refine((v) => v !== null, "접수일을 입력해 주세요."),
    deliverable_sent_at: instant,
    reminded_at: instant,
    confirmed_candidate_rank: z
      .union([z.literal(""), z.coerce.number().int().min(1).max(3)])
      .transform((v) => (v === "" ? null : v)),
    team_emails: z.array(z.email()).max(30),
    memo: z.string().max(10000),
    admin_memo: z.string().max(10000),
    shoot_location: z.string().max(1000),
    cancel_reason: z.string().max(2000),
    cost: amount,
    cost_memo: z.string().max(2000),
    charged_amount: amount,
    charged_amount_memo: z.string().max(2000),
    estimated_amount: amount,
    charged_amount_breakdown: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(200),
          amount: z.number().int().min(0).max(2147483647),
        }),
      )
      .max(100),
    ref: z.string().max(500),
    answers: z
      .array(z.object({ field_id: z.uuid(), value: z.string().max(10000) }))
      .max(200),
    candidates: z
      .array(
        z.object({
          rank: z.number().int().min(1).max(3),
          shoot_start: instant.refine((v) => v !== null),
          shoot_end: instant.refine((v) => v !== null),
        }),
      )
      .max(3),
  })
  .superRefine((v, ctx) => {
    const err = (message: string) => ctx.addIssue({ code: "custom", message });
    if (
      Boolean(v.shoot_start) !== Boolean(v.shoot_end) ||
      (v.shoot_start && v.shoot_end && v.shoot_end <= v.shoot_start)
    )
      err("촬영 종료는 시작 이후여야 합니다.");
    if (
      [
        "schedule_confirmed",
        "payment_confirmed",
        "completed",
        "no_show",
      ].includes(v.status) &&
      !v.shoot_start
    )
      err("확정 상태에는 촬영 일시가 필요합니다.");
    if (v.status === "cancelled" && !v.cancel_reason.trim())
      err("취소 사유를 입력해 주세요.");
    if (
      v.charged_amount_breakdown.length &&
      v.charged_amount_breakdown.reduce((a, b) => a + b.amount, 0) !==
        v.charged_amount
    )
      err("실제 지불액과 금액 구성의 합계가 일치해야 합니다.");
    if (new Set(v.answers.map((a) => a.field_id)).size !== v.answers.length)
      err("중복 답변입니다.");
    if (new Set(v.candidates.map((a) => a.rank)).size !== v.candidates.length)
      err("희망 시간 순위가 중복됩니다.");
    for (const c of v.candidates)
      if (!c.shoot_start || !c.shoot_end || c.shoot_end <= c.shoot_start)
        err("희망 시간의 종료는 시작 이후여야 합니다.");
    if (
      v.confirmed_candidate_rank &&
      !v.candidates.some(
        (c) =>
          c.rank === v.confirmed_candidate_rank &&
          c.shoot_start === v.shoot_start &&
          c.shoot_end === v.shoot_end,
      )
    )
      err(
        "확정 후보 순위와 촬영 시간이 일치해야 합니다. 직접 변경한 일정은 확정 후보 순위를 비워 주세요.",
      );
  });
export function toLocalInput(value: string | null) {
  return value
    ? kstDateString(new Date(value)) + "T" + kstTimeString(new Date(value))
    : "";
}
