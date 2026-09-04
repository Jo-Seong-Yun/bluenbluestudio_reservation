import type { Metadata } from "next";
import Link from "next/link";
import { LookupForm } from "./lookup-form";

export const metadata: Metadata = { title: "예약 조회" };

export default function LookupPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-6 py-16">
      <Link href="/booking" className="text-muted text-sm hover:underline">
        ← 상품 목록
      </Link>
      <h1 className="mt-2 text-2xl font-bold">예약 조회</h1>
      <p className="text-muted mt-2 text-sm">
        예약하실 때 입력하신 연락처를 넣으시면 예약 내역을 볼 수 있어요.
      </p>

      <div className="mt-8">
        <LookupForm />
      </div>
    </main>
  );
}
