import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/supabase/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "관리자 로그인" };

export default async function LoginPage() {
  // 이미 로그인했으면 로그인 화면을 볼 이유가 없다.
  if (await getAdminUser()) redirect("/admin/products");

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-16">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-bold">관리자 로그인</h1>
        <p className="text-muted mt-2 text-sm">푸르른 스튜디오 예약 관리</p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
