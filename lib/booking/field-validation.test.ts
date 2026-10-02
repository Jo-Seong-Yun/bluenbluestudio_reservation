import { describe, expect, it } from "vitest";
import { bookingFieldError } from "./field-validation";
import { fieldFormName, type CustomField } from "./custom-fields-shared";
const field = (type: CustomField["type"], required = true): CustomField => ({
  id: "field",
  product_id: "product",
  type,
  label: "문항",
  required,
  options: ["A", "B"],
  option_prices: null,
  description: null,
  active: true,
  sort_order: 0,
  created_at: "",
});
const data = (...values: string[]) => {
  const form = new FormData();
  values.forEach((v) => form.append(fieldFormName("field"), v));
  return form;
};
describe("Enter 문항 검증", () => {
  it("빈 필수 문항과 공백만 입력한 이름은 이동하지 않습니다", () => {
    expect(bookingFieldError(field("name"), data("   "))).not.toBeNull();
  });
  it("연락처는 서버와 동일하게 하이픈을 허용하고 잘못된 번호를 거절합니다", () => {
    expect(bookingFieldError(field("phone"), data("010-1234-5678"))).toBeNull();
    expect(bookingFieldError(field("phone"), data("010"))).not.toBeNull();
  });
  it("선택 이메일은 건너뛸 수 있지만 잘못 입력한 주소는 거절합니다", () => {
    expect(bookingFieldError(field("email", false), data(""))).toBeNull();
    expect(
      bookingFieldError(field("email", false), data("wrong")),
    ).not.toBeNull();
  });
  it("존재하지 않는 날짜와 미래의 생년월일은 거절합니다", () => {
    expect(
      bookingFieldError(field("birth_date"), data("20010230")),
    ).not.toBeNull();
    expect(
      bookingFieldError(field("birth_date"), data("29990101")),
    ).not.toBeNull();
  });
  it("복수 선택은 하나 이상 선택한 그룹만 통과합니다", () => {
    expect(bookingFieldError(field("multi_choice"), data())).not.toBeNull();
    expect(bookingFieldError(field("multi_choice"), data("A", "B"))).toBeNull();
    expect(
      bookingFieldError(field("multi_choice"), data("unknown")),
    ).not.toBeNull();
  });
  it("필수 동의와 성별 누락을 거절합니다", () => {
    expect(bookingFieldError(field("checkbox"), data())).not.toBeNull();
    expect(bookingFieldError(field("gender"), data())).not.toBeNull();
    expect(bookingFieldError(field("gender"), data("female"))).toBeNull();
  });
});
