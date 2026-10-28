import { beforeEach, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn(), eq: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: m.insert,
      update: (v: unknown) => {
        m.update(v);
        return { eq: m.eq };
      },
    }),
  }),
}));
import { saveApplicationOriginal, markSubmission } from "./save-submission";
import type { SubmittedApplication } from "./submission";
beforeEach(() => {
  vi.clearAllMocks();
  m.insert.mockResolvedValue({ error: null });
  m.eq.mockResolvedValue({ error: null });
});
it("stores a single original and marks successful indexing complete", async () => {
  expect(
    await saveApplicationOriginal("r", { version: 1 } as SubmittedApplication),
  ).toBe(true);
  await markSubmission("r", true, true, []);
  expect(m.update).toHaveBeenCalledWith({
    submission_state: "complete",
    submission_error_codes: [],
  });
});
it("preserves acceptance and exposes partial / failed / unverified data", async () => {
  m.insert.mockRejectedValue(new Error("offline"));
  expect(await saveApplicationOriginal("r", {} as SubmittedApplication)).toBe(
    false,
  );
  await markSubmission("r", true, false, []);
  expect(m.update).toHaveBeenLastCalledWith({
    submission_state: "partial",
    submission_error_codes: ["answers_save_failed"],
  });
  await markSubmission("r", false, false, []);
  expect(m.update).toHaveBeenLastCalledWith({
    submission_state: "failed",
    submission_error_codes: ["original_save_failed", "answers_save_failed"],
  });
  await markSubmission("r", true, true, ["original_layout_unverified"]);
  expect(m.update).toHaveBeenLastCalledWith({
    submission_state: "partial",
    submission_error_codes: ["original_layout_unverified"],
  });
  m.eq.mockRejectedValue(new Error("offline"));
  await expect(markSubmission("r", false, false, [])).resolves.toBeUndefined();
});
