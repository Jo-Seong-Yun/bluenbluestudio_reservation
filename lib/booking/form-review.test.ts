import { describe, expect, it } from "vitest";
import {
  bookingReviewAnswers,
  visibleBookingFields,
  type CustomField,
} from "./custom-fields-shared";
const field = (patch: Partial<CustomField> = {}): CustomField => ({
  id: "name",
  product_id: "p1",
  label: "이름",
  type: "name",
  options: null,
  option_prices: null,
  description: null,
  required: true,
  active: true,
  sort_order: 0,
  created_at: "2026-10-01T00:00:00Z",
  ...patch,
});
describe("편집 가능한 신청서와 확인 단계", () => {
  it("비활성 문항은 숨기고 저장된 순서와 제목·보기 변경을 보존한다", () => {
    const fields = [
      field({ sort_order: 5 }),
      field({ id: "hidden", active: false, sort_order: -1 }),
      field({
        id: "gender",
        label: "촬영자 성별",
        options: ["직접 선택"],
        type: "single_choice",
        sort_order: 1,
      }),
    ];
    const data = new FormData();
    data.set("custom_name", "예약자");
    data.set("custom_gender", "직접 선택");
    expect(visibleBookingFields(fields).map((f) => f.id)).toEqual([
      "gender",
      "name",
    ]);
    expect(bookingReviewAnswers(fields, data)).toEqual([
      { id: "gender", label: "촬영자 성별", value: "직접 선택" },
      { id: "name", label: "이름", value: "예약자" },
    ]);
    expect(fields[0].id).toBe("name");
  });
  it("여러 옵션과 장문 답변을 실제 제출 값으로 확인하고 선택하지 않은 문항도 표시한다", () => {
    const fields = [
      field({ id: "options", type: "multi_choice" }),
      field({ id: "memo", type: "long_text" }),
      field({ id: "agree", type: "checkbox" }),
      field({ id: "optional", required: false }),
    ];
    const data = new FormData();
    data.append("custom_options", "편집본");
    data.append("custom_options", "촬영 연장");
    data.set("custom_memo", "첫 줄\n둘째 줄");
    data.set("custom_agree", "on");
    expect(bookingReviewAnswers(fields, data).map((a) => a.value)).toEqual([
      "편집본, 촬영 연장",
      "첫 줄\n둘째 줄",
      "확인함",
      "입력하지 않음",
    ]);
  });
});
