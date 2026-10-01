import { describe, expect, it } from "vitest";
import { DEFAULT_BOOKING_STYLE, resolveBookingStyle } from "./booking-style";
describe("새 예약 디자인과 관리자 색상 설정", () => {
  it("설정이 없거나 예전 기본 조합이면 승인한 다크블루를 적용한다", () => {
    expect(resolveBookingStyle(null)).toEqual(DEFAULT_BOOKING_STYLE);
    expect(
      resolveBookingStyle({
        accentColor: "#3d6fe0",
        saleColor: "#e11d48",
        textColor: "#0b1b2b",
        textSize: "md",
        cardRadius: "xl",
        cardSize: "standard",
      }),
    ).toEqual(DEFAULT_BOOKING_STYLE);
    expect(DEFAULT_BOOKING_STYLE.accentColor).toBe("#173b67");
  });
  it("관리자가 직접 지정한 색상과 카드 설정은 유지한다", () => {
    const custom = {
      accentColor: "#3d6fe0",
      saleColor: "#112233",
      textColor: "#334455",
      textSize: "lg",
      cardRadius: "full",
      cardSize: "compact",
    } as const;
    expect(resolveBookingStyle(custom)).toEqual(custom);
    expect(resolveBookingStyle({ accentColor: "#15803d" }).accentColor).toBe(
      "#15803d",
    );
  });
});
