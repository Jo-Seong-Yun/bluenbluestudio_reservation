import "server-only";
import { createClient } from "@/lib/supabase/server";
import { loadSelectedPricedOptions } from "@/lib/booking/custom-fields";
import { buildEmailVariables } from "./templates";
import { siteVariableOverrides } from "./notify";
import { kstDateString, kstTimeString } from "@/lib/time";
import type { CustomerEmailContext } from "./customer-email-shared";

/** 미리보기와 발송에 같은 DB 값을 사용하고 예약의 고객 소속을 검증합니다. */
export async function loadCustomerEmailContexts(
  phones: string[],
): Promise<CustomerEmailContext[]> {
  const db = await createClient();
  const unique = [...new Set(phones)];
  const site = await siteVariableOverrides();
  if (!unique.length) return [];
  const { data: customers, error } = await db
    .from("customers")
    .select("phone,name,email")
    .in("phone", unique);
  if (error) throw error;
  const rows = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await db
      .from("reservations")
      .select(
        "id,code,customer_phone,product_id,shoot_start,shoot_location,estimated_amount,cancel_reason,created_at",
      )
      .in("customer_phone", unique)
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  const productIds = [...new Set(rows.map((r) => r.product_id))];
  const products = productIds.length
    ? await db.from("products").select("id,name").in("id", productIds)
    : { data: [], error: null };
  if (products.error) throw products.error;
  const names = new Map(products.data?.map((p) => [p.id, p.name]));
  const reservations = await Promise.all(
    rows.map(async (r) => {
      const [{ data: candidates, error }, options] = await Promise.all([
        db
          .from("reservation_candidates")
          .select("shoot_start,rank")
          .eq("reservation_id", r.id)
          .order("rank"),
        loadSelectedPricedOptions(r.id, { strict: true }),
      ]);
      if (error) throw error;
      const customer = customers?.find((c) => c.phone === r.customer_phone);
      const variables = {
        ...buildEmailVariables({
          customerName: customer?.name ?? "",
          customerPhone: r.customer_phone,
          productName: names.get(r.product_id) ?? "",
          shootStart: r.shoot_start ? new Date(r.shoot_start) : null,
          shootLocation: r.shoot_location,
          code: r.code,
          estimatedAmount: r.estimated_amount,
          cancelReason: r.cancel_reason,
          candidateTimes: candidates?.map((c) => new Date(c.shoot_start)),
          selectedOptions: options,
        }),
        ...site,
      };
      return {
        phone: r.customer_phone,
        id: r.id,
        label: `${r.code} · ${names.get(r.product_id) ?? "삭제된 상품"} · ${r.shoot_start ? `${kstDateString(new Date(r.shoot_start))} ${kstTimeString(new Date(r.shoot_start))}` : "시간 미확정"}`,
        variables,
      };
    }),
  );
  return (customers ?? []).map((c) => ({
    phone: c.phone,
    name: c.name,
    variables: {
      ...buildEmailVariables({ customerName: c.name, customerPhone: c.phone }),
      ...site,
    },
    reservations: reservations.filter((r) => r.phone === c.phone),
  }));
}
