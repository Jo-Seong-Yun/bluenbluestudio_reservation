import type { Metadata } from "next";
import { LookupForm } from "./lookup-form";

export const metadata: Metadata = { title: "예약 조회" };

/**
 * 화면 구성(제목·설명·가운데 정렬 여부)은 조회 전/후로 다르게 가져가야
 * 해서 LookupForm이 통째로 결정한다. 자세한 이유는 lookup-form.tsx 참고.
 */
export default function LookupPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <LookupForm />
    </main>
  );
}
