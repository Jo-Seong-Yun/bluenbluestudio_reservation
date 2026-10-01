import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { calls, failure } = vi.hoisted(() => ({
  calls: [] as { table: string; method: string; args: unknown[] }[],
  failure: { table: "" },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "gte", "lt", "in", "order"]) {
        builder[method] = (...args: unknown[]) => {
          calls.push({ table, method, args });
          return builder;
        };
      }
      builder.range = async (...args: unknown[]) => {
        calls.push({ table, method: "range", args });
        return failure.table === table
          ? { data: null, count: null, error: { message: "unavailable" } }
          : { data: [], count: 0, error: null };
      };
      return builder;
    },
  }),
}));
import { loadRevenueSummary } from "./load";
import { parseRevenuePeriod } from "./summary";

beforeEach(() => {
  calls.length = 0;
  failure.table = "";
});
describe("매출 조회 조건", () => {
  it("연간 예약은 촬영일의 KST 범위, 지출은 기존 월 키 범위로 조회한다", async () => {
    const period = parseRevenuePeriod({ view: "year", year: "2026" });
    await loadRevenueSummary(period);
    expect(calls).toContainEqual({
      table: "reservations",
      method: "gte",
      args: ["shoot_start", "2025-12-31T15:00:00.000Z"],
    });
    expect(calls).toContainEqual({
      table: "reservations",
      method: "lt",
      args: ["shoot_start", "2026-12-31T15:00:00.000Z"],
    });
    expect(calls).toContainEqual({
      table: "monthly_expenses",
      method: "gte",
      args: ["month", "2026-01"],
    });
    expect(calls).toContainEqual({
      table: "monthly_expenses",
      method: "lt",
      args: ["month", "2027-01"],
    });
    expect(calls).toContainEqual({
      table: "reservations",
      method: "in",
      args: ["status", ["payment_confirmed", "completed", "no_show"]],
    });
  });
  it("지출 조회가 실패해도 0원/일부 매출로 성공 처리하지 않는다", async () => {
    failure.table = "monthly_expenses";
    await expect(
      loadRevenueSummary(parseRevenuePeriod({ month: "2026-10" })),
    ).rejects.toThrow("불러오지 못했습니다");
  });
});
