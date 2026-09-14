import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { summarizeCustomers } from "@/lib/customers";
import { CustomerTable } from "./customer-table";

export const metadata: Metadata = { title: "고객DB" };

/**
 * 손님을 연락처 기준으로 한 명씩 모아 보여준다. 구글 시트의 "고객DB"
 * 탭(lib/google-sheets/sync.ts)과 같은 집계(lib/customers.ts)를 쓰므로
 * 숫자가 항상 일치한다 — 시트는 백업·외부 공유용, 이 화면은 사이트
 * 안에서 바로 보고 다루는 용도로 함께 둔다.
 *
 * 나중에 여기서 손님을 골라 한 번에 문자·이메일을 보내는 기능을 붙일
 * 예정이라(체크박스 선택 → 발송), 그 작업이 올라탈 자리로 이 화면을
 * 미리 만들어둔다.
 */
export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("reservations")
    .select(
      "customer_name, customer_phone, customer_email, gender, birth_date, status, shoot_start, created_at",
    );

  const customers = summarizeCustomers(rows ?? []).sort((a, b) => {
    // 최근 방문일이 최신인 손님을 먼저 — 아직 방문(완료) 기록이 없는
    // 손님은 맨 뒤로 보낸다.
    if (a.lastVisit && b.lastVisit) return b.lastVisit.localeCompare(a.lastVisit);
    if (a.lastVisit) return -1;
    if (b.lastVisit) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">고객DB</h1>
      <p className="text-muted mt-1 text-sm">
        연락처 기준으로 손님을 한 명씩 모았습니다. 방문 횟수는 “촬영
        완료”로 처리된 예약만 셉니다. 총 {customers.length}명.
      </p>

      <CustomerTable customers={customers} />
    </div>
  );
}
