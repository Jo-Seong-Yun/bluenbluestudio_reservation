import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_RECORD_SHEET_ROWS,
  parseRecordSheetRows,
  type RecordSheetRow,
} from "./schema";

/**
 * 관리자가 설정 화면에서 저장한 기록표 행 구성을 읽어온다. 아직 한
 * 번도 저장한 적 없거나(행이 빈 배열) 저장된 값이 깨져 있으면
 * DEFAULT_RECORD_SHEET_ROWS로 되돌아가, 인쇄 미리보기가 절대 빈
 * 화면으로 보이지 않게 한다.
 */
export async function getRecordSheetTemplateRows(): Promise<RecordSheetRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("record_sheet_template")
    .select("rows")
    .eq("id", 1)
    .maybeSingle();

  const parsed = data ? parseRecordSheetRows(data.rows) : null;
  return parsed && parsed.length > 0 ? parsed : DEFAULT_RECORD_SHEET_ROWS;
}
