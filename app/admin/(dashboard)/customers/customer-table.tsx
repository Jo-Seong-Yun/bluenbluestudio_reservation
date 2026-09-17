"use client";

import { useMemo, useState } from "react";
import { inputClass } from "@/components/ui";
import type { CustomerSummary } from "@/lib/customers";
import { kstDateString } from "@/lib/time";
import { CustomerEditModal } from "./customer-edit-modal";
import { DeleteCustomersButton } from "./delete-customers-button";

/**
 * 검색·선택(체크박스)·수기 수정을 갖춘 고객 목록.
 *
 * 체크박스 선택은 "선택 삭제"에 쓰인다 — 나중엔 일괄 문자·이메일 발송
 * 기능도 이 선택 상태를 그대로 이어받아 쓸 수 있다.
 */
export function CustomerTable({
  customers,
}: {
  customers: CustomerSummary[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return customers;
    return customers.filter((c) => c.name.includes(q) || c.phone.includes(q));
  }, [customers, query]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.phone));

  function toggleOne(phone: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  }

  // "전체 선택"은 지금 검색 결과에 보이는 손님만 대상으로 한다 —
  // 검색을 바꿔도 이미 골라둔 손님은 그대로 유지된다.
  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((c) => next.delete(c.phone));
      } else {
        filtered.forEach((c) => next.add(c.phone));
      }
      return next;
    });
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 또는 연락처로 검색"
          className={`${inputClass} max-w-xs`}
        />
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <>
              <span className="text-brand text-sm font-medium">
                {selected.size}명 선택됨
              </span>
              <DeleteCustomersButton
                phones={[...selected]}
                onDeleted={() => setSelected(new Set())}
              />
            </>
          ) : null}
          <span className="border-border bg-surface-subtle text-muted shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium">
            전체 {customers.length}명
          </span>
        </div>
      </div>

      <div className="border-border bg-surface mt-3 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border text-muted border-b text-left">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="전체 선택"
                  checked={allFilteredSelected}
                  onChange={toggleAllFiltered}
                  className="h-4 w-4"
                />
              </th>
              <th className="px-4 py-3 font-medium">고객성명</th>
              <th className="px-4 py-3 font-medium">연령</th>
              <th className="px-4 py-3 font-medium">성별</th>
              <th className="px-4 py-3 font-medium">연락처</th>
              <th className="px-4 py-3 font-medium">메일주소</th>
              <th className="px-4 py-3 font-medium">첫방문일</th>
              <th className="px-4 py-3 font-medium">최근방문일</th>
              <th className="px-4 py-3 font-medium">총방문횟수</th>
              <th className="px-4 py-3 font-medium">정보수집일</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">수정</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-muted px-4 py-8 text-center">
                  {customers.length === 0
                    ? "아직 예약한 손님이 없습니다."
                    : "검색 결과가 없습니다."}
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.phone} className="border-border border-b last:border-0">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`${c.name} 선택`}
                      checked={selected.has(c.phone)}
                      onChange={() => toggleOne(c.phone)}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3">{c.age ?? "-"}</td>
                  <td className="px-4 py-3">{c.genderLabel || "-"}</td>
                  <td className="px-4 py-3">{c.phone}</td>
                  <td className="px-4 py-3">{c.email ?? "-"}</td>
                  <td className="px-4 py-3">{c.firstVisit ?? "-"}</td>
                  <td className="px-4 py-3">{c.lastVisit ?? "-"}</td>
                  <td className="px-4 py-3">{c.visitCount}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {kstDateString(new Date(c.collectedAt))}
                    <span className="text-muted ml-1 text-xs">
                      ({c.daysSinceCollected}일 경과)
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CustomerEditModal customer={c} />
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
