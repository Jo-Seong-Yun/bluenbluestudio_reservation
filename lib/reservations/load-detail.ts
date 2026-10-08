import "server-only";
import { createClient } from "@/lib/supabase/server";

const RESERVATION_COLUMNS = "*";

export type ReservationDetail = {
  id: string;
  code: string;
  status: string;
  deposit_required?: boolean;
  shoot_start: string | null;
  shoot_end: string | null;
  customer_name: string;
  customer_phone: string;
  people_count: number | null;
  memo: string | null;
  admin_memo: string | null;
  shoot_location: string | null;
  cancel_reason: string | null;
  cost: number | null;
  cost_memo: string | null;
  charged_amount: number | null;
  charged_amount_memo: string | null;
  charged_amount_breakdown: { label: string; amount: number }[] | null;
  estimated_amount: number | null;
  gender: string | null;
  birth_date: string | null;
  product_id: string;
  productName: string;
  customAnswers: { label: string; value: string; priceNote?: string }[];
  basePrice?: number;
  priceBreakdown: { label: string; amount: number }[];
  candidates: { rank: number; shootStart: string; shootEnd: string }[];
  notificationLogs: {
    id: string;
    channel: "email" | "sms" | "kakao";
    purpose: string;
    ruleName: string | null;
    recipient: string;
    success: boolean;
    error: string | null;
    createdAt: string;
  }[];
};

/**
 * 예약 하나의 상세(오른쪽 패널 DetailPanel에 넘길) 데이터를 한 번에
 * 모은다. 예약관리(달력)와 예약내역(표)가 "같은 데이터를 달력/표로만
 * 다르게 보여줄 뿐"이라는 요구에 맞춰, 두 화면이 이 함수 하나를
 * 그대로 같이 쓴다 — 상세 화면 로직이 두 곳에서 따로 놀며 어긋나는
 * 일이 없게 한다(원래 app/admin/(dashboard)/reservations/page.tsx
 * 안에 있던 계산을 그대로 옮겼다).
 */
export async function loadReservationDetail(
  id: string,
): Promise<ReservationDetail | undefined> {
  const supabase = await createClient();

  const { data: reservation } = await supabase
    .from("reservations")
    .select(RESERVATION_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (!reservation) return undefined;

  // 확정 대기 중인 예약이면(shoot_start가 없다) 손님이 낸 후보들을
  // 같이 가져와야 관리자가 그중 하나를 골라 확정할 수 있다.
  const [
    { data: product },
    { data: candidateRows },
    { data: notificationLogRows },
    { data: answerRows },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("name, price, sale_price")
      .eq("id", reservation.product_id)
      .maybeSingle(),
    reservation.shoot_start
      ? Promise.resolve({
          data: [] as {
            rank: number;
            shoot_start: string;
            shoot_end: string;
          }[],
        })
      : supabase
          .from("reservation_candidates")
          .select("rank, shoot_start, shoot_end")
          .eq("reservation_id", id)
          .order("rank"),
    supabase
      .from("notification_logs")
      .select("id, channel, purpose, recipient, success, error, created_at")
      .eq("reservation_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reservation_answers")
      .select("field_id, value")
      .eq("reservation_id", id),
  ]);

  // rule:<id> 형식의 purpose에서 규칙 이름을 조회한다.
  const ruleIds = [
    ...new Set(
      (notificationLogRows ?? [])
        .map((l) => {
          const m = l.purpose.match(/^rule(?:-test)?:(.+)$/);
          return m ? m[1] : null;
        })
        .filter(Boolean) as string[],
    ),
  ];
  const { data: emailRuleRows } =
    ruleIds.length > 0
      ? await supabase.from("email_rules").select("id, name").in("id", ruleIds)
      : { data: [] as { id: string; name: string }[] };
  const ruleNameById = new Map(
    (emailRuleRows ?? []).map((r) => [r.id, r.name]),
  );

  const answerFieldIds = [
    ...new Set((answerRows ?? []).map((a) => a.field_id)),
  ];
  const { data: answerFields } =
    answerFieldIds.length > 0
      ? await supabase
          .from("custom_fields")
          .select("id, label, type, options, option_prices")
          .in("id", answerFieldIds)
      : {
          data: [] as {
            id: string;
            label: string;
            type: string;
            options: string[] | null;
            option_prices: number[] | null;
          }[],
        };
  const answerFieldById = new Map((answerFields ?? []).map((f) => [f.id, f]));

  const priceBreakdown: { label: string; amount: number }[] = [];

  const customAnswers = (answerRows ?? []).map((answer) => {
    const field = answerFieldById.get(answer.field_id);
    let value = answer.value;
    let priceNote: string | undefined;

    if (field?.type === "multi_choice") {
      try {
        const selected = JSON.parse(answer.value) as string[];
        value = selected.join(", ");
        if (field.option_prices) {
          for (const opt of selected) {
            const idx = (field.options ?? []).indexOf(opt);
            const price = idx >= 0 ? (field.option_prices[idx] ?? 0) : 0;
            if (price > 0) priceBreakdown.push({ label: opt, amount: price });
          }
          const total = selected.reduce((sum, opt) => {
            const idx = (field.options ?? []).indexOf(opt);
            return sum + (idx >= 0 ? (field.option_prices![idx] ?? 0) : 0);
          }, 0);
          if (total > 0) priceNote = `₩${total.toLocaleString()}`;
        }
      } catch {
        // pass
      }
    } else if (field?.type === "single_choice") {
      if (field.option_prices) {
        const idx = (field.options ?? []).indexOf(answer.value);
        const price = idx >= 0 ? (field.option_prices[idx] ?? 0) : 0;
        if (price > 0) {
          priceNote = `₩${price.toLocaleString()}`;
          priceBreakdown.push({ label: answer.value, amount: price });
        }
      }
    } else if (field?.type === "checkbox") {
      value = answer.value === "true" ? "예" : "아니오";
    }
    return { label: field?.label ?? "(삭제된 문항)", value, priceNote };
  });

  const basePrice = product ? (product.sale_price ?? product.price) : undefined;

  const notificationLogs = (notificationLogRows ?? []).map((l) => {
    const ruleMatch = l.purpose.match(/^(rule(?:-test)?):(.+)$/);
    const ruleName = ruleMatch
      ? (ruleNameById.get(ruleMatch[2]) ?? null)
      : null;
    return {
      id: l.id,
      channel: l.channel as "email" | "sms" | "kakao",
      purpose: l.purpose,
      ruleName,
      recipient: l.recipient,
      success: l.success,
      error: l.error,
      createdAt: l.created_at,
    };
  });

  return {
    ...reservation,
    productName: product?.name ?? "",
    customAnswers,
    basePrice,
    priceBreakdown,
    notificationLogs,
    candidates: (candidateRows ?? []).map((c) => ({
      rank: c.rank,
      shootStart: c.shoot_start,
      shootEnd: c.shoot_end,
    })),
  };
}
