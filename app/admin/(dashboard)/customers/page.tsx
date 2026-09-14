import type { Metadata } from "next";
import { loadCustomerSummaries } from "@/lib/customers-db";
import { CustomerTable } from "./customer-table";

export const metadata: Metadata = { title: "고객DB" };

/**
 * 손님을 연락처 기준으로 한 명씩 모아 보여준다. 인적사항(이름·성별·
 * 생년월일·이메일)은 customers 테이블에 저장된 값 — 관리자가 수기로
 * 고칠 수 있고, 예약이 새로 들어와도 이미 채워진 값은 안 바뀐다.
 * 방문 이력(첫방문일·최근방문일·총방문횟수)은 예약 기록에서 그때그때
 * 다시 계산한 값이라 항상 실제와 일치한다.
 *
 * 구글 시트의 "고객DB" 탭(lib/google-sheets/sync.ts)과 같은 데이터를
 * 쓰므로 숫자가 항상 일치한다 — 시트는 백업·외부 공유용, 이 화면은
 * 사이트 안에서 바로 보고 다루는 용도로 함께 둔다.
 */
export default async function CustomersPage() {
  const customers = (await loadCustomerSummaries()).sort((a, b) => {
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
        완료”로 처리된 예약만 셉니다.
      </p>

      <CustomerTable customers={customers} />
    </div>
  );
}
