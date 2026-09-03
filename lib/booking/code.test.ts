import { describe, expect, it } from "vitest";
import { generateReservationCode } from "./code";

describe("예약번호 생성", () => {
  it("8자리를 만든다", () => {
    expect(generateReservationCode()).toHaveLength(8);
  });

  it("헷갈리는 문자(0,O,1,I,L,2,Z)를 쓰지 않는다", () => {
    const confusing = /[01ILOZ]/;
    for (let i = 0; i < 200; i++) {
      expect(generateReservationCode()).not.toMatch(confusing);
    }
  });

  it("대문자와 숫자만 쓴다", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateReservationCode()).toMatch(/^[A-Z0-9]+$/);
    }
  });

  it("매번 다르게 나온다 (충돌 극히 드묾)", () => {
    const codes = new Set(Array.from({ length: 500 }, generateReservationCode));
    expect(codes.size).toBe(500);
  });
});
