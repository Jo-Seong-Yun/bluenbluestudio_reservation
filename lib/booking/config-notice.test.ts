import { afterEach, expect, it, vi } from "vitest";
const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/components/booking-products", () => ({
  BookingProducts: () => null,
}));
vi.mock("@/app/booking/booking-list-view-tracker", () => ({
  BookingListViewTracker: () => null,
}));
import BookingPage from "@/app/booking/page";
import { ConfigNotice } from "@/components/config-notice";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
it("shows missing Preview configuration without attempting a database connection", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  const result = await BookingPage();
  expect(result.type).toBe(ConfigNotice);
  expect(result.props.missing).toEqual([
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ]);
  expect(createClient).not.toHaveBeenCalled();
});
