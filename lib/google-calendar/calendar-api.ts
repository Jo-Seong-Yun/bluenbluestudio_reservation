import "server-only";
import { getAccessToken } from "./auth";
import { googleCalendarId } from "./env";

const API_BASE = "https://www.googleapis.com/calendar/v3/calendars";

export type CalendarEventInput = {
  summary: string;
  description: string;
  start: string; // ISO 8601
  end: string; // ISO 8601
};

function toEventBody(event: CalendarEventInput) {
  return {
    summary: event.summary,
    description: event.description,
    start: { dateTime: event.start, timeZone: "Asia/Seoul" },
    end: { dateTime: event.end, timeZone: "Asia/Seoul" },
  };
}

async function calendarFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  const calendarId = googleCalendarId();
  const response = await fetch(
    `${API_BASE}/${encodeURIComponent(calendarId ?? "")}${path}`,
    {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );
  return response;
}

async function assertOk(response: Response, action: string) {
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`구글 캘린더 ${action} 실패 (${response.status}) ${body}`.trim());
  }
}

/** 이벤트를 새로 만들고 이벤트 id를 돌려준다. */
export async function createEvent(event: CalendarEventInput): Promise<string> {
  const response = await calendarFetch("/events", {
    method: "POST",
    body: JSON.stringify(toEventBody(event)),
  });
  await assertOk(response, "이벤트 생성");
  const data = (await response.json()) as { id: string };
  return data.id;
}

/**
 * 기존 이벤트를 갱신한다. 그 이벤트가 캘린더에서 이미 지워졌으면(관리자가
 * 구글 캘린더에서 직접 지운 경우 등) 404를 던진다 — 호출하는 쪽에서
 * 이걸 잡아 새로 만들지 판단한다.
 */
export async function updateEvent(
  eventId: string,
  event: CalendarEventInput,
): Promise<void> {
  const response = await calendarFetch(`/events/${encodeURIComponent(eventId)}`, {
    method: "PUT",
    body: JSON.stringify(toEventBody(event)),
  });
  if (response.status === 404 || response.status === 410) {
    throw new Error("이벤트를 찾을 수 없습니다.");
  }
  await assertOk(response, "이벤트 수정");
}

/** 이벤트를 지운다. 이미 없는 이벤트(404/410)는 조용히 성공으로 친다. */
export async function deleteEvent(eventId: string): Promise<void> {
  const response = await calendarFetch(`/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
  if (response.status === 404 || response.status === 410 || response.ok) {
    return;
  }
  await assertOk(response, "이벤트 삭제");
}
