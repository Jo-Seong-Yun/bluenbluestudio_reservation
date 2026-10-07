import type { Metadata } from "next";
import { LookupForm } from "./lookup-form";

export const metadata: Metadata = { title: "예약 조회" };

/**
 * 조회 전에는 연락처/예약번호 입력, 조회 후에는 목록/상세 배치로
 * 전환되므로 LookupForm이 화면 구성을 함께 관리한다.
 */
export default async function LookupPage({
  searchParams,
}: PageProps<"/booking/lookup">) {
  const { code } = await searchParams;
  const initialCode =
    typeof code === "string" && /^[A-Z0-9]{8}$/.test(code) ? code : "";
  return (
    <main className="booking-page">
      <LookupForm initialCode={initialCode} />
    </main>
  );
}
