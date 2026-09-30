import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ReservationHistoryTable } from "./reservation-history-table";
import { DetailPanel } from "../reservations/detail-panel";
import { loadReservationDetail } from "@/lib/reservations/load-detail";

export const metadata: Metadata = { title: "예약내역" };
export const dynamic = "force-dynamic";

/**
 * 예약관리(달력 화면)가 다루는 것과 같은 reservations 데이터를, 고객DB
 * 화면처럼 검색·필터 가능한 표 하나로 쭉 나열해서 보여준다. 달력은
 * "이번 달에 뭐가 있나"를 보기 좋고, 이 화면은 "그 손님/그 예약이
 * 언제였더라"를 찾기 좋다 — 서로 다른 용도라 별도 화면으로 둔다.
 *
 * "예약관리를 달력 대신 표로 바꾼 것"이라는 요구에 맞춰, 오른쪽에는
 * 예약관리와 같은 DetailPanel을 그대로 쓴다 — 메모·지불액·기록표
 * 생성 등 예약관리에서 하던 일을 여기서도 똑같이 할 수 있고, 같은
 * reservations 테이블을 보는 것이므로 한쪽에서 고치면 다른 화면
 * 에서도(새로 열거나 새로고침하면) 그대로 반영된다. 다만 상태 변경과
 * 결과물 전송만은 이 화면의 표 자체(각 행의 버튼 열)에서 처리하므로,
 * 여기서 여는 DetailPanel에는 그 두 섹션이 나타나지 않는다(basePath로
 * 구분 — detail-panel.tsx 참고).
 */
export default async function ReservationHistoryPage({
  searchParams,
}: PageProps<"/admin/reservation-history">) {
  const { id } = await searchParams;
  const selectedId = Array.isArray(id) ? id[0] : id;

  const supabase = await createClient();
  const [{ data: reservations }, { data: products }, selected] =
    await Promise.all([
      supabase
        .from("reservations")
        .select(
          "id, code, status, shoot_start, customer_name, customer_phone, charged_amount, estimated_amount, product_id, created_at, deliverable_sent_at",
        )
        .order("created_at", { ascending: false }),
      supabase.from("products").select("id, name, tag_color"),
      selectedId ? loadReservationDetail(selectedId) : Promise.resolve(undefined),
    ]);

  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));
  const productTagColorById = new Map(
    (products ?? []).map((p) => [p.id, p.tag_color]),
  );
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
    productTagColor: productTagColorById.get(r.product_id) ?? null,
    createdAt: r.created_at,
    deliverableSent: r.deliverable_sent_at !== null,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold">예약내역</h1>
      <p className="text-muted mt-1 text-sm">
        지금까지 접수된 모든 예약을 최근 접수순으로 모았습니다. 행을
        누르면 오른쪽에서 상세 내용을 보고 처리할 수 있고, 상태 변경과
        결과물 전송은 표의 버튼에서 바로 할 수 있습니다.
      </p>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <ReservationHistoryTable rows={rows} selectedId={selectedId} />
        <div>
          <DetailPanel
            selected={selected}
            dayReservations={[]}
            basePath="/admin/reservation-history"
            emptyHint="표에서 행을 눌러 선택해 주시기 바랍니다."
          />
        </div>
      </div>
    </div>
  );
}
