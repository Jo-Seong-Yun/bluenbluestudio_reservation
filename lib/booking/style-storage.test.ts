import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
import { updateBookingSettings } from "./style-storage";
beforeEach(() => vi.clearAllMocks());
it("retries a concurrent update and preserves the latest product copy", async () => {
  let reads = 0;
  const writes: unknown[] = [];
  const db = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              booking_style: reads++
                ? { productCopies: { other: { detailIntro: "동시 수정" } } }
                : {},
            },
            error: null,
          }),
        }),
      }),
      update: (value: unknown) => {
        writes.push(value);
        return {
          eq: () => ({
            filter: () => ({
              select: async () => ({
                data: writes.length === 1 ? [] : [{ id: 1 }],
                error: null,
              }),
            }),
          }),
        };
      },
    }),
  };
  createClient.mockResolvedValue(db);
  await updateBookingSettings((current) => ({
    ...current,
    accentColor: "#044aad",
  }));
  expect(writes).toHaveLength(2);
  expect(writes[1]).toEqual({
    booking_style: {
      productCopies: { other: { detailIntro: "동시 수정" } },
      accentColor: "#044aad",
    },
  });
});
it("does not report a write error as saved", async () => {
  createClient.mockResolvedValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { booking_style: null }, error: null }),
        }),
      }),
      update: () => ({
        eq: () => ({
          is: () => ({
            select: async () => ({ error: { message: "denied" }, data: null }),
          }),
        }),
      }),
    }),
  });
  await expect(updateBookingSettings((current) => current)).rejects.toThrow(
    "저장하지 못했습니다",
  );
});
