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

export async function updateValues(
  range: string,
  values: (string | number)[][],
): Promise<void> {
  await sheetsFetch(
    `/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    { method: "PUT", body: JSON.stringify({ values }) },
  );
}

export async function appendValues(
  range: string,
  values: (string | number)[][],
): Promise<void> {
  await sheetsFetch(
    `/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values }) },
  );
}
