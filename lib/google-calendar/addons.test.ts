import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
import { calendarAddonLines } from "./addons";
import type { CustomField } from "@/lib/booking/custom-fields-shared";
const field: CustomField = {
  id: "f",
  product_id: "p",
  label: "추가옵션",
  type: "multi_choice",
  options: ["대본 추가", "무료 제공"],
  option_prices: [10000, 0],
  description: null,
  required: false,
  active: false,
  sort_order: 0,
  created_at: "2026-10-03",
};
describe("캘린더 추가옵션", () => {
  it("저장된 복수 선택의 가격과 무료 옵션을 표시하고 비활성 문항 답변도 유지한다", () => {
    expect(
      calendarAddonLines(
        [field],
        [{ fieldId: "f", value: '["대본 추가","무료 제공"]' }],
      ),
    ).toEqual(["대본 추가 (+10,000원)", "무료 제공"]);
  });
  it("일반 신청서 답변은 추가옵션에 섞지 않는다", () => {
    expect(
      calendarAddonLines(
        [
          {
            ...field,
            label: "성별",
            option_prices: null,
            type: "single_choice",
          },
        ],
        [{ fieldId: "f", value: "남성" }],
      ),
    ).toEqual([]);
  });
  it("다른 이름의 유료 옵션 문항과 음수 가격도 표시한다", () => {
    expect(
      calendarAddonLines(
        [
          {
            ...field,
            label: "후반 작업",
            type: "single_choice",
            option_prices: [-5000, 0],
          },
        ],
        [{ fieldId: "f", value: "대본 추가" }],
      ),
    ).toEqual(["대본 추가 (-5,000원)"]);
  });
});
