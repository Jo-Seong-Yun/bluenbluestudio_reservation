"use client";

import { useMemo, useState } from "react";
import { inputClass } from "@/components/ui";
import type { CustomerSummary } from "@/lib/customers";

export function CustomerTable({
  customers,
}: {
  customers: CustomerSummary[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.includes(q) || c.phone.includes(q),
    );
  }, [customers, query]);

  return (
    <div className="mt-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름 또는 연락처로 검색"
        className={`${inputClass} max-w-xs`}
      />

      <div className="border-border bg-surface mt-3 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border text-muted border-b text-left">
              <th className="px-4 py-3 font-medium">고객성명</th>
              <th className="px-4 py-3 font-medium">연령</th>
              <th className="px-4 py-3 font-medium">성별</th>
              <th className="px-4 py-3 font-medium">연락처</th>
              <th className="px-4 py-3 font-medium">메일주소</th>
              <th className="px-4 py-3 font-medium">첫방문일</th>
              <th className="px-4 py-3 font-medium">최근방문일</th>
              <th className="px-4 py-3 font-medium">총방문횟수</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted px-4 py-8 text-center">
                  {customers.length === 0
                    ? "아직 예약한 손님이 없습니다."
                    : "검색 결과가 없습니다."}
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.phone} className="border-border border-b last:border-0">
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3">{c.age ?? "-"}</td>
                  <td className="px-4 py-3">{c.genderLabel || "-"}</td>
                  <td className="px-4 py-3">{c.phone}</td>
                  <td className="px-4 py-3">{c.email ?? "-"}</td>
                  <td className="px-4 py-3">{c.firstVisit ?? "-"}</td>
                  <td className="px-4 py-3">{c.lastVisit ?? "-"}</td>
                  <td className="px-4 py-3">{c.visitCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
