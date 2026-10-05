import type { BookingEventRow } from "@/lib/supabase/database.types";
export const funnelStages = [
  "list_view",
  "detail_view",
  "times_view",
  "form_view",
  "review_view",
  "completed",
] as const;
export const stageLabels = {
  list_view: "상품 목록",
  detail_view: "상품 상세",
  times_view: "희망 시간 선택",
  form_view: "신청서 진입",
  review_view: "내용 확인",
  completed: "접수 완료",
};
export type FieldStat = {
  key: string;
  productId: string | null;
  version: string | null;
  label: string;
  order: number;
  views: number;
  valid: number;
  errors: number;
  lastReached: number;
  averageMs: number | null;
};
export type FlowAnalytics = {
  startedAt: string | null;
  sessions: number;
  attempts: number;
  completions: number;
  formCompletionRate: number | null;
  directProductSessions: number;
  unclassifiedReservations: number;
  stages: {
    kind: (typeof funnelStages)[number];
    sessions: number;
    attempts: number;
    count: number;
  }[];
  fields: FieldStat[];
  channels: {
    channel: string;
    sessions: number;
    completions: number;
    rate: number | null;
  }[];
  devices: {
    device: string;
    sessions: number;
    completions: number;
    rate: number | null;
  }[];
  failures: { code: string; attempts: number; count: number }[];
};
function unique(values: (string | null)[]) {
  return new Set(values.filter((v): v is string => v !== null)).size;
}
export function summarizeFlow(
  events: BookingEventRow[],
  startedAt: string | null,
  unclassifiedReservations = 0,
  now = Date.now(),
): FlowAnalytics {
  const firstEvents = new Map<string, BookingEventRow>();
  const sorted = [...events].sort(
    (a, b) =>
      Date.parse(a.occurred_at) - Date.parse(b.occurred_at) ||
      a.id.localeCompare(b.id),
  );
  for (const e of sorted)
    if (!firstEvents.has(e.session_id)) firstEvents.set(e.session_id, e);
  const formAttempts = new Set(
    events
      .filter((e) => e.event_kind === "form_view")
      .map((e) => e.attempt_id)
      .filter(Boolean),
  );
  const completedAttempts = new Set(
    events
      .filter((e) => e.event_kind === "completed")
      .map((e) => e.attempt_id)
      .filter(Boolean),
  );
  const completedForm = [...formAttempts].filter((id) =>
    completedAttempts.has(id),
  ).length;
  const attempts = unique(events.map((e) => e.attempt_id));
  const grouped = new Map<string, BookingEventRow[]>();
  for (const e of sorted) {
    if (!e.field_id) continue;
    const key = `${e.product_id}:${e.form_version}:${e.field_id}`;
    const list = grouped.get(key) ?? [];
    list.push(e);
    grouped.set(key, list);
  }
  const lastActivity = new Map<string, number>();
  const lastField = new Map<string, string>();
  for (const e of sorted) {
    if (e.attempt_id) lastActivity.set(e.attempt_id, Date.parse(e.occurred_at));
    if (e.event_kind === "field_view" && e.attempt_id)
      lastField.set(
        e.attempt_id,
        `${e.product_id}:${e.form_version}:${e.field_id}`,
      );
  }
  const unfinishedByField = new Map<string, number>();
  for (const [id, key] of lastField) {
    if (
      !completedAttempts.has(id) &&
      now - (lastActivity.get(id) ?? now) >= 30 * 60 * 1000
    )
      unfinishedByField.set(key, (unfinishedByField.get(key) ?? 0) + 1);
  }
  const completedReservations = events.filter(
    (e) => e.event_kind === "completed",
  );
  const fields = [...grouped]
    .map(([key, rows]) => {
      const latest = new Map<string, BookingEventRow>();
      for (const e of rows)
        if (
          (e.event_kind === "field_valid" ||
            e.event_kind === "field_invalid") &&
          e.attempt_id
        )
          latest.set(e.attempt_id, e);
      const durations = [...latest.values()]
        .filter((e) => e.event_kind === "field_valid" && e.duration_ms !== null)
        .map((e) => e.duration_ms!);
      const r = rows.at(-1)!;
      return {
        key,
        productId: r.product_id,
        version: r.form_version,
        label: r.field_label ?? "삭제된 문항",
        order: r.field_order ?? 0,
        views: unique(
          rows
            .filter((e) => e.event_kind === "field_view")
            .map((e) => e.attempt_id),
        ),
        valid: [...latest.values()].filter(
          (e) => e.event_kind === "field_valid",
        ).length,
        errors: unique(
          rows
            .filter((e) => e.event_kind === "field_error")
            .map((e) => e.attempt_id),
        ),
        lastReached: unfinishedByField.get(key) ?? 0,
        averageMs: durations.length
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : null,
      };
    })
    .sort(
      (a, b) =>
        (a.productId ?? "").localeCompare(b.productId ?? "") ||
        (a.version ?? "").localeCompare(b.version ?? "") ||
        a.order - b.order,
    );
  function breakdown(key: (e: BookingEventRow) => string) {
    const keys = new Set([...firstEvents.values()].map(key));
    return [...keys]
      .map((k) => {
        const ids = new Set(
          [...firstEvents].filter(([, e]) => key(e) === k).map(([id]) => id),
        );
        const converted = new Set(
          completedReservations
            .filter((e) => ids.has(e.session_id))
            .map((e) => e.session_id),
        ).size;
        return {
          key: k,
          sessions: ids.size,
          completions: converted,
          rate: ids.size ? (converted / ids.size) * 100 : null,
        };
      })
      .sort((a, b) => b.sessions - a.sessions);
  }
  return {
    startedAt,
    sessions: firstEvents.size,
    attempts,
    completions: completedReservations.length,
    formCompletionRate: formAttempts.size
      ? (completedForm / formAttempts.size) * 100
      : null,
    directProductSessions: [...firstEvents.values()].filter(
      (e) =>
        e.event_kind === "detail_view" ||
        e.event_kind === "times_view" ||
        e.event_kind === "form_view",
    ).length,
    unclassifiedReservations,
    stages: funnelStages.map((kind) => {
      const rows = events.filter((e) => e.event_kind === kind);
      return {
        kind,
        count: rows.length,
        sessions: unique(rows.map((e) => e.session_id)),
        attempts: unique(rows.map((e) => e.attempt_id)),
      };
    }),
    fields,
    channels: breakdown((e) => e.ref?.trim() || "(직접 방문)").map((r) => ({
      channel: r.key,
      ...r,
    })),
    devices: breakdown((e) => e.device).map((r) => ({ device: r.key, ...r })),
    failures: ["validation", "availability", "server"].map((code) => {
      const rows = events.filter(
        (e) => e.event_kind === "submit_error" && e.error_code === code,
      );
      return {
        code,
        count: rows.length,
        attempts: unique(rows.map((e) => e.attempt_id)),
      };
    }),
  };
}
