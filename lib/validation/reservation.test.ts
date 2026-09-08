import { describe, expect, it } from "vitest";
import { reservationSchema, manualReservationSchema } from "./reservation";

function omit<T extends object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Omit<T, K> {
  const copy = { ...obj };
  for (const key of keys) delete copy[key];
  return copy;
}

const BASE = {
  date: "2026-09-10",
  time: "14:00",
  customerName: "홍길동",
  customerPhone: "010-1234-5678",
  customerEmail: "",
  gender: "male",
  birthDate: "19990101",
  peopleCount: "",
  memo: "",
  agreePrivacy: "on",
};

describe("reservationSchema — 연락처", () => {
  it("하이픈이 있어도 통과하고 숫자만 남긴다", () => {
    const parsed = reservationSchema.safeParse({
      ...BASE,
      customerPhone: "010-1234-5678",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.customerPhone).toBe("01012345678");
  });

  it("하이픈이 없어도 그대로 통과한다", () => {
    const parsed = reservationSchema.safeParse({
      ...BASE,
      customerPhone: "01012345678",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.customerPhone).toBe("01012345678");
  });

  it("공백이 섞여 있어도 숫자만 남긴다", () => {
    const parsed = reservationSchema.safeParse({
      ...BASE,
      customerPhone: "010 1234 5678",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.customerPhone).toBe("01012345678");
  });

  it("010으로 시작하지 않으면 실패한다", () => {
    const parsed = reservationSchema.safeParse({
      ...BASE,
      customerPhone: "02-1234-5678",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("reservationSchema — 성별·생년월일", () => {
  it("성별·생년월일을 정상적으로 받는다", () => {
    const parsed = reservationSchema.safeParse(BASE);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.gender).toBe("male");
      expect(parsed.data.birthDate).toBe("1999-01-01");
    }
  });

  it("성별이 없으면 실패한다", () => {
    const parsed = reservationSchema.safeParse(omit(BASE, "gender"));
    expect(parsed.success).toBe(false);
  });

  it("생년월일이 없으면 실패한다", () => {
    const parsed = reservationSchema.safeParse(omit(BASE, "birthDate"));
    expect(parsed.success).toBe(false);
  });

  it("존재하지 않는 날짜면 실패한다", () => {
    const parsed = reservationSchema.safeParse({
      ...BASE,
      birthDate: "20240230",
    });
    expect(parsed.success).toBe(false);
  });

  it("미래 날짜면 실패한다", () => {
    const parsed = reservationSchema.safeParse({
      ...BASE,
      birthDate: "29990101",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("manualReservationSchema — 성별·생년월일은 선택", () => {
  it("성별·생년월일 없이도 통과한다", () => {
    const parsed = manualReservationSchema.safeParse({
      ...omit(BASE, "agreePrivacy", "gender", "birthDate"),
      productId: "00000000-0000-0000-0000-000000000000",
    });
    expect(parsed.success).toBe(true);
  });
});
