import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditLogRow, Database } from "@/lib/supabase/database.types";
import { activityBound, activityFilterSchema } from "./activity";
export const auditFilterSchema = z
  .object({
    from: activityFilterSchema.shape.from,
    to: activityFilterSchema.shape.to,
    cursor: activityFilterSchema.shape.cursor,
    sessionId: activityFilterSchema.shape.sessionId,
    productId: activityFilterSchema.shape.productId,
    actor: z.enum(["customer", "admin", "system", "unknown"]).optional(),
    source: z
      .string()
      .regex(/^[a-z_]{1,60}$/)
      .optional(),
    sourceId: z.string().max(100).optional(),
    ref: z.string().max(50).optional(),
    operation: z
      .enum([
        "insert",
        "update",
        "delete",
        "snapshot",
        "event",
        "navigation",
        "login",
        "logout",
      ])
      .optional(),
  })
  .strict()
  .refine((f) => !f.from || !f.to || f.from <= f.to);
export type AuditFilter = z.infer<typeof auditFilterSchema>;
export type AuditPage = {
  rows: AuditLogRow[];
  cursor: AuditFilter["cursor"] | null;
};
export async function loadAuditPage(
  db: SupabaseClient<Database>,
  input: unknown = {},
): Promise<AuditPage> {
  const f = auditFilterSchema.parse(input);
  let query = db
    .from("audit_logs")
    .select("*")
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false });
  if (f.from) query = query.gte("occurred_at", activityBound(f.from));
  if (f.to)
    query = query.lte(
      "occurred_at",
      new Date(Date.parse(activityBound(f.to)) + 59999).toISOString(),
    );
  if (f.actor) query = query.eq("actor_type", f.actor);
  if (f.source) query = query.eq("source_table", f.source);
  if (f.sourceId) query = query.eq("source_id", f.sourceId);
  if (f.ref) query = query.eq("ref", f.ref);
  if (f.operation) query = query.eq("operation", f.operation);
  if (f.sessionId) query = query.eq("session_id", f.sessionId);
  if (f.productId) query = query.eq("product_id", f.productId);
  if (f.cursor)
    query = query.or(
      `occurred_at.lt.${f.cursor.at},and(occurred_at.eq.${f.cursor.at},id.lt.${f.cursor.id})`,
    );
  const { data, error } = await query.limit(101);
  if (error || !data) throw new Error("보존 이력을 불러오지 못했습니다.");
  const rows = data.slice(0, 100),
    last = rows.at(-1);
  return {
    rows,
    cursor:
      data.length > 100 && last ? { at: last.occurred_at, id: last.id } : null,
  };
}
export const actorLabels = {
  customer: "고객",
  admin: "관리자",
  system: "시스템",
  unknown: "이관 기록 · 주체 미확인",
};
export const operationLabels = {
  insert: "생성",
  update: "수정",
  delete: "삭제",
  snapshot: "기존 기록 이관",
  event: "행동",
  navigation: "화면 진입",
  login: "로그인",
  logout: "로그아웃",
};
export const sourceLabels: Record<string, string> = {
  products: "상품",
  weekly_hours: "운영 시간",
  date_overrides: "날짜별 운영",
  blocks: "일정 차단",
  reservations: "예약",
  reservation_submissions: "제출 신청서 원본",
  settings: "설정",
  notification_logs: "알림 발송",
  monthly_expenses: "월 지출",
  custom_fields: "문항",
  reservation_answers: "예약 답변",
  reservation_candidates: "희망 일정",
  customers: "고객 정보",
  product_views: "기존 상품 조회",
  booking_list_views: "기존 목록 조회",
  record_sheet_template: "기록표 양식",
  apply_views: "기존 신청서 조회",
  email_rules: "이메일 규칙",
  booking_events: "예약 행동",
  admin_session: "관리자 접속",
};
