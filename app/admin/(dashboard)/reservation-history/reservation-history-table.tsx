"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { inputClass } from "@/components/ui";
import { kstDateString, kstMonthString, kstTimeString } from "@/lib/time";

const STATUS_LABEL: Record<string, string> = {
  requested: "접수됨",
  schedule_confirmed: "일정확정됨",
  payment_confirmed: "입금확인/예약확정됨",
  completed: "촬영 완료",
  cancelled: "취소됨",
  no_show: "노쇼",
};

type Row = {
  id: string;
  code: string;
  status: string;
  shootStart: string | null;
  customerName: string;
  customerPhone: string;
  chargedAmount: number | null;
  estimatedAmount: number | null;
  productName: string;
  createdAt: string;
};

/** 예약관리 상세로 이동할 때, 확정된 예약은 그 촬영월로 달력을 맞춰야
 * 달력 쪽 목록(월 단위 조회)에도 걸려 상세가 정상적으로 열린다 —
 * 후보만 낸 상태나 취소된 예약은 달력 월과 무관하게 항상 찾아지므로
 * 아무 달이나 상관없다. */
function detailHref(row: Row): string {
  const month = row.shootStart
    ? kstMonthString(new Date(row.shootStart))
    : kstMonthString(new Date());
  return `/admin/reservations?month=${month}&id=${row.id}`;
}

export function ReservationHistoryTable({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      return (
        r.customerName.includes(q) ||
        r.customerPhone.includes(q) ||
        r.code.toLowerCase().includes(q.toLowerCase())
      );
    });
  }, [rows, query, status]);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름, 연락처 또는 예약번호로 검색"
            className={`${inputClass} max-w-xs`}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`${inputClass} w-auto`}
          >
            <option value="all">전체 상태</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <span className="border-border bg-surface-subtle text-muted shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium">
          전체 {rows.length}건 · 검색결과 {filtered.length}건
        </span>
      </div>

      <div className="border-border bg-surface mt-3 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border text-muted border-b text-left">
              <th className="px-4 py-3 font-medium">예약번호</th>
              <th className="px-4 py-3 font-medium">상품</th>
              <th className="px-4 py-3 font-medium">예약자</th>
              <th className="px-4 py-3 font-medium">연락처</th>
              <th className="px-4 py-3 font-medium">촬영일시</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">결제금액</th>
              <th className="px-4 py-3 font-medium">접수일</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted px-4 py-8 text-center">
                  {rows.length === 0
                    ? "아직 접수된 예약이 없습니다."
                    : "검색 결과가 없습니다."}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-border hover:bg-surface-subtle border-t"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={detailHref(r)}
                      className="hover:text-brand font-mono"
                    >
                      {r.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{r.productName || "-"}</td>
                  <td className="px-4 py-3">{r.customerName}</td>
                  <td className="px-4 py-3">{r.customerPhone}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.shootStart ? (
                      <>
                        {kstDateString(new Date(r.shootStart))}{" "}
                        {kstTimeString(new Date(r.shootStart))}
                      </>
                    ) : (
                      <span className="text-muted">확정 대기</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.chargedAmount != null
                      ? `${r.chargedAmount.toLocaleString()}원`
                      : r.estimatedAmount != null
                        ? `${r.estimatedAmount.toLocaleString()}원 (예상)`
                        : "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {kstDateString(new Date(r.createdAt))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
