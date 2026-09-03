import { describe, expect, it } from "vitest";
import { overlaps, parseTstzRange, toTstzRange } from "./range";

const at = (iso: string) => new Date(iso);

describe("구간 겹침 판정", () => {
  const base = {
    start: at("2026-09-10T01:00:00Z"),
    end: at("2026-09-10T02:00:00Z"),
  };

  it("완전히 같은 구간은 겹친다", () => {
    expect(overlaps(base, { ...base })).toBe(true);
  });

  it("일부만 물려도 겹친다", () => {
    expect(
      overlaps(base, {
        start: at("2026-09-10T01:30:00Z"),
        end: at("2026-09-10T02:30:00Z"),
      }),
    ).toBe(true);
  });

  it("한쪽이 다른 쪽을 품으면 겹친다", () => {
    expect(
      overlaps(base, {
        start: at("2026-09-10T00:00:00Z"),
        end: at("2026-09-10T05:00:00Z"),
      }),
    ).toBe(true);
  });

  it("경계가 맞닿기만 하면 겹치지 않는다 — 연속 예약을 허용하는 근거", () => {
    expect(
      overlaps(base, {
        start: at("2026-09-10T02:00:00Z"),
        end: at("2026-09-10T03:00:00Z"),
      }),
    ).toBe(false);
    expect(
      overlaps(base, {
        start: at("2026-09-10T00:00:00Z"),
        end: at("2026-09-10T01:00:00Z"),
      }),
    ).toBe(false);
  });

  it("완전히 떨어져 있으면 겹치지 않는다", () => {
    expect(
      overlaps(base, {
        start: at("2026-09-10T05:00:00Z"),
        end: at("2026-09-10T06:00:00Z"),
      }),
    ).toBe(false);
  });
});

describe("tstzrange 파싱", () => {
  it("Postgres가 돌려주는 따옴표 붙은 형태를 읽는다", () => {
    const parsed = parseTstzRange(
      '["2026-09-10 09:00:00+00","2026-09-10 10:00:00+00")',
    );
    expect(parsed.start.toISOString()).toBe("2026-09-10T09:00:00.000Z");
    expect(parsed.end.toISOString()).toBe("2026-09-10T10:00:00.000Z");
  });

  it("KST 오프셋으로 온 값도 같은 시점으로 읽는다", () => {
    const parsed = parseTstzRange(
      '["2026-09-10 18:00:00+09","2026-09-10 19:00:00+09")',
    );
    expect(parsed.start.toISOString()).toBe("2026-09-10T09:00:00.000Z");
  });

  it("따옴표 없는 형태도 읽는다", () => {
    const parsed = parseTstzRange(
      "[2026-09-10T09:00:00Z,2026-09-10T10:00:00Z)",
    );
    expect(parsed.start.toISOString()).toBe("2026-09-10T09:00:00.000Z");
  });

  it("toTstzRange가 만든 문자열을 되읽을 수 있다", () => {
    const interval = {
      start: at("2026-09-10T09:00:00Z"),
      end: at("2026-09-10T10:30:00Z"),
    };
    expect(parseTstzRange(toTstzRange(interval))).toEqual(interval);
  });

  it("[시작,끝) 이 아닌 경계는 거절한다 — 조용히 넘기면 이중예약이 된다", () => {
    expect(() =>
      parseTstzRange('("2026-09-10 09:00:00+00","2026-09-10 10:00:00+00")'),
    ).toThrow(/\[시작,끝\)/);
    expect(() =>
      parseTstzRange('["2026-09-10 09:00:00+00","2026-09-10 10:00:00+00"]'),
    ).toThrow(/\[시작,끝\)/);
  });

  it("해석할 수 없는 값은 예외로 알린다", () => {
    expect(() => parseTstzRange("empty")).toThrow(/해석할 수 없습니다/);
    expect(() => parseTstzRange("")).toThrow(/해석할 수 없습니다/);
  });
});
