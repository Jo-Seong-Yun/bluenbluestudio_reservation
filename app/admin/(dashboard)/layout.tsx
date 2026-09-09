import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/auth";
import { missingServerEnv } from "@/lib/supabase/env";
import { ConfigNotice } from "@/components/config-notice";
import { signOut } from "../actions";
import { AdminNav } from "@/components/admin-nav";
import { SITE } from "@/lib/site";

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
    <div className="flex min-h-dvh flex-col">
      <header className="border-border bg-surface sticky top-0 z-30 border-b">
        <div className="flex w-full items-center gap-4 px-4 py-3 sm:gap-6 sm:px-[8.5%]">
          <Link
            href="/admin/products"
            className="flex shrink-0 flex-col items-center leading-tight font-bold tracking-[0.3px]"
          >
            {SITE.name}
            <span className="text-muted text-xs font-normal tracking-[5.76px]">
              관리자 페이지
            </span>
          </Link>
          <AdminNav signOutAction={signOut} />
        </div>
      </header>

      <main className="w-full flex-1 px-4 py-8 sm:px-[8.5%]">{children}</main>
    </div>
  );
}
