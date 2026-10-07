import { describe, it, expect } from "vitest";
import { reservationEditSchema, toLocalInput } from "./edit-shared";
const id = "11111111-1111-4111-8111-111111111111";
const input = {
  id,
  expectedUpdatedAt: "2026-10-07T00:00:00Z",
  code: "test123",
  product_id: id,
  status: "payment_confirmed",
  customer_name: "김윤수",
  customer_phone: "010-1234-5678",
  customer_email: "test@example.com",
  gender: "male",
  birth_date: "20010101",
  people_count: "1",
  shoot_start: "2026-10-08T20:00",
  shoot_end: "2026-10-08T21:00",
  created_at: "2026-09-12T09:00",
  deliverable_sent_at: "",
  reminded_at: "",
  confirmed_candidate_rank: "",
  team_emails: [],
  memo: "",
  admin_memo: "",
  shoot_location: "",
  cancel_reason: "",
  cost: "19800",
  cost_memo: "",
  charged_amount: "85000",
  charged_amount_memo: "",
  estimated_amount: "85000",
  charged_amount_breakdown: [
    { label: "기본", amount: 70000 },
    { label: "추가옵션", amount: 15000 },
  ],
  ref: "",
  answers: [],
  candidates: [],
};
describe("예약 전체 편집 검증", () => {
  it("KST를 UTC로 변환하고 전화번호·예약번호를 정규화하며 0원과 미입력을 구분", () => {
    const v = reservationEditSchema.parse({ ...input, cost: "0" });
    expect(v.shoot_start).toBe("2026-10-08T11:00:00.000Z");
    expect(v.customer_phone).toBe("01012345678");
    expect(v.code).toBe("TEST123");
    expect(v.deliverable_sent_at).toBeNull();
    expect(v.cost).toBe(0);
    expect(toLocalInput(v.shoot_start)).toBe(input.shoot_start);
  });
  it.each([
    { shoot_end: "2026-10-08T19:00" },
    { shoot_end: "" },
    { shoot_start: "2026-02-30T20:00" },
    { shoot_start: "", shoot_end: "" },
    { cost: "-1" },
    { customer_phone: "010" },
    { birth_date: "20010230" },
    { team_emails: ["invalid"] },
    { charged_amount: "70000" },
    { status: "cancelled", cancel_reason: "" },
  ])("잘못된 값 거부 %j", (patch) => {
    expect(
      reservationEditSchema.safeParse({ ...input, ...patch }).success,
    ).toBe(false);
  });
  it("접수 및 취소는 미확정 시간, 미입력 지불액을 허용", () => {
    expect(
      reservationEditSchema.safeParse({
        ...input,
        status: "requested",
        shoot_start: "",
        shoot_end: "",
        charged_amount: "",
        charged_amount_breakdown: [],
      }).success,
    ).toBe(true);
  });
  it("후보 순위가 확정 시간과 다르면 거부", () => {
    expect(
      reservationEditSchema.safeParse({
        ...input,
        confirmed_candidate_rank: "1",
        candidates: [
          {
            rank: 1,
            shoot_start: "2026-10-08T10:00",
            shoot_end: "2026-10-08T11:00",
          },
        ],
      }).success,
    ).toBe(false);
  });
  it("답변 중복과 역순 희망 시간을 거부", () => {
    expect(
      reservationEditSchema.safeParse({
        ...input,
        answers: [
          { field_id: id, value: "A" },
          { field_id: id, value: "B" },
        ],
      }).success,
    ).toBe(false);
    expect(
      reservationEditSchema.safeParse({
        ...input,
        candidates: [
          {
            rank: 1,
            shoot_start: "2026-10-08T11:00",
            shoot_end: "2026-10-08T10:00",
          },
        ],
      }).success,
    ).toBe(false);
  });
});
