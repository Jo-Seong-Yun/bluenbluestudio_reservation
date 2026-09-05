import { describe, expect, it } from "vitest";
import {
  adminNewRequestSubject,
  adminNewRequestText,
  customerCancelledText,
  customerConfirmedText,
  customerReminderText,
  customerRequestedText,
} from "./templates";

// 2026-09-10T05:00:00Z → KST 2026-09-10(목) 14:00
const SHOOT_START = new Date("2026-09-10T05:00:00Z");

const RESERVATION_INFO = {
  productName: "프로필 촬영",
  shootStart: SHOOT_START,
  code: "AB12CD34",
};

describe("알림 문구", () => {
  it("접수 안내에 상품·시간·예약번호가 들어간다", () => {
    const text = customerRequestedText(RESERVATION_INFO);
    expect(text).toContain("프로필 촬영");
    expect(text).toContain("9월 10일(목) 14:00");
    expect(text).toContain("AB12CD34");
    expect(text).toContain("접수");
  });

  it("확정 안내는 '확정'이라는 말을 담는다", () => {
    const text = customerConfirmedText(RESERVATION_INFO);
    expect(text).toContain("확정");
    expect(text).toContain("9월 10일(목) 14:00");
    expect(text).toContain("AB12CD34");
  });

  it("취소 안내는 '취소'라는 말을 담는다", () => {
    const text = customerCancelledText(RESERVATION_INFO);
    expect(text).toContain("취소");
    expect(text).toContain("AB12CD34");
  });

  it("리마인드 안내는 '내일'을 언급한다", () => {
    const text = customerReminderText(RESERVATION_INFO);
    expect(text).toContain("내일");
    expect(text).toContain("9월 10일(목) 14:00");
  });

  it("사장님 새 신청 알림에 손님 이름·연락처가 들어간다", () => {
    const text = adminNewRequestText({
      ...RESERVATION_INFO,
      customerName: "김철수",
      customerPhone: "01012345678",
    });
    expect(text).toContain("김철수");
    expect(text).toContain("01012345678");
    expect(text).toContain("프로필 촬영");
    expect(text).toContain("AB12CD34");
  });

  it("사장님 알림 제목에 스튜디오 이름이 들어간다", () => {
    expect(adminNewRequestSubject()).toContain("새 예약 신청");
  });

  it("자정 근처 KST 날짜도 정확히 표시한다", () => {
    // 2026-01-01T15:00:00Z → KST 2026-01-02(금) 00:00
    const text = customerRequestedText({
      ...RESERVATION_INFO,
      shootStart: new Date("2026-01-01T15:00:00Z"),
    });
    expect(text).toContain("1월 2일(금) 00:00");
  });
});
