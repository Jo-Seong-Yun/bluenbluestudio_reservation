import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ReservationHistoryTable } from "./reservation-history-table";

export const metadata: Metadata = { title: "예약내역" };
export const dynamic = "force-dynamic";

/**
 * 예약관리(달력 화면)가 다루는 것과 같은 reservations 데이터를, 고객DB
 * 화면처럼 검색·필터 가능한 표 하나로 쭉 나열해서 보여준다. 달력은
 * "이번 달에 뭐가 있나"를 보기 좋고, 이 화면은 "그 손님/그 예약이
 * 언제였더라"를 찾기 좋다 — 서로 다른 용도라 별도 화면으로 둔다.
 * 상태 변경 등 실제 동작은 여기서 하지 않고, 각 줄을 누르면 예약관리의
 * 해당 예약 상세로 이동해서 처리한다.
 */
export default async function ReservationHistoryPage() {
  const supabase = await createClient();
  const [{ data: reservations }, { data: products }] = await Promise.all([
    supabase
      .from("reservations")
      .select(
        "id, code, status, shoot_start, customer_name, customer_phone, charged_amount, estimated_amount, product_id, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("products").select("id, name"),
  ]);

  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));
  const rows = (reservations ?? []).map((r) => ({
    id: r.id,
    code: r.code,
    status: r.status,
    shootStart: r.shoot_start,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    chargedAmount: r.charged_amount,
    estimatedAmount: r.estimated_amount,
    productName: productNameById.get(r.product_id) ?? "",
    createdAt: r.created_at,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold">예약내역</h1>
      <p className="text-muted mt-1 text-sm">
        지금까지 접수된 모든 예약을 최근 접수순으로 모았습니다. 줄을
        누르면 예약관리에서 그 예약의 상세 내용을 볼 수 있습니다.
      </p>

      <ReservationHistoryTable rows={rows} />
    </div>
  );
}
