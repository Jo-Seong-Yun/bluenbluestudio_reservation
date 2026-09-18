import type { RecordSheetTags } from "@/lib/record-sheet/build-data";
import { AutoPrint } from "./auto-print";

/**
 * 촬영 기록표를 화면(인쇄용)에 표로 그린다. 순수하게 tags만 받아
 * 그리는 컴포넌트라 실제 페이지(page.tsx, DB에서 데이터를 읽어온다)와
 * 미리보기용 목업(app/dev-preview) 둘 다 같은 컴포넌트를 그대로 쓸 수
 * 있다 — 레이아웃을 두 군데서 따로 관리하지 않는다.
 */
export function RecordSheetView({ tags: t }: { tags: RecordSheetTags }) {
  return (
    <div className="mx-auto max-w-2xl p-6 print:max-w-none print:p-0">
      <AutoPrint />

      <table className="record-sheet-table mt-4 w-full border-collapse text-sm">
        <tbody>
          <Header>푸르른 스튜디오 촬영 기록표</Header>
          <Row label="성명*" value={t.성명} />
          <Row label="생년월일(8자리)*" value={t.생년월일} extra={t.성별} />
          <Row label="연락처*" value={t.연락처} />
          <Row label={"이메일*\n(완성본을 전달받으실 이메일)"} value={t.이메일} />
          <Row label="신청자 성명" value={t.신청자성명} />
          <Row
            label="신청자 생년월일(8자리)"
            value={t.신청자생년월일}
            extra={t.신청자성별}
          />
          <Row label="신청자 연락처" value={t.신청자연락처} />
          <Row label="신청자와의 관계" value={t.신청자관계} />
          <Note>
            *신청자란은 배우가 미성년자이거나 1명의 배우가 대표로 예약한
            경우에만 작성합니다.
          </Note>
          <Row label="촬영일시*" value={t.촬영일시} />
          <Row
            label="완성본 전달예정일*"
            value={t.전달예정일 ? `${t.전달예정일} 이내` : ""}
          />
          <SectionHeader>상품 옵션 및 금액*</SectionHeader>
          <Row label="기본촬영*" value={`₩${t.기본가}`} />
          <Row
            label="추가옵션1"
            value={t.옵션1라벨}
            extra={t.옵션1금액 ? `₩${t.옵션1금액}` : ""}
          />
          <Row
            label="추가옵션2"
            value={t.옵션2라벨}
            extra={t.옵션2금액 ? `₩${t.옵션2금액}` : ""}
          />
          <Row
            label="추가옵션3"
            value={t.옵션3라벨}
            extra={t.옵션3금액 ? `₩${t.옵션3금액}` : ""}
          />
          <Row
            label="추가옵션4"
            value={t.옵션4라벨}
            extra={t.옵션4금액 ? `₩${t.옵션4금액}` : ""}
          />
          <Row label="계" value={`₩${t.합계}`} />
          <Note>*입금계좌: {t.계좌}</Note>
          <Row
            label={"완성본의 '푸르른 스튜디오'\n인스타그램 게시*"}
            value={t.SNS동의}
          />
          <Note>
            위와 같이 촬영을 완료하였음을 확인합니다.
            <br />
            {t.서명일} (인)
          </Note>
        </tbody>
      </table>

      <style>{`
        .record-sheet-table td {
          border: 1px solid #333;
          padding: 8px 10px;
          vertical-align: middle;
          white-space: pre-wrap;
        }
        @media print {
          @page { size: A4; margin: 14mm; }
        }
      `}</style>
    </div>
  );
}

function Header({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={2} className="bg-surface-subtle text-center font-bold">
        {children}
      </td>
    </tr>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={2} className="bg-surface-subtle font-bold">
        {children}
      </td>
    </tr>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={2} className="text-muted text-xs">
        {children}
      </td>
    </tr>
  );
}

function Row({
  label,
  value,
  extra,
}: {
  label: string;
  value: string;
  extra?: string;
}) {
  return (
    <tr>
      <td className="bg-surface-subtle w-40 shrink-0 font-medium">{label}</td>
      <td>
        {value}
        {extra ? <span className="text-muted ml-3">{extra}</span> : null}
      </td>
    </tr>
  );
}
