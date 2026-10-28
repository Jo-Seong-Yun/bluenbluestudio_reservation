import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { SubmittedApplicationView } from "@/components/submitted-application";
import type { SubmittedApplication } from "@/lib/booking/submission";
import "@/app/booking/booking.css";
export const metadata = { title: "제출 신청서 원본" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { data, error } = await (
    await createClient()
  )
    .from("reservation_submissions")
    .select("content")
    .eq("reservation_id", id)
    .maybeSingle();
  if (error) throw new Error("신청서 원본을 불러오지 못했습니다.");
  const snapshot = data?.content as SubmittedApplication | null;
  return (
    <>
      <Link href={`/admin/reservations?id=${id}`} className="text-brand">
        ← 예약 관리
      </Link>
      {snapshot?.version === 1 ? (
        <SubmittedApplicationView snapshot={snapshot} />
      ) : (
        <p className="mt-5">
          이 예약에는 제출 당시 원본이 보관되어 있지 않습니다. 기존 예약을 현재
          양식으로 재구성해 원본처럼 표시하지 않습니다.
        </p>
      )}
    </>
  );
}
