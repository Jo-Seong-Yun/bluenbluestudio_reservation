import { describe, expect, it } from "vitest";
import { summarizeCustomers, type CustomerReservationRow } from "./customers";

function row(overrides: Partial<CustomerReservationRow>): CustomerReservationRow {
  return {
    customer_name: "이름없음",
    customer_phone: "010-0000-0000",
    customer_email: null,
    gender: null,
    birth_date: null,
    status: "requested",
    shoot_start: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("summarizeCustomers", () => {
  it("연락처가 다르면 서로 다른 손님으로 나눈다", () => {
    const summaries = summarizeCustomers([
      row({ customer_phone: "010-1111-1111", customer_name: "김철수" }),
      row({ customer_phone: "010-2222-2222", customer_name: "이영희" }),
    ]);
    expect(summaries).toHaveLength(2);
    expect(summaries.map((s) => s.name).sort()).toEqual(["김철수", "이영희"]);
  });

  it("방문(=완료 처리된 예약)만 첫/최근 방문일·횟수에 센다", () => {
    const [summary] = summarizeCustomers([
      row({
        customer_phone: "010-1111-1111",
        status: "confirmed",
        shoot_start: "2026-12-01T00:00:00Z",
        created_at: "2026-01-03T00:00:00Z",
      }),
      row({
        customer_phone: "010-1111-1111",
        status: "completed",
        shoot_start: "2026-06-01T00:00:00Z",
        created_at: "2026-01-02T00:00:00Z",
      }),
      row({
        customer_phone: "010-1111-1111",
        status: "cancelled",
        shoot_start: "2026-03-01T00:00:00Z",
        created_at: "2026-01-01T00:00:00Z",
      }),
    ]);
    expect(summary.visitCount).toBe(1);
    expect(summary.firstVisit).toBe("2026-06-01");
    expect(summary.lastVisit).toBe("2026-06-01");
  });

  it("완료된 예약이 여러 건이면 가장 이르고 가장 늦은 날짜를 찾는다(입력 순서 무관)", () => {
    const [summary] = summarizeCustomers([
      row({
        customer_phone: "010-1111-1111",
        status: "completed",
        shoot_start: "2026-08-01T00:00:00Z",
        created_at: "2026-02-01T00:00:00Z",
      }),
      row({
        customer_phone: "010-1111-1111",
        status: "completed",
        shoot_start: "2026-02-01T00:00:00Z",
        created_at: "2026-01-01T00:00:00Z",
      }),
    ]);
    expect(summary.firstVisit).toBe("2026-02-01");
    expect(summary.lastVisit).toBe("2026-08-01");
    expect(summary.visitCount).toBe(2);
  });

  it("완료된 예약이 하나도 없으면 방문일은 null, 횟수는 0", () => {
    const [summary] = summarizeCustomers([
      row({ customer_phone: "010-1111-1111", status: "requested" }),
    ]);
    expect(summary.firstVisit).toBeNull();
    expect(summary.lastVisit).toBeNull();
    expect(summary.visitCount).toBe(0);
  });

  it("이름·성별·생년월일·이메일은 최근 예약 기준, 비어 있으면 과거 값으로 채운다", () => {
    const [summary] = summarizeCustomers([
      // 가장 최근(created_at 기준) — 이메일이 비어 있다.
      row({
        customer_phone: "010-1111-1111",
        customer_name: "최근이름",
        customer_email: null,
        gender: "female",
        birth_date: "1995-05-05",
        created_at: "2026-03-01T00:00:00Z",
      }),
      // 더 과거 — 이메일이 있다.
      row({
        customer_phone: "010-1111-1111",
        customer_name: "과거이름",
        customer_email: "old@example.com",
        gender: null,
        birth_date: null,
        created_at: "2026-01-01T00:00:00Z",
      }),
    ]);
    expect(summary.name).toBe("최근이름"); // 이름은 최신 기록 그대로
    expect(summary.email).toBe("old@example.com"); // 비어있어 과거 값으로 보충
    expect(summary.gender).toBe("female");
    expect(summary.genderLabel).toBe("여성");
  });

  it("성별 값이 없으면 genderLabel은 빈 문자열", () => {
    const [summary] = summarizeCustomers([
      row({ customer_phone: "010-1111-1111", gender: null }),
    ]);
    expect(summary.genderLabel).toBe("");
  });
});
