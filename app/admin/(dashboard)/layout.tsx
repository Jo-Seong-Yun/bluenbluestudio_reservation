import Link from "next/link";
import Image from "next/image";
import { requireAdmin } from "@/lib/supabase/auth";
import { missingServerEnv } from "@/lib/supabase/env";
import { ConfigNotice } from "@/components/config-notice";
import { signOut } from "../actions";
import { AdminNav } from "@/components/admin-nav";
import {
  PendingOverlay,
  PendingOverlayProvider,
} from "@/components/pending-overlay";
import { SITE, BRAND_LOGO } from "@/lib/site";

/**
 * 관리자 화면 공통 틀. 여기서 로그인 여부를 확인한다.
 *
 * 로그인 화면(app/admin/login)은 이 레이아웃 밖에 있다. 안에 있으면
 * "로그인 안 됨 → 로그인 화면으로 → 다시 확인" 이 무한히 돈다.
 * (dashboard) 는 경로에 나타나지 않는 그룹 이름이라 주소는 /admin 그대로다.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // requireAdmin()보다 먼저 본다. 설정이 없으면 로그인 화면으로 보내봐야
  // 거기서도 같은 이유로 막히기 때문이다.
  const missing = missingServerEnv();
  if (missing.length > 0) return <ConfigNotice missing={missing} />;

  await requireAdmin();

  return (
    <PendingOverlayProvider>
      <div className="flex min-h-dvh flex-col">
        {/* 높이를 h-16(64px)으로 고정한다 — 글자 줄바꿈 등으로 실제
            높이가 미묘하게 달라지면, 이 아래에서 스크롤 시 헤더 바로
            밑에 붙는 페이지별 sticky 타이틀 줄(예: 예약 설정 화면의
            저장 버튼 줄, top-16)과 높이가 안 맞아 틈이 생긴다. */}
        <header className="border-border bg-surface/80 sticky top-0 z-30 h-16 border-b backdrop-blur-md">
          <div className="flex h-full w-full items-center gap-4 px-4 sm:gap-6 sm:px-[8.5%]">
            <Link
              href="/admin/products"
              className="flex shrink-0 flex-col items-center leading-tight"
            >
              <Image
                src={BRAND_LOGO.src}
                alt={SITE.name}
                width={BRAND_LOGO.width}
                height={BRAND_LOGO.height}
                priority
                className="h-8 w-auto"
              />
              <span className="text-muted text-xs font-normal tracking-[5.76px]">
                관리자 페이지
              </span>
            </Link>
            <AdminNav signOutAction={signOut} />
          </div>
        </header>

        <main className="relative w-full flex-1 px-4 py-8 sm:px-[8.5%]">
          {children}
          <PendingOverlay />
        </main>
      </div>
    </PendingOverlayProvider>
  );
}
