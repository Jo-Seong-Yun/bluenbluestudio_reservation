"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ListOrdered,
  Users,
  Wallet,
  ChartNoAxesCombined,
  Package,
  Clock3,
  Palette,
  Mail,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { PendingOverlay } from "@/components/pending-overlay";

const GROUPS = [
  {
    label: "스튜디오 운영",
    items: [
      { href: "/admin/reservations", label: "예약관리", icon: CalendarDays },
      {
        href: "/admin/reservation-history",
        label: "예약내역",
        icon: ListOrdered,
      },
      { href: "/admin/customers", label: "고객DB", icon: Users },
      { href: "/admin/revenue", label: "매출관리", icon: Wallet },
      { href: "/admin/analytics", label: "통계", icon: ChartNoAxesCombined },
    ],
  },
  {
    label: "사이트 관리",
    items: [
      { href: "/admin/products", label: "상품관리", icon: Package },
      { href: "/admin/schedule", label: "스케줄관리", icon: Clock3 },
      { href: "/admin/design", label: "디자인", icon: Palette },
      { href: "/admin/emails", label: "이메일", icon: Mail },
      { href: "/admin/settings", label: "설정", icon: Settings },
    ],
  },
];

export function AdminWorkspace({
  children,
  signOutAction,
}: {
  children: ReactNode;
  signOutAction: () => void;
}) {
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const active = GROUPS.flatMap((group) => group.items).find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  function navigation(mobile = false) {
    return (
      <>
        <Link
          href="/admin/products"
          className="admin-brand"
          onClick={() => drawer.current?.close()}
        >
          <span
            className="admin-brand-mark"
            role="img"
            aria-label="푸르른 스튜디오"
          />
          <span>관리자 페이지</span>
        </Link>
        <nav
          aria-label={mobile ? "모바일 관리자 메뉴" : "관리자 메뉴"}
          className="admin-navigation"
        >
          {GROUPS.map((group) => (
            <div key={group.label}>
              <p className="admin-nav-group">{group.label}</p>
              {group.items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={active?.href === href ? "page" : undefined}
                  onClick={() => drawer.current?.close()}
                  className="admin-nav-link"
                >
                  <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <span className="admin-studio-label">
            <span aria-hidden="true" />
            푸르른 스튜디오
          </span>
          <form action={signOutAction}>
            <button type="submit" className="admin-logout">
              <LogOut size={16} aria-hidden="true" />
              로그아웃
            </button>
          </form>
        </div>
      </>
    );
  }

  return (
    <div className="admin-workspace">
      <aside className="admin-sidebar">{navigation()}</aside>
      <dialog
        ref={drawer}
        id="admin-menu"
        className="admin-mobile-drawer"
        aria-label="관리자 메뉴"
        onClick={(event) => {
          if (event.target === event.currentTarget) drawer.current?.close();
        }}
      >
        <button
          type="button"
          className="admin-menu-close"
          aria-label="메뉴 닫기"
          onClick={() => drawer.current?.close()}
        >
          <X size={20} />
        </button>
        {navigation(true)}
      </dialog>
      <div className="admin-content">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-menu-toggle"
            aria-label="관리자 메뉴 열기"
            aria-controls="admin-menu"
            onClick={() => drawer.current?.showModal()}
          >
            <Menu size={21} />
          </button>
          <div className="admin-breadcrumb">
            <span>관리자</span>
            <ChevronRight size={14} aria-hidden="true" />
            <strong>{active?.label ?? "관리자 페이지"}</strong>
          </div>
          <span className="admin-workspace-label">STUDIO WORKSPACE</span>
        </header>
        <main className="admin-main">
          {children}
          <PendingOverlay />
        </main>
      </div>
    </div>
  );
}
