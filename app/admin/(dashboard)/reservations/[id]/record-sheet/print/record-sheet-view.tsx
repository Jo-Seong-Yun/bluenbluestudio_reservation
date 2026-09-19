import type { RecordSheetTags } from "@/lib/record-sheet/build-data";
import { AutoPrint } from "./auto-print";

export function RecordSheetView({ tags: t }: { tags: RecordSheetTags }) {
  return (
    <div className="record-sheet mx-auto max-w-2xl p-6 print:max-w-none print:p-0">
      <AutoPrint />

      <table className="rs-table">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[26%]" />
          <col className="w-[46%]" />
        </colgroup>
        <tbody>
          {/* 제목 */}
          <tr>
            <td className="rs-label rs-shaded font-bold text-center text-base" colSpan={3}>
              푸르른 스튜디오 촬영 기록표
            </td>
          </tr>

          {/* 기본 정보 */}
          <LabelValueRow label="성명*" value={t.성명} />
          <LabelValueExtraRow
            label="생년월일(8자리)*"
            value={t.생년월일}
            extra={t.성별}
          />
          <LabelValueRow label="연락처*" value={t.연락처} />
          <tr>
            <td className="rs-label">
              이메일*
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

          {/* 신청자 안내 */}
          <tr>
            <td className="rs-value text-left text-xs" colSpan={3}>
              *신청자란은 배우가 미성년자이거나 1명의 배우가 대표로 예약한 경우에만 작성합니다.
            </td>
          </tr>

          {/* 촬영 일정 */}
          <LabelValueRow label="촬영일시*" value={t.촬영일시} />
          <tr>
            <td className="rs-label">완성본 전달예정일*</td>
            <td className="rs-value text-right" colSpan={2}>
              {t.전달예정일 ? `${t.전달예정일} 이내` : ""}
            </td>
          </tr>

          {/* 간격 */}
          <tr>
            <td className="rs-value" colSpan={2}>&nbsp;</td>
            <td className="rs-value">&nbsp;</td>
          </tr>

          {/* 상품 옵션 및 금액 */}
          <tr>
            <td className="rs-label rs-shaded font-bold text-center" colSpan={3}>
              상품 옵션 및 금액*
            </td>
          </tr>
          <tr>
            <td className="rs-value text-center" colSpan={2}>기본촬영*</td>
            <td className="rs-value">₩{t.기본가}</td>
          </tr>
          <OptionRow n={1} label={t.옵션1라벨} amount={t.옵션1금액} />
          <OptionRow n={2} label={t.옵션2라벨} amount={t.옵션2금액} />
          <OptionRow n={3} label={t.옵션3라벨} amount={t.옵션3금액} />
          <OptionRow n={4} label={t.옵션4라벨} amount={t.옵션4금액} />
          <tr>
            <td className="rs-label rs-shaded text-center" colSpan={2}>계</td>
            <td className="rs-value rs-shaded">₩{t.합계}</td>
          </tr>

          {/* 입금계좌 */}
          <tr>
            <td className="rs-value text-left" colSpan={3}>
              *입금계좌: <span className="font-bold">{t.계좌}</span>
            </td>
          </tr>

          {/* SNS 동의 */}
          <tr>
            <td className="rs-label rs-shaded">
              완성본의 &apos;푸르른 스튜디오&apos;
              <br />
              인스타그램 게시*
            </td>
            <td className="rs-value text-center" colSpan={2}>
              {t.SNS동의}
            </td>
          </tr>

          {/* 확인 서명 */}
          <tr>
            <td className="rs-value text-center" colSpan={3}>
              <p>위와 같이 촬영을 완료하였음을 확인합니다.</p>
              {/* 연속 공백은 JSX에서 하나로 뭉개지므로 nbsp; 문자열을 쓴다 */}
              <p>{"20     .     .     .     (인)"}</p>
            </td>
          </tr>
        </tbody>
      </table>

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
      <td className="rs-label rs-shaded">추가옵션{n}</td>
      <td className="rs-value">{label}</td>
      <td className="rs-value">{amount ? `₩${amount}` : ""}</td>
    </tr>
  );
}
