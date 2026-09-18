import { buildRecordSheetData } from "@/lib/record-sheet/build-data";
import { RecordSheetView } from "./record-sheet-view";

/**
 * "촬영 기록표"(lib/record-sheet/template.docx)와 같은 데이터를 화면에
 * 보여주고 바로 인쇄한다. 실제 .docx 파일은 옆의 다운로드 라우트
 * (record-sheet/route.ts)가 따로 만든다 — 이 페이지는 그 파일을 열어
 * 보여주는 게 아니라, 같은 데이터를 HTML 표로 다시 그려서 인쇄에
 * 최적화한 화면일 뿐이다. 둘 다 buildRecordSheetData 하나로 값을
 * 얻으므로 내용은 항상 같다.
 */
export default async function RecordSheetPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await buildRecordSheetData(id);
  if (!result.ok) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="text-red-600 dark:text-red-400">{result.error}</p>
      </div>
    );
  }

  return <RecordSheetView tags={result.tags} />;
}
