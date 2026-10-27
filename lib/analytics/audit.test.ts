import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, AuditLogRow } from "@/lib/supabase/database.types";
import { auditFilterSchema, loadAuditPage } from "./audit";
function database(rows: AuditLogRow[], fail = false) {
  const calls: unknown[][] = [];
  const query = {
    select: () => query,
    order: () => query,
    eq: (...args: unknown[]) => {
      calls.push(["eq", ...args]);
      return query;
    },
    gte: (...args: unknown[]) => {
      calls.push(["gte", ...args]);
      return query;
    },
    lte: (...args: unknown[]) => {
      calls.push(["lte", ...args]);
      return query;
    },
    or: (v: string) => {
      calls.push(["or", v]);
      return query;
    },
    limit: vi.fn(async (n: number) => ({
      data: fail ? null : rows.slice(0, n),
      error: fail ? new Error("offline") : null,
    })),
  };
  return {
    db: {
      from: (table: string) => {
        calls.push(["from", table]);
        return query;
      },
    } as unknown as SupabaseClient<Database>,
    calls,
    query,
  };
}
const rows = Array.from(
  { length: 101 },
  (_, i) =>
    ({
      id: `00000000-0000-4000-8000-${String(101 - i).padStart(12, "0")}`,
      occurred_at: "2026-10-27T00:00:00.000Z",
      actor_type: "admin",
      source_table: "reservations",
      operation: "delete",
    }) as AuditLogRow,
);
describe("permanent audit history", () => {
  it("validates actor, IDs, dates and cursor before querying", () => {
    for (const input of [
      { actor: "owner" },
      { source: "reservations,secret" },
      { sessionId: "bad" },
      { cursor: { at: "x", id: "x" } },
      { from: "2026-10-28T00:00", to: "2026-10-27T00:00" },
      { kind: "anything" },
    ])
      expect(auditFilterSchema.safeParse(input).success).toBe(false);
  });
  it("preserves actor/ref/deleted target filters and inclusive KST minute bounds", async () => {
    const m = database(rows);
    await loadAuditPage(m.db, {
      actor: "admin",
      source: "reservations",
      sourceId: "deleted-id",
      operation: "delete",
      ref: "instaad1026",
      from: "2026-10-27T09:00",
      to: "2026-10-27T09:00",
    });
    expect(m.calls).toContainEqual(["from", "audit_logs"]);
    expect(m.calls).toContainEqual(["eq", "actor_type", "admin"]);
    expect(m.calls).toContainEqual(["eq", "source_id", "deleted-id"]);
    expect(m.calls).toContainEqual(["eq", "ref", "instaad1026"]);
    expect(m.calls).toContainEqual([
      "gte",
      "occurred_at",
      "2026-10-27T00:00:00.000Z",
    ]);
    expect(m.calls).toContainEqual([
      "lte",
      "occurred_at",
      "2026-10-27T00:00:59.999Z",
    ]);
  });
  it("returns 100 rows with tie-safe cursor and stops at final page", async () => {
    const m = database(rows),
      page = await loadAuditPage(m.db);
    expect(page.rows).toHaveLength(100);
    expect(page.cursor).toEqual({ at: rows[99].occurred_at, id: rows[99].id });
    await loadAuditPage(m.db, { cursor: page.cursor! });
    expect(m.calls).toContainEqual([
      "or",
      `occurred_at.lt.${rows[99].occurred_at},and(occurred_at.eq.${rows[99].occurred_at},id.lt.${rows[99].id})`,
    ]);
    expect(
      (await loadAuditPage(database(rows.slice(0, 3)).db)).cursor,
    ).toBeNull();
  });
  it("throws on read errors instead of showing an empty successful history", async () => {
    await expect(loadAuditPage(database([], true).db)).rejects.toThrow(
      "보존 이력",
    );
  });
});
