import "server-only";
import { getAccessToken } from "./auth";
import { googleSheetsSpreadsheetId } from "./env";

const API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

async function sheetsFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  const spreadsheetId = googleSheetsSpreadsheetId();
  const response = await fetch(`${API_BASE}/${spreadsheetId}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `구글 시트 API 실패 (${response.status}) ${body}`.trim(),
    );
  }
  return response.json();
}

// 인스턴스가 살아있는 동안(warm) 탭 목록을 캐싱한다 — 동기화마다 매번
// 메타데이터를 물어볼 필요는 없다. ensureSheet가 새로 만들면 여기도 갱신한다.
let cachedTitles: Set<string> | null = null;

async function listSheetTitles(): Promise<Set<string>> {
  if (cachedTitles) return cachedTitles;
  const data = (await sheetsFetch("?fields=sheets.properties(title)")) as {
    sheets: { properties: { title: string } }[];
  };
  cachedTitles = new Set(data.sheets.map((s) => s.properties.title));
  return cachedTitles;
}

/**
 * 탭이 없으면 만든다. 사장님은 빈 스프레드시트 하나만 만들어 서비스
 * 계정과 공유하면 되고, "예약"/"고객DB" 탭은 첫 동기화 때 앱이 알아서
 * 만든다 — 탭 이름을 미리 맞춰둘 필요가 없다(기본으로 딸려 있는
 * "Sheet1"/"시트1" 탭은 그냥 빈 채로 둔다).
 */
export async function ensureSheet(title: string): Promise<void> {
  const titles = await listSheetTitles();
  if (titles.has(title)) return;

  await sheetsFetch(":batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title } } }],
    }),
  });
  titles.add(title);
}

export async function getValues(range: string): Promise<string[][]> {
  const data = (await sheetsFetch(
    `/values/${encodeURIComponent(range)}`,
  )) as { values?: string[][] };
  return data.values ?? [];
}

// USER_ENTERED(사람이 직접 타이핑한 것처럼 해석)를 쓰면, "01012345678"
// 같은 순수 숫자 문자열을 구글 시트가 숫자로 오인해 앞자리 0을 지워버릴
// 수 있다 — 그러면 다음 동기화 때 그 칸을 다시 찾을 때(findRowByValue)
// 원래 문자열과 더는 일치하지 않아 기존 행을 못 찾고 새 행을 또
// 추가해버린다(중복 행의 원인). RAW는 우리가 넘긴 값을 그대로,
// 해석 없이 저장한다 — 문자열은 문자열로, 숫자는(진짜 number 타입으로
// 넘긴 값은) 숫자로 그대로 들어간다.
const VALUE_INPUT_OPTION = "RAW";

export async function updateValues(
  range: string,
  values: (string | number)[][],
): Promise<void> {
  await sheetsFetch(
    `/values/${encodeURIComponent(range)}?valueInputOption=${VALUE_INPUT_OPTION}`,
    { method: "PUT", body: JSON.stringify({ values }) },
  );
}

export async function appendValues(
  range: string,
  values: (string | number)[][],
): Promise<void> {
  await sheetsFetch(
    `/values/${encodeURIComponent(range)}:append?valueInputOption=${VALUE_INPUT_OPTION}&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values }) },
  );
}

/** 지정한 범위의 값을 전부 비운다(서식은 안 건드림). 전체 덮어쓰기 전에
 * 불러 이전에 남아있던 여분의 행(예: 이번엔 손님이 줄어든 경우)이
 * 안 지워지고 밑에 그대로 남는 걸 막는다. */
export async function clearValues(range: string): Promise<void> {
  await sheetsFetch(`/values/${encodeURIComponent(range)}:clear`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
