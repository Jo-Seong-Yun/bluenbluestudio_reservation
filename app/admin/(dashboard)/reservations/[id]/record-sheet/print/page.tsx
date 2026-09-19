import { buildRecordSheetData } from "@/lib/record-sheet/build-data";
import { getRecordSheetTemplateRows } from "@/lib/record-sheet/template-store";
import { resolveRecordSheetRows } from "@/lib/record-sheet/resolve";
import { RecordSheetView } from "./record-sheet-view";

/**
 * "촬영 기록표"를 화면에 보여주고 바로 인쇄한다. 어떤 항목을 어떤
 * 순서로 보여줄지는 관리자가 설정(/admin/settings)에서 편집한 행
 * 구성(record_sheet_template)을 따르고, 실제 값은 이 예약의 데이터로
 * 채운다 — 두 가지를 합치는 계산은 resolveRecordSheetRows 하나가
 * 맡아서, 여기서는 그 결과를 그대로 그리기만 한다.
 */
export default async function RecordSheetPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, templateRows] = await Promise.all([
    buildRecordSheetData(id),
    getRecordSheetTemplateRows(),
  ]);

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="text-red-600 dark:text-red-400">{result.error}</p>
      </div>
    );
  }

  const rows = resolveRecordSheetRows(templateRows, result.tags, result.optionItems);

  return <RecordSheetView rows={rows} />;
}
