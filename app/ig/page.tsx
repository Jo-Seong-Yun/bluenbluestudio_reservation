import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "./navbar";
import { Hero } from "./hero";

export const metadata: Metadata = { title: "인스타그램 광고 랜딩" };

// 관리자 상품관리에 등록된 정확한 상품명 — slug는 바뀔 수 있어도 이름은
// 고정이라고 보고 이걸로 찾는다. 못 찾으면(이름이 바뀌었거나 아직 상품이
// 없으면) 전체 상품 목록으로 보내 손님이 헤매지 않게 한다.
const TARGET_PRODUCT_NAME = "독백 연기영상 촬영";

export default async function IgLandingPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("products")
    .select("slug")
    .eq("is_published", true)
    .ilike("name", `%${TARGET_PRODUCT_NAME}%`)
    .limit(1);

  const slug = rows?.[0]?.slug ?? null;
  // 이 랜딩페이지를 거쳐 예약 흐름으로 넘어간 손님을 다른 유입경로와
  // 구분해 집계할 수 있도록 ?ref=landing을 붙인다 — 이후 조회 기록
  // (product_views 등)과 실제 예약(reservations.ref)까지 쿠키로 그대로
  // 이어진다(lib/booking/ref-cookie.ts).
  const bookingHref = slug
    ? `/booking/${slug}?ref=landing`
    : "/booking?ref=landing";

  return (
    <>
      <Navbar />
      <Hero bookingHref={bookingHref} />
    </>
  );
}
