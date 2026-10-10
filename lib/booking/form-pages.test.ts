import { describe, it, expect } from "vitest";
import {
  formPages,
  parseFormPages,
  copyWithPages,
  orderedFormFields,
  remapFormCopy,
} from "./form-pages";
import { resolveCopy, fieldGroup } from "./copy";
import type { CustomField } from "./custom-fields-shared";
const field = (id: string, type = "long_text", sort_order = 0) =>
  ({ id, type, label: id, sort_order, active: true }) as CustomField;
describe("상품별 신청서 페이지", () => {
  it("preserves legacy page titles and existing assignment without a migration", () => {
    const copy = resolveCopy({
      actorTitle: "기존 제목",
      requestIntro: "기존 설명",
      "group:q": "3",
      "placeholder:q": "기존 예시",
    });
    expect(formPages(copy).map((p) => p.id)).toEqual([0, 1, 2, 3]);
    expect(formPages(copy)[0].title).toBe("기존 제목");
    expect(formPages(copy)[2].intro).toBe("기존 설명");
    expect(fieldGroup(field("q"), copy)).toBe(3);
  });
  it("round-trips additional pages and reordered pages while keeping stable actor/contact IDs", () => {
    const copy = resolveCopy(null),
      pages = formPages(copy);
    const edited = resolveCopy(
      copyWithPages({ ...copy, "group:q": "4" }, [
        pages[1],
        pages[0],
        { id: 4, label: "별도 요청", title: "새 제목", intro: "" },
        pages[2],
        pages[3],
      ]),
    );
    expect(formPages(edited).map((p) => p.id)).toEqual([1, 0, 4, 2, 3]);
    expect(fieldGroup(field("q"), edited)).toBe(4);
    expect(fieldGroup(field("name", "name"), edited)).toBe(0);
  });
  it("keeps unassigned questions reachable when their legacy page was removed", () => {
    const copy = copyWithPages(resolveCopy(null), [
      { id: 4, label: "통합", title: "모두 입력", intro: "" },
    ]);
    expect(fieldGroup(field("phone", "phone"), copy)).toBe(4);
    expect(fieldGroup(field("q"), { ...copy, "group:q": "3" })).toBe(4);
  });
  it("preserves explicit question ordering and original option data", () => {
    const a = {
      ...field("a", "multi_choice", 0),
      options: ["추가"],
      option_prices: [5000],
      option_descriptions: ["설명"],
    };
    const b = field("b", "long_text", 1);
    const result = orderedFormFields([a, b], {
      "order:a": "1",
      "order:b": "0",
    });
    expect(result.map((f) => f.id)).toEqual(["b", "a"]);
    expect(result[1]).toBe(a);
  });
  it("remaps page/placeholder/order keys to copied question IDs without changing source", () => {
    const copy = {
      ...resolveCopy(null),
      "group:a": "3",
      "placeholder:a": "예시",
      "order:a": "2",
      "group:deleted": "1",
    };
    const result = remapFormCopy(copy, { a: "new" });
    expect(result).toMatchObject({
      "group:new": "3",
      "placeholder:new": "예시",
      "order:new": "2",
    });
    expect(result["group:a"]).toBeUndefined();
    expect(result["group:deleted"]).toBeUndefined();
    expect(copy["group:a"]).toBe("3");
  });
  it("rejects duplicate IDs, malformed pages, empty titles and excessive page counts", () => {
    const page = { id: 4, label: "페이지", title: "제목", intro: "" };
    for (const value of [
      "invalid",
      JSON.stringify([]),
      JSON.stringify([page, page]),
      JSON.stringify([{ ...page, title: "" }]),
      JSON.stringify([{ ...page, id: -1 }]),
      JSON.stringify(Array.from({ length: 21 }, (_, id) => ({ ...page, id }))),
    ])
      expect(parseFormPages(value)).toBeNull();
  });
});
