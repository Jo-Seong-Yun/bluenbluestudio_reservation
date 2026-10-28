import { beforeEach, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  original: vi.fn(),
  answers: vi.fn(),
  mark: vi.fn(),
  definition: null as unknown,
}));
vi.mock("./submission-token", () => ({ readApplication: () => m.definition }));
vi.mock("./save-submission", () => ({
  saveApplicationOriginal: m.original,
  markSubmission: m.mark,
}));
vi.mock("./save-answers", () => ({ saveSubmittedAnswers: m.answers }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/availability/load", () => ({
  loadAvailableSlots: async () => [
    { time: "10:00" },
    { time: "11:00" },
    { time: "12:00" },
  ],
}));
vi.mock("./custom-fields", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./custom-fields")>()),
  loadActiveCustomFields: async () => fields,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: m.rpc,
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        single: async () => ({
          data:
            table === "products"
              ? {
                  name: "현재 서버 상품",
                  price: 70000,
                  sale_price: null,
                  duration_min: 60,
                  buffer_after_min: 0,
                }
              : { booking_style: {} },
          error: null,
        }),
      };
      return q;
    },
  }),
}));
import { createReservation } from "./actions";
import { fieldFormName, type CustomField } from "./custom-fields-shared";
const fields = ["name", "phone", "email", "multi_choice"].map(
  (type, i) =>
    ({
      id: `f${i}`,
      product_id: "p",
      label: `質問${i}`,
      type,
      required: i < 2,
      active: true,
      sort_order: i,
      description: null,
      options: type === "multi_choice" ? ["a", "b"] : null,
      option_prices: type === "multi_choice" ? [5000, 20000] : null,
      created_at: "",
    }) as CustomField,
);
function form(email = "actor@example.com") {
  const data = new FormData();
  for (const time of ["10:00", "11:00", "12:00"]) {
    data.append("candidateDate", "2026-12-01");
    data.append("candidateTime", time);
  }
  for (const [i, value] of [
    [0, "박배우"],
    [1, "01012345678"],
    [2, email],
    [3, "a"],
    [3, "b"],
  ] as const)
    data.append(fieldFormName(`f${i}`), value);
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  m.definition = {
    version: 1,
    renderedAt: Date.now(),
    product: {
      id: "p",
      name: "원래 상품",
      basePrice: 70000,
      durationMin: 60,
      bufferAfterMin: 0,
    },
    fields,
    copy: {},
  };
  m.rpc.mockResolvedValue({
    data: { id: "created", deposit_required: false },
    error: null,
  });
  m.original.mockResolvedValue(true);
  m.answers.mockResolvedValue(true);
  m.mark.mockResolvedValue(undefined);
});
async function submit(data: FormData) {
  return createReservation(
    "p",
    "forged",
    60,
    0,
    1,
    null,
    null,
    { status: "idle" },
    data,
  );
}
it("uses rendered price and saves the entire original before indexing the answers", async () => {
  const result = await submit(form());
  expect(result.status).toBe("success");
  expect(m.rpc.mock.calls[0][1]).toMatchObject({
    p_estimated_amount: 95000,
    p_customer_name: "박배우",
    p_customer_phone: "01012345678",
  });
  expect(m.original.mock.calls[0][1]).toMatchObject({
    estimatedAmount: 95000,
    answers: { f3: ["a", "b"] },
    provenance: "rendered",
  });
  expect(m.mark).toHaveBeenCalledWith("created", true, true, []);
});
it("accepts valid identity and price when a nonessential answer is invalid, with an explicit warning", async () => {
  expect((await submit(form("bad email"))).status).toBe("success");
  expect(m.rpc.mock.calls[0][1]).toMatchObject({
    p_estimated_amount: 95000,
    p_customer_name: "박배우",
  });
  expect(m.original.mock.calls[0][1].answers.f2).toEqual(["bad email"]);
  expect(m.mark).toHaveBeenCalledWith("created", true, true, [
    "answer_validation_incomplete",
  ]);
});
it("keeps customer acceptance and price even when original and answer storage both fail", async () => {
  m.original.mockResolvedValue(false);
  m.answers.mockResolvedValue(false);
  expect((await submit(form())).status).toBe("success");
  expect(m.mark).toHaveBeenCalledWith("created", false, false, []);
});
it("rejects invalid essential identity before creating any reservation", async () => {
  const data = form();
  data.set(fieldFormName("f1"), "bad");
  expect((await submit(data)).status).toBe("error");
  expect(m.rpc).not.toHaveBeenCalled();
});

it("accepts pre-deployment tabs with server definitions and marks original layout unverified", async () => {
  m.definition = null;
  expect((await submit(form())).status).toBe("success");
  expect(m.rpc.mock.calls[0][1].p_estimated_amount).toBe(95000);
  expect(m.original.mock.calls[0][1]).toMatchObject({
    provenance: "current_definition",
    issues: ["original_layout_unverified"],
  });
});
