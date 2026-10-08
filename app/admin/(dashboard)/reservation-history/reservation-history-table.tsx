"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/ui";
import { kstDateString, kstTimeString } from "@/lib/time";
import { tagColorCellClass } from "@/lib/product-tag-colors";
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

// 표의 상태 배지는 칸이 좁아 STATUS_LABEL 원문(예: "입금확인/예약확정됨")이
// 다 안 들어간다 — 검색창 옆 필터 드롭다운은 STATUS_LABEL 그대로 쓰고,
// 배지만 줄인 말을 쓴다.
const STATUS_BADGE_LABEL: Record<string, string> = {
  requested: "접수",
  schedule_confirmed: "일정확정",
  payment_confirmed: "입금확인",
  completed: "촬영완료",
  cancelled: "취소",
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
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-300",
  no_show: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function StatusBadge({
  status,
  depositRequired = true,
}: {
  status: string;
  depositRequired?: boolean;
}) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
        STATUS_BADGE_CLASS[status] ?? "bg-surface-subtle text-muted"
      }`}
    >
      {status === "schedule_confirmed" && !depositRequired
        ? "예약확정"
        : (STATUS_BADGE_LABEL[status] ?? STATUS_LABEL[status] ?? status)}
    </span>
  );
}

/** 상품관리에서 그 상품에 정해둔 태그 색(components/admin-calendar.tsx가
 * 달력 칩에 쓰는 것과 같은 색상표)을 그대로 배지 색으로 쓴다 — 태그
 * 색이 없는 상품(레거시)은 기본 회색 배지로 보여준다. */
function ProductBadge({
  name,
  tagColor,
}: {
  name: string;
  tagColor: string | null;
}) {
  const cellClass = tagColorCellClass(tagColor);
  return (
    <span
      title={name || undefined}
      className={`inline-block max-w-[9rem] truncate rounded-full px-2.5 py-1 text-xs font-medium ${
        cellClass ?? "bg-surface-subtle text-muted"
      }`}
    >
      {name || "-"}
    </span>
  );
}

type Row = {
  id: string;
  code: string;
  status: string;
  depositRequired?: boolean;
  shootStart: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  chargedAmount: number | null;
  estimatedAmount: number | null;
  productName: string;
  /** 상품관리에서 정한 태그 색 키(예: "lavender"). 없으면 null. */
  productTagColor: string | null;
  createdAt: string;
  /** "결과물 전송"을 이미 한 번 성공적으로 마쳤으면 true. */
  deliverableSent: boolean;
};

/** 행을 클릭했을 때 상세로 이동하되, 상태 변경 열의 버튼·링크를 누른
 * 경우는 그 동작만 실행되어야지 행 이동까지 겹치면 안 된다 — 클릭이
 * 시작된 지점에서부터 가장 가까운 버튼/링크/폼 요소를 찾아, 있으면
 * 행 이동을 하지 않는다. */
function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("button, a, input, select, textarea"));
}

export function ReservationHistoryTable({
  rows,
  selectedId,
}: {
  rows: Row[];
  /** 지금 오른쪽 상세 패널에 열려 있는 예약 — 그 줄을 표에서도
   * 강조해준다. */
  selectedId?: string;
}) {
  const router = useRouter();
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
      <dl className="admin-summary" aria-label="예약 현황">
        <div>
          <dt>전체 예약</dt>
          <dd>
            {rows.length}
            <span className="text-muted ml-1 text-xs font-normal">건</span>
          </dd>
        </div>
        <div>
          <dt>일정 확인 대기</dt>
          <dd>
            {rows.filter((r) => r.status === "requested").length}
            <span className="text-muted ml-1 text-xs font-normal">건</span>
          </dd>
        </div>
        <div>
          <dt>입금 확인 대기</dt>
          <dd>
            {
              rows.filter(
                (r) =>
                  r.status === "schedule_confirmed" &&
                  r.depositRequired !== false,
              ).length
            }
            <span className="text-muted ml-1 text-xs font-normal">건</span>
          </dd>
        </div>
        <div>
          <dt>촬영 완료</dt>
          <dd>
            {rows.filter((r) => r.status === "completed").length}
            <span className="text-muted ml-1 text-xs font-normal">건</span>
          </dd>
        </div>
      </dl>
      <div className="border-border bg-surface rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              aria-label="예약 검색"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름, 연락처 또는 예약번호로 검색"
              className={`${inputClass} admin-history-search`}
            />
            <select
              aria-label="예약 상태 필터"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`${inputClass} admin-history-status`}
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
              aria-label="예약 정렬"
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

        <div className="admin-status-tabs" aria-label="빠른 상태 필터">
          {[["all", "전체"], ...Object.entries(STATUS_BADGE_LABEL)].map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
              >
                {label}{" "}
                <span className="ml-1 opacity-70">
                  {value === "all"
                    ? rows.length
                    : rows.filter((r) => r.status === value).length}
                </span>
              </button>
            ),
          )}
        </div>
      </div>
      <div
        className="admin-table-scroll border-border bg-surface mt-3 rounded-xl border"
        role="region"
        aria-label="예약내역 표, 좁은 화면에서는 좌우로 스크롤"
        tabIndex={0}
      >
        <table className="admin-history-table w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[9%]" />
            <col className="w-[12%]" />
            <col className="w-[15%]" />
            <col className="w-[11%]" />
            <col className="w-[12%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col />
          </colgroup>
          <thead>
            <tr className="border-border text-muted border-b text-left">
              <th className="px-3 py-3 font-medium">상태</th>
              <th className="px-3 py-3 font-medium">촬영일시</th>
              <th className="px-3 py-3 font-medium">상품</th>
              <th className="px-3 py-3 font-medium">예약자</th>
              <th className="px-3 py-3 font-medium">연락처</th>
              <th className="px-3 py-3 font-medium">결제금액</th>
              <th className="px-3 py-3 font-medium">접수일</th>
              <th className="px-3 py-3 font-medium">예약 처리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted px-3 py-8 text-center">
                  {rows.length === 0
                    ? "아직 접수된 예약이 없습니다."
                    : "검색 결과가 없습니다."}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.id}
                  tabIndex={0}
                  aria-label={`${r.customerName} 예약 상세 보기`}
                  data-selected={r.id === selectedId}
                  onKeyDown={(e) => {
                    if (
                      e.target === e.currentTarget &&
                      (e.key === "Enter" || e.key === " ")
                    ) {
                      e.preventDefault();
                      router.push(`?id=${r.id}`, { scroll: false });
                    }
                  }}
                  onClick={(e) => {
                    // 상태 변경 열의 버튼·링크를 눌렀으면 그 동작만
                    // 실행되게 두고, 행 자체의 이동은 하지 않는다.
                    if (isInteractiveTarget(e.target)) return;
                    router.push(`?id=${r.id}`, { scroll: false });
                  }}
                  className={`border-border hover:bg-surface-subtle cursor-pointer border-t ${
                    r.id === selectedId ? "bg-surface-subtle" : ""
                  }`}
                >
                  <td data-label="상태" className="px-3 py-3">
                    <StatusBadge
                      status={r.status}
                      depositRequired={r.depositRequired}
                    />
                  </td>
                  <td
                    data-label="촬영일시"
                    className="px-3 py-3 text-xs whitespace-nowrap"
                  >
                    {r.shootStart ? (
                      <>
                        {kstDateString(new Date(r.shootStart))}
                        <br />
                        {kstTimeString(new Date(r.shootStart))}
                      </>
                    ) : (
                      <span className="text-muted">확정 대기</span>
                    )}
                  </td>
                  <td data-label="상품" className="px-3 py-3">
                    <ProductBadge
                      name={r.productName}
                      tagColor={r.productTagColor}
                    />
                  </td>
                  <td
                    data-label="예약자"
                    className="truncate px-3 py-3"
                    title={r.customerName}
                  >
                    <span className="font-medium">{r.customerName}</span>
                    <div className="admin-customer-code">{r.code}</div>
                  </td>
                  <td
                    data-label="연락처"
                    className="truncate px-3 py-3 text-xs"
                    title={r.customerPhone}
                  >
                    {r.customerPhone}
                  </td>
                  <td
                    data-label="결제금액"
                    className="px-3 py-3 text-xs whitespace-nowrap"
                  >
                    {r.chargedAmount != null
                      ? `${r.chargedAmount.toLocaleString()}원`
                      : r.estimatedAmount != null
                        ? `${r.estimatedAmount.toLocaleString()}원 (예상)`
                        : "-"}
                  </td>
                  <td
                    data-label="접수일"
                    className="px-3 py-3 text-xs whitespace-nowrap"
                  >
                    {kstDateString(new Date(r.createdAt))}
                  </td>
                  <td data-label="예약 처리" className="px-3 py-3">
                    <ReservationActionCell
                      depositRequired={r.depositRequired}
                      reservationId={r.id}
                      status={r.status}
                      isPending={
                        r.shootStart === null && r.status === "requested"
                      }
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
