import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/auth";
import { missingServerEnv } from "@/lib/supabase/env";
import { ConfigNotice } from "@/components/config-notice";
import { signOut } from "../actions";
import { Button } from "@/components/ui";
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
      <header className="border-border bg-surface border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-3">
          <Link href="/admin/products" className="font-bold">
            {SITE.name}
          </Link>
          <nav className="flex-1">
            <Link
              href="/admin/products"
              className="text-muted hover:text-foreground text-sm"
            >
              상품 관리
            </Link>
          </nav>
          <form action={signOut}>
            <Button variant="danger" type="submit">
              로그아웃
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
