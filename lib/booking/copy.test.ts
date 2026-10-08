import { describe, it, expect } from "vitest";
import { DEFAULT_COPY, resolveCopy, productCopy, fieldGroup } from "./copy";
import type { CustomField } from "./custom-fields-shared";
const field = (label: string, type: string, id = "field"): CustomField =>
  ({
    id,
    label,
    type,
    required: false,
    active: true,
    options: null,
    option_prices: null,
    description: null,
    product_id: "product",
    sort_order: 0,
    created_at: "",
  }) as CustomField;
describe("상품 예약 문구", () => {
  it("삭제한 설명은 빈 값으로 유지하고 나머지 편집 항목은 보존한다", () => {
    expect(
      resolveCopy({
        consentIntro: "",
        reviewIntro: "",
        process1Body: "맞춤 절차",
        nextNote: "맞춤 안내",
      }),
    ).toMatchObject({
      consentIntro: "",
      reviewIntro: "",
      process1Body: "맞춤 절차",
      nextNote: "맞춤 안내",
    });
    expect(
      resolveCopy({
        reviewIntro: "입력한 정보와 희망 시간을 확인한 후 신청합니다.",
        actorTitle: "촬영하실 배우 정보를 알려주세요",
      }),
    ).toMatchObject({ reviewIntro: "", actorTitle: DEFAULT_COPY.actorTitle });
    expect(resolveCopy({ actorTitle: "직접 편집한 제목" }).actorTitle).toBe(
      "직접 편집한 제목",
    );
  });
  it("누락/잘못된 저장값은 기본 문구로 보완하고 상품별로 격리한다", () => {
    expect(
      resolveCopy({
        actorTitle: "  새 제목  ",
        timesTitle: 32,
        reviewTitle: "",
      }),
    ).toMatchObject({
      actorTitle: "새 제목",
      timesTitle: DEFAULT_COPY.timesTitle,
      reviewTitle: DEFAULT_COPY.reviewTitle,
    });
    expect(
      productCopy(
        { productCopies: { a: { actorTitle: "A" }, b: { actorTitle: "B" } } },
        "a",
      ).actorTitle,
    ).toBe("A");
    expect(productCopy(null, "a")).toEqual(DEFAULT_COPY);
  });
  it("예약 상태 문구를 관리자 입력으로 덮어쓸 수 없다", () => {
    const value = resolveCopy({
      status: "확정",
      bankAccount: "조작",
      successTitle: "접수 안내",
    });
    expect(value.status).toBeUndefined();
    expect(value.bankAccount).toBeUndefined();
  });
  it("변경된 문항 제목도 저장된 배치값으로 유지된다", () => {
    expect(
      fieldGroup(field("새로운 문항 이름", "single_choice"), {
        "group:field": "3",
      }),
    ).toBe(3);
    expect(fieldGroup(field("추가옵션", "single_choice"))).toBe(2);
    expect(fieldGroup(field("배우님 성별", "single_choice"))).toBe(0);
    expect(fieldGroup(field("신청자 성명", "short_text"))).toBe(1);
    expect(fieldGroup(field("연락처", "phone"))).toBe(1);
    expect(fieldGroup(field("개인정보 수집 동의", "checkbox"))).toBe(3);
    expect(fieldGroup(field("완성본의 '푸르른 스튜디오' 인스타그램 게시", "single_choice"))).toBe(3);
  });
  it("빈 페이지를 구성할 때 문항은 하나의 묶음에만 포함된다", () => {
    const fields = [
      field("이름", "name"),
      field("연락처", "phone"),
      field("요청사항", "long_text"),
      field("SNS 동의", "single_choice"),
    ];
    expect(
      [0, 1, 2, 3].flatMap((group) =>
        fields.filter((f) => fieldGroup(f) === group),
      ),
    ).toHaveLength(fields.length);
  });
});
