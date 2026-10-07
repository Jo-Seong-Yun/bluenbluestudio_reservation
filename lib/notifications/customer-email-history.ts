import "server-only";
import { createClient } from "@/lib/supabase/server";
export type CustomerEmailLog = {
  id: string;
  created_at: string;
  recipient: string;
  purpose: string;
  success: boolean;
  error: string | null;
  reservation_id: string | null;
};
export async function loadCustomerEmailHistory(
  phone: string,
): Promise<CustomerEmailLog[]> {
  const db = await createClient();
  const { data: customer, error: customerError } = await db
    .from("customers")
    .select("email")
    .eq("phone", phone)
    .maybeSingle();
  if (customerError) throw customerError;
  const reservations = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await db
      .from("reservations")
      .select("id,customer_email")
      .eq("customer_phone", phone)
      .order("id")
      .range(from, from + 499);
    if (error) throw error;
    reservations.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  const ids = new Set(reservations.map((r) => r.id));
  const addresses = new Set(
    [
      customer?.email,
      ...reservations.map((r) => r.customer_email),
    ]
      .filter((v): v is string => Boolean(v))
      .map((v) => v.trim().toLowerCase()),
  );
  const result: CustomerEmailLog[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await db
      .from("notification_logs")
      .select("id,created_at,recipient,purpose,success,error,reservation_id")
      .eq("channel", "email")
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + 499);
    if (error) throw error;
    result.push(
      ...(data ?? []).filter((r) =>
        addresses.has(r.recipient.trim().toLowerCase()) &&
        (!r.reservation_id || ids.has(r.reservation_id)),
      ),
    );
    if (!data || data.length < 500) break;
  }
  return result;
}
