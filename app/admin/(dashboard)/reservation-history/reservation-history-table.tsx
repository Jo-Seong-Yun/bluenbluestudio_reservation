"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { inputClass } from "@/components/ui";
import { kstDateString, kstTimeString } from "@/lib/time";
import { DeliverableSendModal } from "../reservations/deliverable-send-modal";

const SORT_OPTIONS = {
  created_desc: "예약시점 순",
  shoot_asc: "촬영일 빠른 순",
  shoot_desc: "촬영일 느린 순",
} as const;
type SortOption = keyof typeof SORT_OPTIONS;

/** 촬영일 정렬에서 아직 촬영일이 안 정해진(확정 대기) 예약은 어느
 * 방향으로 정렬하든 맨 뒤로 보낸다 — 날짜가 없는 걸 "가장 빠름/느림"
 * 어느 쪽으로도 볼 수 없기 때문이다. */
function compareRows(a: Row, b: Row, sort: SortOption): number {
  if (sort === "created_desc") {
    return b.createdAt.localeCompare(a.createdAt);
  }
  if (a.shootStart === null && b.shootStart === null) return 0;
  if (a.shootStart === null) return 1;
  if (b.shootStart === null) return -1;
  return sort === "shoot_asc"
    ? a.shootStart.localeCompare(b.shootStart)
    : b.shootStart.localeCompare(a.shootStart);
}

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

export function ReservationHistoryTable({
  rows,
  selectedId,
}: {
  rows: Row[];
  /** 지금 오른쪽 상세 패널에 열려 있는 예약 — 그 줄을 표에서도
   * 강조해준다. */
  selectedId?: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<SortOption>("created_desc");

  const filtered = useMemo(() => {
    const q = query.trim();
    return rows
      .filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        if (!q) return true;
        return (
          r.customerName.includes(q) ||
          r.customerPhone.includes(q) ||
          r.code.toLowerCase().includes(q.toLowerCase())
        );
      })
      .sort((a, b) => compareRows(a, b, sort));
  }, [rows, query, status, sort]);

  return (
    <div>
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
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="border-border bg-surface text-muted rounded-full border px-2.5 py-1.5 text-xs outline-none"
          >
            {Object.entries(SORT_OPTIONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <span className="border-border bg-surface-subtle text-muted shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium">
            전체 {rows.length}건 · 검색결과 {filtered.length}건
          </span>
        </div>
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
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">결과물 전송</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-muted px-4 py-8 text-center">
                  {rows.length === 0
                    ? "아직 접수된 예약이 없습니다."
                    : "검색 결과가 없습니다."}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.id}
                  className={`border-border hover:bg-surface-subtle border-t ${
                    r.id === selectedId ? "bg-surface-subtle" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`?id=${r.id}`}
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
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.shootStart && r.status !== "cancelled" ? (
                      <DeliverableSendModal reservationId={r.id} />
                    ) : (
                      <span className="text-muted-faint">-</span>
                    )}
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
