import { describe, expect, it } from "vitest";
import {
  adminNewRequestKakaoVariables,
  adminNewRequestSubject,
  adminNewRequestText,
  customerCancelledKakaoVariables,
  customerCancelledSubject,
  customerCancelledText,
  customerConfirmedKakaoVariables,
  customerConfirmedSubject,
  customerConfirmedText,
  customerReminderKakaoVariables,
  customerReminderSubject,
  customerReminderText,
  customerRequestedEmailText,
  customerRequestedKakaoVariables,
  customerRequestedSubject,
  customerRequestedText,
} from "./templates";

// 2026-09-10T05:00:00Z → KST 2026-09-10(목) 14:00
const SHOOT_START = new Date("2026-09-10T05:00:00Z");
// 2026-09-11T06:00:00Z → KST 2026-09-11(금) 15:00
const SECOND_CANDIDATE = new Date("2026-09-11T06:00:00Z");

const RESERVATION_INFO = {
  productName: "프로필 촬영",
  shootStart: SHOOT_START,
  code: "AB12CD34",
};

// 확정 전(접수) 알림은 시간 하나가 아니라 1~3개의 희망 시간(후보)을 쓴다.
const REQUEST_INFO = {
  productName: "프로필 촬영",
  candidateTimes: [SHOOT_START, SECOND_CANDIDATE],
  code: "AB12CD34",
};

describe("알림 문구", () => {
  it("접수 안내에 상품·후보 시간들·예약번호가 들어간다", () => {
    const text = customerRequestedText(REQUEST_INFO);
    expect(text).toContain("프로필 촬영");
    expect(text).toContain("1지망 9월 10일(목) 14:00");
    expect(text).toContain("2지망 9월 11일(금) 15:00");
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

  it("확정 전(후보만 낸 상태)에 취소되면 시간 없이 예약번호만 담는다", () => {
    const text = customerCancelledText({
      productName: "프로필 촬영",
      shootStart: null,
      code: "AB12CD34",
    });
    expect(text).toContain("취소");
    expect(text).toContain("AB12CD34");
    expect(text).not.toContain("월");
  });

  it("리마인드 안내는 '내일'을 언급한다", () => {
    const text = customerReminderText(RESERVATION_INFO);
    expect(text).toContain("내일");
    expect(text).toContain("9월 10일(목) 14:00");
  });

  it("사장님 새 신청 알림에 손님 이름·연락처·후보 시간들이 들어간다", () => {
    const text = adminNewRequestText({
      ...REQUEST_INFO,
      customerName: "김철수",
      customerPhone: "01012345678",
    });
    expect(text).toContain("김철수");
    expect(text).toContain("01012345678");
    expect(text).toContain("프로필 촬영");
    expect(text).toContain("1지망 9월 10일(목) 14:00");
    expect(text).toContain("2지망 9월 11일(금) 15:00");
    expect(text).toContain("AB12CD34");
  });

  it("사장님 알림 제목에 스튜디오 이름이 들어간다", () => {
    expect(adminNewRequestSubject()).toContain("새 예약 신청");
  });

  it("접수 이메일 본문에는 후보 시간들과 계좌·안내사항까지 담는다", () => {
    const text = customerRequestedEmailText({
      ...REQUEST_INFO,
      bankAccount: "카카오뱅크 3333-01-1234567 홍길동",
      notice: "촬영 10분 전까지 도착해주세요.",
    });
    expect(text).toContain("프로필 촬영");
    expect(text).toContain("1지망: 9월 10일(목) 14:00");
    expect(text).toContain("2지망: 9월 11일(금) 15:00");
    expect(text).toContain("AB12CD34");
    expect(text).toContain("카카오뱅크 3333-01-1234567 홍길동");
    expect(text).toContain("촬영 10분 전까지 도착해주세요.");
  });

  it("접수 이메일 본문은 계좌·안내사항이 없어도 문제없다", () => {
    const text = customerRequestedEmailText(REQUEST_INFO);
    expect(text).toContain("프로필 촬영");
    expect(text).not.toContain("입금 계좌");
  });

  it("손님용 이메일 제목들도 각 상태를 담는다", () => {
    expect(customerRequestedSubject()).toContain("접수");
    expect(customerConfirmedSubject()).toContain("확정");
    expect(customerCancelledSubject()).toContain("취소");
    expect(customerReminderSubject()).toContain("내일");
  });

  it("자정 근처 KST 날짜도 정확히 표시한다", () => {
    // 2026-01-01T15:00:00Z → KST 2026-01-02(금) 00:00
    const text = customerRequestedText({
      ...REQUEST_INFO,
      candidateTimes: [new Date("2026-01-01T15:00:00Z")],
    });
    expect(text).toContain("1월 2일(금) 00:00");
  });

  it("카카오 알림톡 변수(확정/취소/리마인드)에 상품·시간·예약번호가 들어간다", () => {
    for (const variables of [
      customerConfirmedKakaoVariables(RESERVATION_INFO),
      customerCancelledKakaoVariables(RESERVATION_INFO),
      customerReminderKakaoVariables(RESERVATION_INFO),
    ]) {
      expect(variables["#{상품명}"]).toBe("프로필 촬영");
      expect(variables["#{일시}"]).toBe("9월 10일(목) 14:00");
      expect(variables["#{예약번호}"]).toBe("AB12CD34");
    }
  });

  it("접수 카카오 알림톡 변수에 1~3지망이 각각 들어간다", () => {
    const variables = customerRequestedKakaoVariables(REQUEST_INFO);
    expect(variables["#{상품명}"]).toBe("프로필 촬영");
    expect(variables["#{1지망}"]).toBe("9월 10일(목) 14:00");
    expect(variables["#{2지망}"]).toBe("9월 11일(금) 15:00");
    expect(variables["#{3지망}"]).toBe("-");
    expect(variables["#{예약번호}"]).toBe("AB12CD34");
  });

  it("사장님용 카카오 알림톡 변수에 손님 이름·연락처가 들어간다", () => {
    const variables = adminNewRequestKakaoVariables({
      ...REQUEST_INFO,
      customerName: "김철수",
      customerPhone: "01012345678",
    });
    expect(variables["#{손님이름}"]).toBe("김철수");
    expect(variables["#{손님연락처}"]).toBe("01012345678");
    expect(variables["#{상품명}"]).toBe("프로필 촬영");
    expect(variables["#{1지망}"]).toBe("9월 10일(목) 14:00");
  });
});
