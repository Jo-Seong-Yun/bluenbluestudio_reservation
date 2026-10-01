import { describe, expect, it, vi } from "vitest";
import type { CustomField } from "./custom-fields-shared";

vi.mock("server-only", () => ({}));
const { order } = vi.hoisted(() => ({ order: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order }) }) }) }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
import {
  extractReservationFormData,
  loadActiveCustomFields,
} from "./custom-fields";

const gender: CustomField = {
  id: "gender",
  product_id: "product",
  label: "성별",
  type: "gender",
  options: null,
  option_prices: null,
  description: null,
  required: true,
  active: true,
  sort_order: 0,
  created_at: "2026-10-01T00:00:00Z",
};

describe("예약 신청 성별 검증", () => {
  it.each(["gender", "single_choice"] as const)(
    "필수 %s 문항은 선택하지 않으면 서버에서 거절한다",
    (type) => {
      const field = {
        ...gender,
        type,
        options: type === "single_choice" ? ["남성", "여성"] : null,
      };
      expect(extractReservationFormData([field], new FormData())).toEqual({
        ok: false,
        error: expect.stringContaining("성별"),
      });
      const empty = new FormData();
      empty.set("custom_gender", "");
      expect(extractReservationFormData([field], empty).ok).toBe(false);
    },
  );
  it.each(["male", "female"])(
    "선택한 성별 %s을 저장할 값으로 추출한다",
    (value) => {
      const form = new FormData();
      form.set("custom_gender", value);
      expect(extractReservationFormData([gender], form)).toMatchObject({
        ok: true,
        special: { gender: value },
      });
    },
  );
  it("일반 객관식 성별 선택도 답변으로 보존한다", () => {
    const form = new FormData();
    form.set("custom_gender", "여성");
    expect(
      extractReservationFormData(
        [{ ...gender, type: "single_choice", options: ["남성", "여성"] }],
        form,
      ),
    ).toMatchObject({
      ok: true,
      answers: [{ fieldId: "gender", value: "여성" }],
    });
  });
  it("관리자가 선택 문항으로 설정한 성별은 생략할 수 있다", () => {
    expect(
      extractReservationFormData(
        [{ ...gender, required: false }],
        new FormData(),
      ),
    ).toMatchObject({ ok: true, special: { gender: null } });
  });
  it("잘못된 성별 값은 거절한다", () => {
    const form = new FormData();
    form.set("custom_gender", "invalid");
    expect(extractReservationFormData([gender], form).ok).toBe(false);
  });
  it("문항 조회 실패를 빈 문항으로 취급해 필수 검증을 건너뛰지 않는다", async () => {
    order.mockResolvedValueOnce({
      data: null,
      error: { message: "DB unavailable" },
    });
    await expect(loadActiveCustomFields("product")).rejects.toThrow();
  });
  it("문항이 실제로 없는 상품은 빈 목록을 반환한다", async () => {
    order.mockResolvedValueOnce({ data: [], error: null });
    await expect(loadActiveCustomFields("product")).resolves.toEqual([]);
  });
});
