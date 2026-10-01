import { describe, expect, it } from "vitest";
import {
  MAX_TEAM_EMAILS,
  initialTeamEmailRows,
  normalizeTeamEmails,
  readTeamEmailsFromForm,
} from "./team-emails";

describe("normalizeTeamEmails", () => {
  it("빈 칸을 버리고 공백·대소문자를 정리한다", () => {
    expect(normalizeTeamEmails(["", "  A@X.test ", "b@x.test"])).toEqual({
      ok: true,
      emails: ["a@x.test", "b@x.test"],
    });
  });

  it("중복과 예약자 본인 주소는 뺀다", () => {
    expect(
      normalizeTeamEmails(["a@x.test", "A@x.test", "me@x.test"], "Me@x.test"),
    ).toEqual({ ok: true, emails: ["a@x.test"] });
  });

  it("형식이 틀린 주소가 있으면 막는다", () => {
    const result = normalizeTeamEmails(["a@x.test", "not-an-email"]);
    expect(result.ok).toBe(false);
  });

  it("최대 개수를 넘으면 막는다", () => {
    const many = Array.from({ length: MAX_TEAM_EMAILS + 1 }, (_, i) => `t${i}@x.test`);
    expect(normalizeTeamEmails(many).ok).toBe(false);
  });
});

describe("readTeamEmailsFromForm", () => {
  it("팀원 칸이 없는 폼이면 null", () => {
    expect(readTeamEmailsFromForm(new FormData())).toBeNull();
  });

  it("칸을 전부 비우면 빈 목록", () => {
    const fd = new FormData();
    fd.set("teamEmailsPresent", "1");
    fd.append("teamEmails", "");
    expect(readTeamEmailsFromForm(fd)).toEqual({ ok: true, emails: [] });
  });
});

describe("initialTeamEmailRows", () => {
  it("저장된 팀원이 있으면 그대로 보여준다", () => {
    expect(initialTeamEmailRows(["a@x.test"], 4)).toEqual(["a@x.test"]);
  });

  it("없으면 최대 인원에서 1을 뺀 만큼 빈 칸", () => {
    expect(initialTeamEmailRows([], 3)).toEqual(["", ""]);
    expect(initialTeamEmailRows([], 1)).toEqual([]);
    expect(initialTeamEmailRows([], null)).toEqual([]);
  });
});
