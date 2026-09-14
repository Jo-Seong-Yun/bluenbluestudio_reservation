import { describe, expect, it } from "vitest";
import {
  computeVisitStats,
  deriveIdentitiesByPhone,
  summarizeCustomers,
  type CustomerRecord,
  type IdentitySourceRow,
  type ReservationVisitRow,
} from "./customers";

function visitRow(overrides: Partial<ReservationVisitRow>): ReservationVisitRow {
  return {
    customer_phone: "010-0000-0000",
    status: "requested",
    shoot_start: null,
    ...overrides,
  };
}

function identityRow(overrides: Partial<IdentitySourceRow>): IdentitySourceRow {
  return {
    customer_name: "이름없음",
    customer_phone: "010-0000-0000",
    customer_email: null,
    gender: null,
    birth_date: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("computeVisitStats", () => {
  it("완료(completed) 상태인 예약만 방문으로 센다", () => {
    const stats = computeVisitStats([
      visitRow({ customer_phone: "010-1111-1111", status: "confirmed", shoot_start: "2026-12-01T00:00:00Z" }),
      visitRow({ customer_phone: "010-1111-1111", status: "completed", shoot_start: "2026-06-01T00:00:00Z" }),
      visitRow({ customer_phone: "010-1111-1111", status: "cancelled", shoot_start: "2026-03-01T00:00:00Z" }),
    ]);
    const summary = stats.get("010-1111-1111");
    expect(summary?.visitCount).toBe(1);
    expect(summary?.firstVisit).toBe("2026-06-01");
    expect(summary?.lastVisit).toBe("2026-06-01");
  });

  it("완료된 예약이 여러 건이면 가장 이르고 가장 늦은 날짜를 찾는다(입력 순서 무관)", () => {
    const stats = computeVisitStats([
      visitRow({ customer_phone: "010-1111-1111", status: "completed", shoot_start: "2026-08-01T00:00:00Z" }),
      visitRow({ customer_phone: "010-1111-1111", status: "completed", shoot_start: "2026-02-01T00:00:00Z" }),
    ]);
    const summary = stats.get("010-1111-1111");
    expect(summary?.firstVisit).toBe("2026-02-01");
    expect(summary?.lastVisit).toBe("2026-08-01");
    expect(summary?.visitCount).toBe(2);
  });

  it("완료된 예약이 하나도 없으면 그 손님은 맵에 아예 없다", () => {
    const stats = computeVisitStats([
      visitRow({ customer_phone: "010-1111-1111", status: "requested" }),
    ]);
    expect(stats.has("010-1111-1111")).toBe(false);
  });

  it("연락처가 다르면 서로 다른 손님으로 나눈다", () => {
    const stats = computeVisitStats([
      visitRow({ customer_phone: "010-1111-1111", status: "completed", shoot_start: "2026-01-01T00:00:00Z" }),
      visitRow({ customer_phone: "010-2222-2222", status: "completed", shoot_start: "2026-02-01T00:00:00Z" }),
    ]);
    expect(stats.size).toBe(2);
  });
});

describe("summarizeCustomers", () => {
  const record: CustomerRecord = {
    phone: "010-1111-1111",
    name: "김철수",
    gender: "male",
    birth_date: "1995-05-05",
    email: "chulsoo@example.com",
  };

  it("customers 행과 방문 집계를 합친다", () => {
    const visitStats = new Map([
      ["010-1111-1111", { firstVisit: "2026-01-01", lastVisit: "2026-06-01", visitCount: 2 }],
    ]);
    const [summary] = summarizeCustomers([record], visitStats);
    expect(summary.name).toBe("김철수");
    expect(summary.genderLabel).toBe("남");
    expect(summary.birthDate).toBe("1995-05-05");
    expect(summary.firstVisit).toBe("2026-01-01");
    expect(summary.lastVisit).toBe("2026-06-01");
    expect(summary.visitCount).toBe(2);
  });

  it("방문 집계가 없으면(=완료된 예약 없음) 0건으로 채운다", () => {
    const [summary] = summarizeCustomers([record], new Map());
    expect(summary.firstVisit).toBeNull();
    expect(summary.lastVisit).toBeNull();
    expect(summary.visitCount).toBe(0);
  });

  it("성별 값이 없으면 genderLabel은 빈 문자열", () => {
    const [summary] = summarizeCustomers(
      [{ ...record, gender: null }],
      new Map(),
    );
    expect(summary.genderLabel).toBe("");
  });

  it("생년월일이 없으면 나이는 null", () => {
    const [summary] = summarizeCustomers(
      [{ ...record, birth_date: null }],
      new Map(),
    );
    expect(summary.age).toBeNull();
    expect(summary.birthDate).toBeNull();
  });
});

describe("deriveIdentitiesByPhone", () => {
  it("연락처별로 가장 최근(created_at) 이름을 고른다", () => {
    const identities = deriveIdentitiesByPhone([
      identityRow({ customer_phone: "010-1111-1111", customer_name: "과거이름", created_at: "2026-01-01T00:00:00Z" }),
      identityRow({ customer_phone: "010-1111-1111", customer_name: "최근이름", created_at: "2026-03-01T00:00:00Z" }),
    ]);
    expect(identities.get("010-1111-1111")?.name).toBe("최근이름");
  });

  it("최근 기록에 값이 비어 있으면 과거 기록에서 채운다", () => {
    const identities = deriveIdentitiesByPhone([
      identityRow({
        customer_phone: "010-1111-1111",
        customer_email: "old@example.com",
        gender: "female",
        birth_date: "1990-01-01",
        created_at: "2026-01-01T00:00:00Z",
      }),
      identityRow({
        customer_phone: "010-1111-1111",
        customer_email: null,
        gender: null,
        birth_date: null,
        created_at: "2026-03-01T00:00:00Z",
      }),
    ]);
    const identity = identities.get("010-1111-1111");
    expect(identity?.email).toBe("old@example.com");
    expect(identity?.gender).toBe("female");
    expect(identity?.birthDate).toBe("1990-01-01");
  });

  it("연락처가 다르면 서로 다른 손님으로 나눈다", () => {
    const identities = deriveIdentitiesByPhone([
      identityRow({ customer_phone: "010-1111-1111", customer_name: "김철수" }),
      identityRow({ customer_phone: "010-2222-2222", customer_name: "이영희" }),
    ]);
    expect(identities.size).toBe(2);
  });
});
