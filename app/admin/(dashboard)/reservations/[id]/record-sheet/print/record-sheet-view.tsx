import type { ResolvedRow } from "@/lib/record-sheet/resolve";
import { AutoPrint } from "./auto-print";

/**
 * 촬영 기록표를 화면(인쇄용)에 표로 그린다. 행 구성(관리자가
 * /admin/settings에서 편집)과 예약 데이터를 이미 합쳐놓은
 * ResolvedRow[]만 받아 그리는 순수 렌더러라, 어떤 상품·어떤 행
 * 구성이든 같은 컴포넌트 하나로 그릴 수 있다.
 */
export function RecordSheetView({ rows }: { rows: ResolvedRow[] }) {
  return (
    <div className="record-sheet mx-auto max-w-2xl p-6 print:max-w-none print:p-[14mm]">
      <AutoPrint />

      <table className="rs-table">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[26%]" />
          <col className="w-[46%]" />
        </colgroup>
        <tbody>
          {rows.map((row, i) => (
            <RowRenderer key={i} row={row} />
          ))}
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
          /* 여백을 0으로 둬야 크롬이 그 자리에 그리는 날짜/제목/URL
             같은 인쇄 헤더·푸터가 같이 사라진다 — 여백이 있으면 그
             안에 계속 그려 넣는다. 대신 같은 크기의 여백을 위
             record-sheet 래퍼의 print:p-[14mm]로 콘텐츠 쪽에서 준다. */
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}

function alignClass(align: "left" | "center" | "right" | undefined): string {
  if (align === "left") return "text-left";
  if (align === "right") return "text-right";
  return "text-center";
}

function withLineBreaks(text: string) {
  return text.split("\n").map((line, i, arr) => (
    <span key={i}>
      {line}
      {i < arr.length - 1 ? <br /> : null}
    </span>
  ));
}

function RowRenderer({ row }: { row: ResolvedRow }) {
  if (row.type === "title") {
    return (
      <tr>
        <td
          className="rs-label rs-shaded text-center text-base font-bold"
          colSpan={3}
        >
          {row.text}
        </td>
      </tr>
    );
  }

  if (row.type === "section") {
    return (
      <tr>
        <td className="rs-label rs-shaded text-center font-bold" colSpan={3}>
          {row.text}
        </td>
      </tr>
    );
  }

  if (row.type === "spacer") {
    return (
      <tr>
        <td className="rs-value" colSpan={3}>
          &nbsp;
        </td>
      </tr>
    );
  }

  if (row.type === "note") {
    return (
      <tr>
        <td
          className={`rs-value ${alignClass(row.align)} ${row.small ? "text-xs" : ""}`}
          colSpan={3}
        >
          {row.lines.map((line, i) => (
            <p key={i}>{line || " "}</p>
          ))}
        </td>
      </tr>
    );
  }

  // field
  const valueAlign = alignClass(row.align);
  const label = (
    <>
      {withLineBreaks(row.label)}
      {row.sublabel ? (
        <>
          <br />
          <span className="text-xs font-normal">{row.sublabel}</span>
        </>
      ) : null}
    </>
  );

  if (row.value2 !== undefined) {
    return (
      <tr>
        <td className="rs-label">{label}</td>
        <td className={`rs-value ${valueAlign}`}>{row.value}</td>
        <td className={`rs-value ${valueAlign}`}>{row.value2}</td>
      </tr>
    );
  }

  if (row.wideLabel) {
    return (
      <tr>
        <td className="rs-label" colSpan={2}>
          {label}
        </td>
        <td className={`rs-value rs-shaded ${valueAlign}`}>{row.value}</td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="rs-label">{label}</td>
      <td className={`rs-value ${valueAlign}`} colSpan={2}>
        {row.value}
      </td>
    </tr>
  );
}
