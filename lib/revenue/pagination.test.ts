import { describe, expect, it, vi } from "vitest";
import { readAllRevenueRows } from "./pagination";

describe("매출 데이터 전체 조회", () => {
  it("1000건이 넘고 서버 응답 한도가 요청보다 작아도 누락 없이 이어 읽는다", async () => {
    const all = Array.from({ length: 1205 }, (_, i) => ({ id: i }));
    const fetch = vi.fn(async (from: number) => ({
      data: all.slice(from, from + 100),
      count: all.length,
      error: null,
    }));
    expect(await readAllRevenueRows(fetch)).toEqual(all);
    expect(fetch.mock.calls.map(([from]) => from)).toEqual(
      Array.from({ length: 13 }, (_, i) => i * 100),
    );
  });
  it("조회 중 오류가 나면 일부 결과를 성공 집계로 반환하지 않는다", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ id: 1 }], count: 2, error: null })
      .mockResolvedValueOnce({
        data: null,
        count: null,
        error: { message: "unavailable" },
      });
    await expect(readAllRevenueRows(fetch)).rejects.toThrow(
      "불러오지 못했습니다",
    );
  });
  it("남은 행이 있는데 빈 결과가 오면 오류로 처리한다", async () => {
    await expect(
      readAllRevenueRows(async () => ({ data: [], error: null, count: 2 })),
    ).rejects.toThrow("일부");
  });
  it("실제 빈 결과는 빈 배열로 반환한다", async () => {
    expect(
      await readAllRevenueRows(async () => ({
        data: [],
        error: null,
        count: 0,
      })),
    ).toEqual([]);
  });
});
