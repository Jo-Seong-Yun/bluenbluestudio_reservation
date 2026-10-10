import { beforeEach, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { createClient, requireAdmin, updateBookingSettings, revalidatePath } =
  vi.hoisted(() => ({
    createClient: vi.fn(),
    requireAdmin: vi.fn(),
    updateBookingSettings: vi.fn(),
    revalidatePath: vi.fn(),
  }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/auth", () => ({ requireAdmin }));
vi.mock("@/lib/booking/style-storage", () => ({ updateBookingSettings }));
vi.mock("next/cache", () => ({ revalidatePath }));
import { saveProductBookingCopy } from "@/app/admin/booking-copy-actions";
import { formPages, copyWithPages } from "./form-pages";
import { resolveCopy } from "./copy";
beforeEach(() => {
  vi.clearAllMocks();
  createClient.mockResolvedValue({
    from: (table: string) => ({
      select: () => ({
        eq: () =>
          table === "products"
            ? { maybeSingle: async () => ({ data: { id: "a" }, error: null }) }
            : Promise.resolve({ data: [{ id: "q" }], error: null }),
      }),
    }),
  });
});
it("saves page edits without replacing product details, other products, styling or existing placeholders", async () => {
  const initial = {
    accentColor: "#123456",
    productCopies: {
      a: {
        detailIntro: "상품 안내",
        "placeholder:q": "입력 예시",
        "group:q": "2",
      },
      b: { actorTitle: "다른 상품" },
    },
  };
  let saved: unknown;
  updateBookingSettings.mockImplementation(async (transform) => {
    saved = transform(initial);
  });
  const data = new FormData();
  data.set("productId", "a");
  data.set(
    "formPages",
    JSON.stringify([
      ...formPages(resolveCopy(initial.productCopies.a)),
      { id: 4, label: "추가", title: "맞춤 제목", intro: "맞춤 설명" },
    ]),
  );
  data.set("group:q", "4");
  data.set("order:q", "0");
  expect(await saveProductBookingCopy(null, data)).toEqual({ success: true });
  expect(saved).toMatchObject({
    accentColor: "#123456",
    productCopies: {
      a: {
        detailIntro: "상품 안내",
        "placeholder:q": "입력 예시",
        "group:q": "4",
        "order:q": "0",
      },
      b: { actorTitle: "다른 상품" },
    },
  });
  expect(requireAdmin).toHaveBeenCalledOnce();
  expect(revalidatePath).toHaveBeenCalledWith("/booking", "layout");
});
it("saves detail-only edits without resetting the page configuration", async () => {
  const source = copyWithPages(resolveCopy(null), [
    { id: 4, label: "단일 페이지", title: "기존 제목", intro: "" },
  ]);
  let saved:
    { productCopies: Record<string, Record<string, string>> } | undefined;
  updateBookingSettings.mockImplementation(async (transform) => {
    saved = transform({ productCopies: { a: source } });
  });
  const data = new FormData();
  data.set("productId", "a");
  data.set("detailIntro", "새 상품 안내");
  expect(await saveProductBookingCopy(null, data)).toEqual({ success: true });
  expect(saved!.productCopies.a.formPages).toBe(source.formPages);
  expect(saved!.productCopies.a.detailIntro).toBe("새 상품 안내");
});
it("rejects invalid assignments and keeps failed saves as errors", async () => {
  const data = new FormData();
  data.set("productId", "a");
  data.set("group:q", "9");
  expect(await saveProductBookingCopy(null, data)).toHaveProperty("error");
  expect(updateBookingSettings).not.toHaveBeenCalled();
  data.delete("group:q");
  updateBookingSettings.mockRejectedValue(new Error("저장 실패"));
  expect(await saveProductBookingCopy(null, data)).toEqual({
    error: "저장 실패",
  });
});
