"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { inputClass } from "@/components/ui";
import { kstDateString, kstTimeString } from "@/lib/time";
import { ReservationActionCell } from "./reservation-action-cell";

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

// 예약관리 달력의 상태 점 색(components/admin-calendar.tsx의
// STATUS_DOT)과 같은 색 배정을 써서, 관리자 화면 전체에서 같은 상태는
// 항상 같은 색으로 보이게 한다.
const STATUS_BADGE_CLASS: Record<string, string> = {
  requested:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  schedule_confirmed:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  payment_confirmed: "bg-brand/15 text-brand",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  cancelled:
    "bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-300",
  no_show: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
        STATUS_BADGE_CLASS[status] ?? "bg-surface-subtle text-muted"
      }`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

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
  /** "결과물 전송"을 이미 한 번 성공적으로 마쳤으면 true. */
  deliverableSent: boolean;
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
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">촬영일시</th>
              <th className="px-4 py-3 font-medium">예약번호</th>
              <th className="px-4 py-3 font-medium">상품</th>
              <th className="px-4 py-3 font-medium">예약자</th>
              <th className="px-4 py-3 font-medium">연락처</th>
              <th className="px-4 py-3 font-medium">결제금액</th>
              <th className="px-4 py-3 font-medium">접수일</th>
              <th className="px-4 py-3 font-medium">상태 변경</th>
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
                    <StatusBadge status={r.status} />
                  </td>
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
                  <td className="p-0">
                    {/* 요청사항: 예약번호 열은 어디를 눌러도 상세로
                        이동해야 하므로, 셀 전체를 링크로 채운다(다른
                        열은 그대로 텍스트만 표시). */}
                    <Link
                      href={`?id=${r.id}`}
                      className="hover:text-brand block px-4 py-3 font-mono"
                    >
                      {r.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{r.productName || "-"}</td>
                  <td className="px-4 py-3">{r.customerName}</td>
                  <td className="px-4 py-3">{r.customerPhone}</td>
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
                    <ReservationActionCell
                      reservationId={r.id}
                      status={r.status}
                      isPending={r.shootStart === null && r.status === "requested"}
                      deliverableSent={r.deliverableSent}
                    />
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
