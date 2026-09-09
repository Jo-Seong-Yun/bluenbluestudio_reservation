import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  kstDateString,
  kstMonthString,
  kstTimeString,
  monthGridDates,
} from "@/lib/time";
import {
  AdminCalendar,
  type CalendarReservation,
} from "@/components/admin-calendar";
import { DetailPanel } from "./detail-panel";
import { ManualReservationButton } from "./manual-reservation-button";
import type { DateString } from "@/lib/time";

export const metadata: Metadata = { title: "예약관리" };

export default async function ReservationsPage({
  searchParams,
}: PageProps<"/admin/reservations">) {
  const { month: monthParam, date, id } = await searchParams;
  const month =
    (Array.isArray(monthParam) ? monthParam[0] : monthParam) ??
    kstMonthString(new Date());
  const selectedDate = Array.isArray(date) ? date[0] : date;
  const selectedId = Array.isArray(id) ? id[0] : id;

  const grid = monthGridDates(month);
  const supabase = await createClient();

  const { data: reservations } = await supabase
    .from("reservations")
    .select(
      "id, code, status, shoot_start, shoot_end, customer_name, customer_phone, people_count, memo, admin_memo, cost, charged_amount, gender, birth_date, product_id",
    )
    .gte("shoot_start", `${grid[0]}T00:00:00+09:00`)
    .lt("shoot_start", `${grid[grid.length - 1]}T24:00:00+09:00`)
    .order("shoot_start");

  const productIds = [
    ...new Set((reservations ?? []).map((r) => r.product_id)),
  ];
  const { data: products } =
    productIds.length > 0
      ? await supabase
          .from("products")
          .select("id, name, tag_color")
          .in("id", productIds)
      : {
          data: [] as { id: string; name: string; tag_color: string | null }[],
        };
  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));
  const productTagColorById = new Map(
    (products ?? []).map((p) => [p.id, p.tag_color]),
  );

  // 수기 예약 등록 폼의 상품 선택지. 공개 여부와 무관하게 전부 보여준다 —
  // 비공개 상품도 전화로는 예약을 받을 수 있어야 한다.
  const { data: allProducts } = await supabase
    .from("products")
    .select("id, name")
    .order("sort_order");

  // 달력 칸에 넣을 형태로 날짜별로 묶는다.
  const byDate = new Map<DateString, CalendarReservation[]>();
  for (const r of reservations ?? []) {
    const d = kstDateString(new Date(r.shoot_start));
    const list = byDate.get(d) ?? [];
    list.push({
      id: r.id,
      time: kstTimeString(new Date(r.shoot_start)),
      customerName: r.customer_name,
      status: r.status,
      tagColor: productTagColorById.get(r.product_id) ?? null,
    });
    byDate.set(d, list);
  }

  const dayReservations = selectedDate
    ? (reservations ?? [])
        .filter((r) => kstDateString(new Date(r.shoot_start)) === selectedDate)
        .map((r) => ({
          ...r,
          productName: productNameById.get(r.product_id) ?? "",
        }))
    : [];

  const selected = selectedId
    ? (reservations ?? []).find((r) => r.id === selectedId)
    : undefined;

  // 선택된 예약의 커스텀 문항 답변. 목록 전체가 아니라 선택된 한 건에만
  // 필요하니 여기서 따로 가져온다.
  const { data: answerRows } = selected
    ? await supabase
        .from("reservation_answers")
        .select("field_id, value")
        .eq("reservation_id", selected.id)
    : { data: [] as { field_id: string; value: string }[] };

  const answerFieldIds = [
    ...new Set((answerRows ?? []).map((a) => a.field_id)),
  ];
  const { data: answerFields } =
    answerFieldIds.length > 0
      ? await supabase
          .from("custom_fields")
          .select("id, label, type")
          .in("id", answerFieldIds)
      : { data: [] as { id: string; label: string; type: string }[] };
  const answerFieldById = new Map((answerFields ?? []).map((f) => [f.id, f]));

  const customAnswers = (answerRows ?? []).map((answer) => {
    const field = answerFieldById.get(answer.field_id);
    let value = answer.value;
    if (field?.type === "multi_choice") {
      try {
        value = (JSON.parse(answer.value) as string[]).join(", ");
      } catch {
        // 저장된 값이 JSON이 아니면(있을 수 없지만) 그냥 원본을 보여준다.
      }
    } else if (field?.type === "checkbox") {
      value = answer.value === "true" ? "예" : "아니오";
    }
    return { label: field?.label ?? "(삭제된 문항)", value };
  });

  const selectedWithProduct = selected
    ? {
        ...selected,
        productName: productNameById.get(selected.product_id) ?? "",
        customAnswers,
      }
    : undefined;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">예약관리</h1>
        <ManualReservationButton products={allProducts ?? []} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="border-border bg-surface rounded-xl border p-4">
          <AdminCalendar
            month={month}
            reservationsByDate={byDate}
            selectedDate={selectedDate}
            selectedId={selectedId}
          />
        </div>

        <div>
          <DetailPanel
            selectedDate={selectedDate}
            dayReservations={dayReservations}
            selected={selectedWithProduct}
            month={month}
          />
        </div>
      </div>
    </div>
  );
}
