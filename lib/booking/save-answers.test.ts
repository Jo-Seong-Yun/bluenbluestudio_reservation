import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ insert: vi.fn(), tables: [] as string[] }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      mocks.tables.push(table);
      return { insert: mocks.insert };
    },
  }),
}));
import { saveSubmittedAnswers } from "./save-answers";
beforeEach(() => {
  mocks.tables = [];
  mocks.insert.mockReset();
  mocks.insert.mockResolvedValue({ error: null });
});
it("persists every validated general answer through the server-only client", async () => {
  const answers = [
    { fieldId: "addons", value: '["흑白","스타일컷"]' },
    { fieldId: "route", value: "영화 커뮤니티" },
    { fieldId: "consent", value: "동의" },
    { fieldId: "style", value: "희망O" },
    { fieldId: "memo", value: "요청" },
  ];
  expect(await saveSubmittedAnswers("created-reservation", answers)).toBe(true);
  expect(mocks.tables).toEqual(["reservation_answers"]);
  expect(mocks.insert).toHaveBeenCalledWith(
    answers.map((a) => ({
      reservation_id: "created-reservation",
      field_id: a.fieldId,
      value: a.value,
    })),
  );
});
it("keeps acceptance possible on an RLS failure and archives a signal without answer text", async () => {
  mocks.insert.mockResolvedValueOnce({
    error: { code: "42501", message: "private" },
  });
  expect(
    await saveSubmittedAnswers("created-reservation", [
      { fieldId: "memo", value: "secret answer" },
    ]),
  ).toBe(false);
  expect(mocks.tables).toEqual(["reservation_answers", "audit_logs"]);
  expect(mocks.insert.mock.calls[1][0]).toMatchObject({
    event_kind: "answer_save_failed",
    source_id: "created-reservation",
  });
  expect(JSON.stringify(mocks.insert.mock.calls[1])).not.toContain(
    "secret answer",
  );
});
it("does not turn a thrown storage or audit error into a failed customer reservation", async () => {
  mocks.insert.mockRejectedValue(new Error("offline"));
  expect(
    await saveSubmittedAnswers("created-reservation", [
      { fieldId: "x", value: "x" },
    ]),
  ).toBe(false);
});
it("skips an empty answer set", async () => {
  expect(await saveSubmittedAnswers("id", [])).toBe(true);
  expect(mocks.insert).not.toHaveBeenCalled();
});
