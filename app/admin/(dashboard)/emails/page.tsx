import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadAllEmailRules } from "@/lib/notifications/email-rules";
import { EmailRulesSection } from "./email-rules-section";

export const metadata: Metadata = { title: "이메일 규칙" };
// 규칙 추가/삭제가 바로 반영돼야 하니 항상 요청마다 새로 렌더링한다.
export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const supabase = await createClient();
  const [{ rules, error }, { data: products }, { data: settings }] =
    await Promise.all([
      loadAllEmailRules(),
      supabase.from("products").select("id, name").order("sort_order"),
      supabase
        .from("settings")
        .select("bank_account, notice, test_email")
        .eq("id", 1)
        .single(),
    ]);

  if (error) {
    return (
      <div className="max-w-2xl">
        <h1 className="mb-4 text-2xl font-bold">이메일 규칙</h1>
        <p className="border-border bg-surface rounded-xl border p-6 text-sm text-red-700 dark:text-red-400">
          규칙을 불러오지 못했습니다: {error}
          <br />
          지금까지 만들어둔 규칙이 지워진 게 아니라, 이 화면이 그 내용을 읽어오지
          못하고 있는 상태입니다. 대개 DB 마이그레이션을 아직 안 돌린 경우이니,
          최근에 안내받은 SQL을 Supabase SQL 에디터에서 실행하셨는지 확인해
          주시기 바랍니다.
        </p>
      </div>
    );
  }

  return (
    <EmailRulesSection
      rules={rules}
      products={products ?? []}
      siteVariables={{
        계좌: settings?.bank_account ?? "",
        공지: settings?.notice ?? "",
      }}
      testEmail={settings?.test_email ?? ""}
    />
  );
}
