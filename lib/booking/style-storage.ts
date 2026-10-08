import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
type Style = Database["public"]["Tables"]["settings"]["Row"]["booking_style"];
/** Compare-and-swap prevents copy/style edits from overwriting another settings edit. */
export async function updateBookingSettings(
  transform: (current: Style) => Style,
) {
  const db = await createClient();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await db
      .from("settings")
      .select("booking_style")
      .eq("id", 1)
      .single();
    if (error || !data) throw new Error("예약 설정을 불러오지 못했습니다.");
    const current = data.booking_style;
    const query = db
      .from("settings")
      .update({ booking_style: transform(current) })
      .eq("id", 1);
    const result = await (
      current
        ? query.filter("booking_style", "eq", JSON.stringify(current))
        : query.is("booking_style", null)
    ).select("id");
    if (result.error) throw new Error("예약 설정을 저장하지 못했습니다.");
    if (result.data?.length) return;
  }
  throw new Error("다른 설정이 변경되었습니다. 다시 저장해 주십시오.");
}
