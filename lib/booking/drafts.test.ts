import { expect, it } from "vitest";
import { answerDrafts, clearBookingDrafts, draftStorageKey } from "./drafts";

it("clears every product's answers and saved page without deleting unrelated storage", () => {
  const items = new Map([
    [
      draftStorageKey("a"),
      JSON.stringify({ answers: { name: ["홍길동"] }, group: "contact" }),
    ],
    [draftStorageKey("b"), "another draft"],
    ["booking-analytics", "keep"],
  ]);
  answerDrafts.set("a", { name: ["홍길동"] });
  answerDrafts.set("b", { option: ["yes"] });
  clearBookingDrafts({
    get length() {
      return items.size;
    },
    key: (index: number) => [...items.keys()][index] ?? null,
    removeItem: (key: string) => {
      items.delete(key);
    },
  } as Storage);
  expect(answerDrafts.size).toBe(0);
  expect([...items.entries()]).toEqual([["booking-analytics", "keep"]]);
});

it("clears memory even when browser storage is unavailable", () => {
  answerDrafts.set("a", { name: ["홍길동"] });
  clearBookingDrafts({
    get length(): number {
      throw new Error("blocked");
    },
  } as Storage);
  expect(answerDrafts.size).toBe(0);
});
