"use server";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { batchSchema } from "./shared";
/** 예약 동작을 막지 않으며 허용한 구조의 이벤트만 저장합니다. */
export async function logBookingEvents(input: unknown): Promise<boolean> {
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) return false;
  try {
    const client = await createClient();
    const auth = await client.auth.getUser();
    if (auth.error && !isAuthSessionMissingError(auth.error)) return false;
    if (auth.data.user) return true;
    const db = createAdminClient();
    const productIds = [
      ...new Set(
        parsed.data.map((e) => e.productId).filter((id): id is string => !!id),
      ),
    ];
    const fieldIds = [
      ...new Set(
        parsed.data.map((e) => e.fieldId).filter((id): id is string => !!id),
      ),
    ];
    const products = productIds.length
      ? await db
          .from("products")
          .select("id")
          .in("id", productIds)
          .eq("is_published", true)
      : { data: [], error: null };
    const fields = fieldIds.length
      ? await db
          .from("custom_fields")
          .select("id, product_id, label, sort_order")
          .in("id", fieldIds)
      : { data: [], error: null };
    if (products.error || fields.error) throw new Error("통계 문항 조회 실패");
    const allowed = new Set(products.data?.map((p) => p.id));
    const byField = new Map(fields.data?.map((f) => [f.id, f]));
    const rows = parsed.data
      .filter(
        (e) =>
          (e.kind === "list_view"
            ? e.productId === null
            : !!e.productId && allowed.has(e.productId) && !!e.attemptId) &&
          (e.kind.startsWith("field_")
            ? !!e.fieldId && byField.get(e.fieldId)?.product_id === e.productId
            : e.fieldId === null),
      )
      .map((e) => ({
        occurred_at:
          Math.abs(Date.now() - Date.parse(e.occurredAt)) < 120000
            ? e.occurredAt
            : new Date().toISOString(),
        id: e.id,
        session_id: e.sessionId,
        attempt_id: e.attemptId,
        product_id: e.productId,
        event_kind: e.kind,
        ref: e.ref,
        device: e.device,
        form_version: e.formVersion,
        field_id: e.fieldId,
        field_label: e.fieldId ? (byField.get(e.fieldId)?.label ?? null) : null,
        field_order: e.fieldId
          ? (byField.get(e.fieldId)?.sort_order ?? null)
          : null,
        duration_ms: e.durationMs,
        error_code: e.errorCode,
      }));
    if (!rows.length) return false;
    const result = await db
      .from("booking_events")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
    if (result.error) throw result.error;
    return true;
  } catch (error) {
    console.error("예약 통계 기록 실패:", error);
    return false;
  }
}
