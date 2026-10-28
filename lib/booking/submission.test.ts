import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/env", () => ({
  supabaseSecretKey: () => "test-signing-key",
}));
import { signApplication, readApplication } from "./submission-token";
import {
  captureApplication,
  applicationSummary,
  submittedPrice,
  type ApplicationDefinition,
} from "./submission";
import { fieldFormName, type CustomField } from "./custom-fields-shared";
const field = {
  id: "f1",
  product_id: "p1",
  label: "当時の質問",
  type: "multi_choice",
  options: ["白黒", "スタイル"],
  option_prices: [5000, 20000],
  description: "当時の説明",
  required: true,
  active: true,
  sort_order: 0,
  created_at: "",
} as CustomField;
const definition = (): ApplicationDefinition => ({
  version: 1,
  renderedAt: Date.now(),
  product: {
    id: "p1",
    name: "원래 상품",
    basePrice: 70000,
    durationMin: 60,
    bufferAfterMin: 0,
  },
  fields: [structuredClone(field)],
  copy: {
    "group:f1": "7",
    formPages: JSON.stringify([
      { id: 7, label: "원래 페이지", title: "원래 제목", intro: "설명" },
    ]),
  },
});
describe("submitted original", () => {
  it("authenticates the exact rendered schema and rejects tampering, expiry and another product", () => {
    const d = definition(),
      token = signApplication(d);
    expect(readApplication(token, "p1")).toEqual(d);
    expect(readApplication(token + "x", "p1")).toBeNull();
    expect(readApplication(token, "p2")).toBeNull();
    expect(
      readApplication(
        signApplication({ ...d, renderedAt: Date.now() - 86400001 }),
        "p1",
      ),
    ).toBeNull();
    expect(
      readApplication(
        signApplication({ ...d, renderedAt: Date.now() + 120000 }),
        "p1",
      ),
    ).toBeNull();
  });
  it("retains original labels, choices, prices, descriptions, layout, blanks and answers after edits/deletion", () => {
    const d = definition(),
      data = new FormData();
    data.append(fieldFormName("f1"), "白黒");
    data.append(fieldFormName("f1"), "スタイル");
    const snapshot = captureApplication(
      d,
      data,
      [{ date: "2026-12-01", time: "10:00" }],
      submittedPrice(d.fields, data, 70000),
      "rendered",
      [],
    );
    d.fields[0].label = "수정";
    d.fields[0].options = [];
    d.fields = [];
    d.copy.formPages = "[]";
    expect(snapshot.estimatedAmount).toBe(95000);
    expect(snapshot.fields[0].label).toBe(field.label);
    expect(applicationSummary(snapshot)[0].value).toContain("白黒");
    expect(snapshot.copy.formPages).toContain("원래 제목");
    expect(snapshot.fields[0].description).toBe(field.description);
  });
  it("ignores unknown paid choices and repeated labels when calculating price", () => {
    const d = definition(),
      data = new FormData();
    for (const value of ["白黒", "白黒", "unknown"])
      data.append(fieldFormName("f1"), value);
    expect(submittedPrice(d.fields, data, 70000)).toBe(75000);
  });
});
