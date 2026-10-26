import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, BookingEventRow } from "@/lib/supabase/database.types";
import {
  activityFilterSchema,
  activityBound,
  loadActivityPage,
} from "./activity";
function database(rows: BookingEventRow[]) {
  const calls: unknown[][] = [];
  let filtered = rows;
  const query = {
    select: () => query,
    order: () => query,
    eq: (key: string, value: unknown) => {
      calls.push(["eq", key, value]);
      filtered = filtered.filter(
        (e) => e[key as keyof BookingEventRow] === value,
      );
      return query;
    },
    gte: (key: string, value: string) => {
      calls.push(["gte", key, value]);
      return query;
    },
    lte: (key: string, value: string) => {
      calls.push(["lte", key, value]);
      return query;
    },
    or: (value: string) => {
      calls.push(["or", value]);
      const match =
        /occurred_at.lt.([^,]+),and\(occurred_at.eq.[^,]+,id.lt.([^\)]+)\)/.exec(
          value,
        )!;
      filtered = filtered.filter(
        (e) =>
          e.occurred_at < match[1] ||
          (e.occurred_at === match[1] && e.id < match[2]),
      );
      return query;
    },
    limit: vi.fn(async (n: number) => ({
      data: filtered.slice(0, n),
      error: null,
    })),
  };
  return {
    db: { from: () => query } as unknown as SupabaseClient<Database>,
    calls,
    query,
  };
}
const rows = Array.from(
  { length: 205 },
  (_, i) =>
    ({
      id: `00000000-0000-4000-8000-${String(205 - i).padStart(12, "0")}`,
      occurred_at: "2026-10-26T00:00:00.000Z",
      event_kind: "field_change",
    }) as BookingEventRow,
);
describe("activity query", () => {
  it("paginates equal timestamps without skipping or repeating events", async () => {
    const first = await loadActivityPage(database(rows).db);
    const second = await loadActivityPage(database(rows).db, {
      cursor: first.cursor,
    });
    const third = await loadActivityPage(database(rows).db, {
      cursor: second.cursor,
    });
    expect(first.rows).toHaveLength(100);
    expect(second.rows).toHaveLength(100);
    expect(third.rows).toHaveLength(5);
    expect(third.cursor).toBeNull();
    expect(
      new Set([...first.rows, ...second.rows, ...third.rows].map((e) => e.id))
        .size,
    ).toBe(205);
  });
  it("uses KST time bounds and a bounded query", async () => {
    const { db, calls, query } = database(rows);
    await loadActivityPage(db, {
      from: "2026-10-26T09:00",
      to: "2026-10-26T10:00",
      kind: "field_change",
    });
    expect(activityBound("2026-10-26T09:00")).toBe("2026-10-26T00:00:00.000Z");
    expect(calls).toContainEqual([
      "lte",
      "occurred_at",
      "2026-10-26T01:00:59.999Z",
    ]);
    expect(query.limit).toHaveBeenCalledWith(101);
  });
  it("rejects invalid IDs, inverted dates and cursor injection", () => {
    expect(
      activityFilterSchema.safeParse({ sessionId: "x,or(id.gt.0)" }).success,
    ).toBe(false);
    expect(
      activityFilterSchema.safeParse({
        from: "2026-10-27T00:00",
        to: "2026-10-26T00:00",
      }).success,
    ).toBe(false);
    expect(
      activityFilterSchema.safeParse({ cursor: { at: "x", id: "x" } }).success,
    ).toBe(false);
  });
});
