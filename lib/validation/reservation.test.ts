import { describe, expect, it } from "vitest";
import {
  reservationSchema,
  manualReservationSchema,
  phoneField,
  birthDateField,
  genderField,
  nameField,
  emailField,
} from "./reservation";

describe("reservationSchema — 후보(정확히 3지망)·개인정보 동의", () => {
  it("후보 3개·동의가 있으면 통과한다", () => {
    const parsed = reservationSchema.safeParse({
      candidates: [
        { date: "2026-09-10", time: "14:00" },
        { date: "2026-09-11", time: "10:00" },
        { date: "2026-09-12", time: "16:00" },
      ],
      agreePrivacy: "on",
    });
    expect(parsed.success).toBe(true);
  });

  it("후보 1개는 실패한다 — 3개를 모두 채워야 한다", () => {
    const parsed = reservationSchema.safeParse({
      candidates: [{ date: "2026-09-10", time: "14:00" }],
      agreePrivacy: "on",
    });
    expect(parsed.success).toBe(false);
  });

  it("후보 4개는 실패한다", () => {
    const parsed = reservationSchema.safeParse({
      candidates: [
        { date: "2026-09-10", time: "14:00" },
        { date: "2026-09-11", time: "10:00" },
        { date: "2026-09-12", time: "16:00" },
        { date: "2026-09-13", time: "11:00" },
      ],
      agreePrivacy: "on",
    });
    expect(parsed.success).toBe(false);
  });

  it("후보가 하나도 없으면 실패한다", () => {
    const parsed = reservationSchema.safeParse({
      candidates: [],
      agreePrivacy: "on",
    });
    expect(parsed.success).toBe(false);
  });

  it("같은 (날짜,시간)을 중복으로 내면 실패한다", () => {
    const parsed = reservationSchema.safeParse({
      candidates: [
        { date: "2026-09-10", time: "14:00" },
        { date: "2026-09-10", time: "14:00" },
        { date: "2026-09-11", time: "10:00" },
      ],
      agreePrivacy: "on",
    });
    expect(parsed.success).toBe(false);
  });

  it("동의를 안 하면 실패한다", () => {
    const parsed = reservationSchema.safeParse({
      candidates: [
        { date: "2026-09-10", time: "14:00" },
        { date: "2026-09-11", time: "10:00" },
        { date: "2026-09-12", time: "16:00" },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("날짜 형식이 틀리면 실패한다", () => {
    const parsed = reservationSchema.safeParse({
      candidates: [
        { date: "2026/09/10", time: "14:00" },
        { date: "2026-09-11", time: "10:00" },
        { date: "2026-09-12", time: "16:00" },
      ],
      agreePrivacy: "on",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("phoneField", () => {
  it("하이픈이 있어도 통과하고 숫자만 남긴다", () => {
    const parsed = phoneField.safeParse("010-1234-5678");
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toBe("01012345678");
  });

  it("하이픈이 없어도 그대로 통과한다", () => {
    const parsed = phoneField.safeParse("01012345678");
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toBe("01012345678");
  });

  it("공백이 섞여 있어도 숫자만 남긴다", () => {
    const parsed = phoneField.safeParse("010 1234 5678");
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toBe("01012345678");
  });

  it("010으로 시작하지 않으면 실패한다", () => {
    const parsed = phoneField.safeParse("02-1234-5678");
    expect(parsed.success).toBe(false);
  });
});

describe("genderField / birthDateField", () => {
  it("male/female만 통과한다", () => {
    expect(genderField.safeParse("male").success).toBe(true);
    expect(genderField.safeParse("female").success).toBe(true);
    expect(genderField.safeParse("other").success).toBe(false);
  });

  it("8자리 생년월일을 YYYY-MM-DD로 바꾼다", () => {
    const parsed = birthDateField.safeParse("19990101");
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toBe("1999-01-01");
  });

  it("존재하지 않는 날짜면 실패한다", () => {
    expect(birthDateField.safeParse("20240230").success).toBe(false);
  });

  it("미래 날짜면 실패한다", () => {
    expect(birthDateField.safeParse("29990101").success).toBe(false);
  });
});

describe("nameField / emailField", () => {
  it("빈 이름은 실패한다", () => {
    expect(nameField.safeParse("").success).toBe(false);
  });

  it("빈 이메일은 null로 통과한다", () => {
    const parsed = emailField.safeParse("");
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toBe(null);
  });

  it("형식이 틀린 이메일은 실패한다", () => {
    expect(emailField.safeParse("not-an-email").success).toBe(false);
  });
});

describe("manualReservationSchema", () => {
  it("이름·연락처만으로 통과한다(성별·생년월일 없음)", () => {
    const parsed = manualReservationSchema.safeParse({
      productId: "00000000-0000-0000-0000-000000000000",
      date: "2026-09-10",
      time: "14:00",
      customerName: "홍길동",
      customerPhone: "010-1234-5678",
      peopleCount: "",
      memo: "",
    });
    expect(parsed.success).toBe(true);
  });

  it("상품을 안 고르면 실패한다", () => {
    const parsed = manualReservationSchema.safeParse({
      productId: "",
      date: "2026-09-10",
      time: "14:00",
      customerName: "홍길동",
      customerPhone: "010-1234-5678",
      peopleCount: "",
      memo: "",
    });
    expect(parsed.success).toBe(false);
  });
});
