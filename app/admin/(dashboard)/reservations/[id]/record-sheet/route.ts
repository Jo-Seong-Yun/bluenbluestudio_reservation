import fs from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { buildRecordSheetData } from "@/lib/record-sheet/build-data";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "lib/record-sheet/template.docx",
);

/**
 * 예약 정보로 채운 "촬영 기록표" .docx를 내려준다. 관리자 예약 상세의
 * "기록표 생성" 버튼이 부른다 — 같은 데이터를 쓰는 인쇄 미리보기
 * (record-sheet/print)와 나란히, 한 번의 클릭으로 실제 파일 다운로드와
 * 인쇄 대화상자가 같이 뜨게 한다.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();

  const { id } = await params;
  const result = await buildRecordSheetData(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const template = fs.readFileSync(TEMPLATE_PATH, "binary");
  const zip = new PizZip(template);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(result.tags);
  const rawBytes = doc.getZip().generate({ type: "uint8array" });
  // pizzip의 반환 타입이 ArrayBufferLike(SharedArrayBuffer 포함)라 그대로는
  // Response 본문 타입과 안 맞는다 — 진짜 ArrayBuffer로 한 번 복사한다.
  const bytes = new Uint8Array(rawBytes.byteLength);
  bytes.set(rawBytes);

  const filename = `촬영기록표_${result.productName}_${result.code}.docx`;

  return new NextResponse(new Blob([bytes]), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
