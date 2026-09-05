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

export const metadata: Metadata = { title: "예약 관리" };

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
      "id, code, status, shoot_start, shoot_end, customer_name, customer_phone, people_count, memo, admin_memo, product_id",
    )
    .gte("shoot_start", `${grid[0]}T00:00:00+09:00`)
    .lt("shoot_start", `${grid[grid.length - 1]}T24:00:00+09:00`)
    .order("shoot_start");

  const productIds = [
    ...new Set((reservations ?? []).map((r) => r.product_id)),
  ];
  const { data: products } =
    productIds.length > 0
      ? await supabase.from("products").select("id, name").in("id", productIds)
      : { data: [] as { id: string; name: string }[] };
  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));

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
  const selectedWithProduct = selected
    ? {
        ...selected,
        productName: productNameById.get(selected.product_id) ?? "",
      }
    : undefined;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">예약 관리</h1>
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
