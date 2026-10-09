import { expect, it } from "vitest";
import {
  answerDrafts,
  clearBookingDrafts,
  draftStorageKey,
  timeDrafts,
} from "./drafts";

it("clears every product's answers, saved page and selected schedules without deleting unrelated storage", () => {
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
  timeDrafts.set("a", [{ date: "2026-12-01", time: "10:00" }]);
  timeDrafts.set("b", [{ date: "2026-12-02", time: "11:00" }]);
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
  expect(timeDrafts.size).toBe(0);
  expect([...items.entries()]).toEqual([["booking-analytics", "keep"]]);
});

it("clears memory even when browser storage is unavailable", () => {
  answerDrafts.set("a", { name: ["홍길동"] });
  timeDrafts.set("a", [{ date: "2026-12-01", time: "10:00" }]);
  timeDrafts.set("b", [{ date: "2026-12-02", time: "11:00" }]);
  clearBookingDrafts({
    get length(): number {
      throw new Error("blocked");
    },
  } as Storage);
  expect(answerDrafts.size).toBe(0);
  expect(timeDrafts.size).toBe(0);
});
