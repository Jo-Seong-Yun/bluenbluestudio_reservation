"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

const NAV_ITEMS = [
  { href: "/admin/products", label: "상품관리" },
  { href: "/admin/reservations", label: "예약관리" },
  { href: "/admin/revenue", label: "매출관리" },
  { href: "/admin/schedule", label: "스케줄관리" },
  { href: "/admin/settings", label: "설정" },
] as const;

/**
 * 관리자 헤더의 메뉴. 좁은 화면에서는 링크 5개 + 로그아웃 버튼이
 * 한 줄에 다 안 들어가 잘려나가므로, 화면 너비에 따라 가로 메뉴와
 * 햄버거 드롭다운을 바꿔가며 보여준다.
 */
export function AdminNav({ signOutAction }: { signOutAction: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="hidden flex-1 gap-4 sm:flex">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-muted hover:text-foreground text-sm tracking-[0.5px]"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <form action={signOutAction} className="hidden sm:block">
        <Button variant="danger" type="submit">
          로그아웃
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="메뉴 열기"
        aria-expanded={open}
        className="border-border hover:bg-surface-subtle ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg sm:hidden"
      >
        {open ? "✕" : "☰"}
      </button>

      {open ? (
        <div className="border-border bg-surface absolute inset-x-0 top-full z-20 border-b p-3 shadow-sm sm:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="hover:bg-surface-subtle rounded-lg px-3 py-2.5 text-sm font-medium"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={signOutAction} className="mt-2">
            <Button variant="danger" type="submit" className="w-full">
              로그아웃
            </Button>
          </form>
        </div>
      ) : null}
    </>
  );
}
