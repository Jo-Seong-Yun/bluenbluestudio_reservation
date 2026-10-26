import { z } from "zod";
import type { BookingEventRow, Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clientEventKinds } from "./shared";
import { kstToInstant, type DateString } from "@/lib/time";
const datetime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  .refine(
    (v) =>
      z.iso.date().safeParse(v.slice(0, 10)).success &&
      !isNaN(Date.parse(v + ":00+09:00")),
  );
export const activityFilterSchema = z
  .object({
    from: datetime.optional(),
    to: datetime.optional(),
    sessionId: z.uuid().optional(),
    attemptId: z.uuid().optional(),
    productId: z.uuid().optional(),
    kind: z.enum([...clientEventKinds, "completed"]).optional(),
    cursor: z
      .object({ at: z.iso.datetime({ offset: true }), id: z.uuid() })
      .strict()
      .optional(),
  })
  .strict()
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: "시작 시각은 종료 시각보다 앞서야 합니다.",
  });
export type ActivityFilter = z.infer<typeof activityFilterSchema>;
export type ActivityPage = {
  rows: BookingEventRow[];
  cursor: ActivityFilter["cursor"] | null;
};
export const ACTIVITY_PAGE_SIZE = 100;
export function activityBound(value: string) {
  return kstToInstant(
    value.slice(0, 10) as DateString,
    value.slice(11),
  ).toISOString();
}
export async function loadActivityPage(
  db: SupabaseClient<Database>,
  input: unknown = {},
): Promise<ActivityPage> {
  const parsed = activityFilterSchema.safeParse(input);
  if (!parsed.success)
    throw new Error("조회 기간 또는 세션·시도 ID를 확인해 주십시오.");
  const f = parsed.data;
  let query = db
    .from("booking_events")
    .select("*")
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false });
  if (f.from) query = query.gte("occurred_at", activityBound(f.from));
  if (f.to)
    query = query.lte(
      "occurred_at",
      new Date(Date.parse(activityBound(f.to)) + 59999).toISOString(),
    );
  if (f.kind) query = query.eq("event_kind", f.kind);
  if (f.productId) query = query.eq("product_id", f.productId);
  if (f.sessionId) query = query.eq("session_id", f.sessionId);
  if (f.attemptId) query = query.eq("attempt_id", f.attemptId);
  if (f.cursor)
    query = query.or(
      `occurred_at.lt.${f.cursor.at},and(occurred_at.eq.${f.cursor.at},id.lt.${f.cursor.id})`,
    );
  const { data, error } = await query.limit(ACTIVITY_PAGE_SIZE + 1);
  if (error || !data) throw new Error("상세 행동 로그를 불러오지 못했습니다.");
  const rows = data.slice(0, ACTIVITY_PAGE_SIZE);
  const last = rows.at(-1);
  return {
    rows,
    cursor:
      data.length > ACTIVITY_PAGE_SIZE && last
        ? { at: last.occurred_at, id: last.id }
        : null,
  };
}
