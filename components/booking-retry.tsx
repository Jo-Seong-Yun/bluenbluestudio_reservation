"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
export function BookingRetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className="bg-brand mt-4 rounded-md px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
    >
      {pending ? "불러오는 중…" : "다시 불러오기"}
    </button>
  );
}
