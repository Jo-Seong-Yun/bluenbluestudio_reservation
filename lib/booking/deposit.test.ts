import { describe, it, expect } from "vitest";
import {
  depositEnabled,
  requiresDeposit,
  allowedNextStatuses,
  previousConfirmedStatus,
} from "./deposit";
import { depositContent, depositCtas, depositText } from "./deposit-content";
describe("예약금 ON/OFF", () => {
  it("legacy settings and reservations retain ON independently of later global changes", () => {
    expect(depositEnabled(null)).toBe(true);
    expect(depositEnabled({ depositEnabled: false })).toBe(false);
    expect(requiresDeposit({})).toBe(true);
    expect(requiresDeposit({ deposit_required: true })).toBe(true);
    expect(requiresDeposit({ deposit_required: false })).toBe(false);
  });
  it("OFF skips payment confirmation and reverting does not invent a paid status", () => {
    expect(allowedNextStatuses("schedule_confirmed", true)).toEqual([
      "payment_confirmed",
    ]);
    expect(allowedNextStatuses("schedule_confirmed", false)).toEqual([
      "completed",
      "no_show",
    ]);
    expect(allowedNextStatuses("requested", false)).toEqual([
      "schedule_confirmed",
    ]);
    expect(previousConfirmedStatus(false)).toBe("schedule_confirmed");
    expect(previousConfirmedStatus(true)).toBe("payment_confirmed");
  });
  it("ON preserves templates byte for byte; OFF removes deposit instructions but retains other formatted information", () => {
    const html =
      '<p style="text-align:left">촬영 일정을 확인해주세요.</p><p>예약금 <strong>입금</strong> 안내</p><table><tbody><tr><td>계좌</td><td>{{계좌}}</td></tr><tr><td>촬영 시간</td><td>60분</td></tr></tbody></table><p>서울 스튜디오</p>';
    expect(depositContent(html, true)).toBe(html);
    const cleaned = depositContent(html, false);
    expect(cleaned).not.toMatch(/입금|예약금|계좌/);
    expect(cleaned).toContain("60분");
    expect(cleaned).toContain("서울 스튜디오");
    expect(depositContent("예약금 입금 안내\n촬영 준비물", false)).toBe(
      "<p>촬영 준비물</p>",
    );
    expect(depositText("계좌 안내\n촬영 준비물", false)).toBe("촬영 준비물");
    expect(
      depositCtas(
        [
          { text: "입금 계좌 보기", url: "https://example.com" },
          { text: "예약 조회", url: "https://example.com" },
        ],
        false,
      ),
    ).toHaveLength(1);
  });
});
