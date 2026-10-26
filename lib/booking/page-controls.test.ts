import { expect, it } from "vitest";
import { resolveCopy, fieldGroup } from "./copy";
import { formPages, copyWithPages, parseFormPages } from "./form-pages";
import { customerFields, customerCopy } from "./page-controls";
import type { CustomField } from "./custom-fields-shared";
it("round trips hidden pages and button labels and rejects an all-hidden form", () => {
  const pages = formPages(resolveCopy(null)).map((p) => ({
    ...p,
    hidden: p.id === 2,
    buttonLabel: "다음으로",
  }));
  const copy = resolveCopy(copyWithPages(resolveCopy(null), pages));
  expect(formPages(copy)[2]).toMatchObject({
    hidden: true,
    buttonLabel: "다음으로",
  });
  expect(
    parseFormPages(JSON.stringify(pages.map((p) => ({ ...p, hidden: true })))),
  ).toBeNull();
});
it("excludes hidden required and priced fields while retaining identity fields in a visible group", () => {
  const fields = [
    { id: "name", type: "name", active: true },
    { id: "phone", type: "phone", active: true },
    { id: "addon", type: "multi_choice", active: true, required: true },
  ] as CustomField[];
  const copy = copyWithPages(
    resolveCopy({ "group:name": "2", "group:phone": "2", "group:addon": "2" }),
    formPages(resolveCopy(null)).map((p) => ({ ...p, hidden: p.id === 2 })),
  );
  expect(customerFields(fields, copy).map((f) => f.id)).toEqual([
    "name",
    "phone",
  ]);
  const effective = customerCopy(copy, fields);
  expect(fieldGroup(fields[0], effective)).toBe(0);
  expect(copy["group:name"]).toBe("2");
});
it("preserves hidden/deleted stage settings and defaults invalid values safely", () => {
  expect(
    resolveCopy({ detailPageState: "deleted", reviewPageState: "hidden" }),
  ).toMatchObject({ detailPageState: "deleted", reviewPageState: "hidden" });
  expect(resolveCopy({ detailPageState: "bad" }).detailPageState).toBe(
    "visible",
  );
});
