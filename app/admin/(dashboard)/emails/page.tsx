import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadAllEmailRules } from "@/lib/notifications/email-rules";
import { EmailRulesSection } from "./email-rules-section";

export const metadata: Metadata = { title: "이메일 규칙" };
// 규칙 추가/삭제가 바로 반영돼야 하니 항상 요청마다 새로 렌더링한다.
export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const supabase = await createClient();
  const [rules, { data: products }] = await Promise.all([
    loadAllEmailRules(),
    supabase.from("products").select("id, name").order("sort_order"),
  ]);

  return <EmailRulesSection rules={rules} products={products ?? []} />;
}
