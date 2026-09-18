import type { RecordSheetTags } from "@/lib/record-sheet/build-data";
import { AutoPrint } from "./auto-print";

/**
 * 촬영 기록표를 화면(인쇄용)에 표로 그린다. 순수하게 tags만 받아
 * 그리는 컴포넌트라 실제 페이지(page.tsx, DB에서 데이터를 읽어온다)와
 * 미리보기용 목업(app/dev-preview) 둘 다 같은 컴포넌트를 그대로 쓸 수
 * 있다 — 레이아웃을 두 군데서 따로 관리하지 않는다. 사장님이 주신
 * 원본 양식(PDF)과 같은 칸 배치·음영을 그대로 따른다 —
 * lib/record-sheet/template.docx(실제 .docx 생성용)와 구조를 맞춰뒀다.
 */
export function RecordSheetView({ tags: t }: { tags: RecordSheetTags }) {
  return (
    <div className="record-sheet mx-auto max-w-2xl p-6 print:max-w-none print:p-0">
      <AutoPrint />

      <h1 className="mb-4 text-center text-xl font-bold">
        푸르른 스튜디오 촬영 기록표
      </h1>

      <table className="rs-table">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[50%]" />
          <col className="w-[22%]" />
        </colgroup>
        <tbody>
          <LabelValueRow label="성명" value={t.성명} />
          <LabelValueExtraRow
            label="생년월일(8자리)"
            value={t.생년월일}
            extra={t.성별}
          />
          <LabelValueRow label="연락처" value={t.연락처} />
          <tr>
            <td className="rs-label">
              이메일
              <br />
              <span className="text-xs font-normal">
                (완성본을 전달받으실 이메일)
              </span>
            </td>
            <td className="rs-value" colSpan={2}>
              {t.이메일}
            </td>
          </tr>
          <LabelValueRow label="신청자 성명" value={t.신청자성명} />
          <LabelValueExtraRow
            label="신청자 생년월일(8자리)"
            value={t.신청자생년월일}
            extra={t.신청자성별}
          />
          <LabelValueRow label="신청자 연락처" value={t.신청자연락처} />
          <LabelValueRow label="신청자와의 관계" value={t.신청자관계} />
        </tbody>
      </table>
      <p className="text-muted my-2 text-xs">
        *배우가 미성년자이거나, 1명의 배우가 대표로 예약한 경우에만 작성합니다.
      </p>

      <table className="rs-table mt-4">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[50%]" />
          <col className="w-[22%]" />
        </colgroup>
        <tbody>
          <LabelValueRow label="촬영일시" value={t.촬영일시} />
          <tr>
            <td className="rs-label">완성본 전달예정일</td>
            <td className="rs-value text-right" colSpan={2}>
              {t.전달예정일 ? `${t.전달예정일} 이내` : ""}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="rs-table mt-4">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[50%]" />
          <col className="w-[22%]" />
        </colgroup>
        <tbody>
          <tr>
            <td
              className="rs-label rs-shaded text-center font-bold"
              colSpan={3}
            >
              촬영금액
            </td>
          </tr>
          <tr>
            <td className="rs-value text-center" colSpan={2}>
              기본촬영
            </td>
            <td className="rs-value">₩{t.기본가}</td>
          </tr>
          <OptionRow n={1} label={t.옵션1라벨} amount={t.옵션1금액} />
          <OptionRow n={2} label={t.옵션2라벨} amount={t.옵션2금액} />
          <OptionRow n={3} label={t.옵션3라벨} amount={t.옵션3금액} />
          <tr>
            <td className="rs-label rs-shaded text-center" colSpan={2}>
              계
            </td>
            <td className="rs-value rs-shaded">₩{t.합계}</td>
          </tr>
        </tbody>
      </table>
      <p className="my-2 text-xs">
        *입금계좌: <span className="font-bold">{t.계좌}</span>
      </p>

      <table className="rs-table mt-4">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[50%]" />
          <col className="w-[22%]" />
        </colgroup>
        <tbody>
          <tr>
            <td className="rs-label rs-shaded">
              완성본의 &apos;푸르른 스튜디오&apos; 인스타그램 게시
            </td>
            <td className="rs-value text-center" colSpan={2}>
              {t.SNS동의}
            </td>
          </tr>
        </tbody>
      </table>

      {/* JSX 텍스트 노드 안의 연속 공백은 프리티어/JSX가 하나로 뭉개버려서
          (일반 스페이스라서), 중간에 낄 자리표시자 공백은 뭉개지지 않는
          줄바꿈 없는 공백( )으로 문자열 표현식 안에 넣는다. */}
      <p className="mt-10 ml-16 text-base">{"20        .        .        ."}</p>

      <style>{`
        .rs-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .rs-table td {
          border: 1px solid #333;
          padding: 8px 10px;
          vertical-align: middle;
        }
        .rs-label {
          text-align: center;
          background: #f2f2f2;
        }
        .rs-value {
          text-align: center;
          white-space: pre-wrap;
        }
        .rs-shaded {
          background: #f2f2f2;
        }
        @media print {
          @page { size: A4; margin: 14mm; }
        }
      `}</style>
    </div>
  );
}

function LabelValueRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="rs-label">{label}</td>
      <td className="rs-value" colSpan={2}>
        {value}
      </td>
    </tr>
  );
}

function LabelValueExtraRow({
  label,
  value,
  extra,
}: {
  label: string;
  value: string;
  extra: string;
}) {
  return (
    <tr>
      <td className="rs-label">{label}</td>
      <td className="rs-value">{value}</td>
      <td className="rs-value">{extra}</td>
    </tr>
  );
}

function OptionRow({
  n,
  label,
  amount,
}: {
  n: number;
  label: string;
  amount: string;
}) {
  return (
    <tr>
      <td className="rs-label">추가옵션 {n}</td>
      <td className="rs-value">{label}</td>
      <td className="rs-value">₩{amount}</td>
    </tr>
  );
}
