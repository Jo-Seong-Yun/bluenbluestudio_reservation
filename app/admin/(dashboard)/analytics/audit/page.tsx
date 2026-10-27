import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { loadAuditPage } from "@/lib/analytics/audit";
import { AuditTimeline } from "./audit-timeline";
export const metadata = { title: "전체 보존 이력" };
export default async function AuditPage() {
  await requireAdmin();
  return (
    <>
      <Link href="/admin/analytics" className="text-brand text-sm">
        ← 통계로 돌아가기
      </Link>
      <AuditTimeline initial={await loadAuditPage(await createClient())} />
    </>
  );
}
