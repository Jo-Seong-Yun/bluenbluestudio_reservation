"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { productSchema, toSlug } from "@/lib/validation/product";
import { manualReservationSchema } from "@/lib/validation/reservation";
import { addDays, diffDays, kstToInstant, type DateString } from "@/lib/time";
import { loadAvailableSlots } from "@/lib/availability/load";
import { toTstzRange } from "@/lib/availability/range";
import { generateReservationCode } from "@/lib/booking/code";

/**
 * 관리자 화면의 데이터 변경.
 *
 * 서버 액션은 화면을 거치지 않고 POST로 직접 호출될 수 있다.
 * 그래서 함수마다 첫 줄에서 requireAdmin()으로 로그인을 확인한다.
 * (Next.js 문서의 경고: "Always verify authentication and authorization
 *  inside every Server Function")
 */

export type ActionState = { error?: string } | null;

export async function signIn(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // "이메일/비번 틀림"과 "이메일 인증 안 됨"은 구분해서 보여준다.
    // 관리자 계정이 하나뿐인 사이트라 계정 추측 방지보다, 원인을 알 수
    // 없어 사장님이 막히는 쪽이 더 큰 문제다.
    if (error.code === "email_not_confirmed") {
      return {
        error:
          "이 계정은 아직 이메일 인증이 안 됐어요. Supabase 대시보드 " +
          "Authentication → Users 에서 해당 계정을 열고 이메일을 " +
          "확인(confirm) 상태로 바꿔주세요.",
      };
    }
    return { error: "이메일 또는 비밀번호가 맞지 않습니다." };
  }

  redirect("/admin/products");
}

export async function signOut() {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function saveProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    durationMin: formData.get("durationMin"),
    bufferAfterMin: formData.get("bufferAfterMin"),
    price: formData.get("price"),
    maxPeople: formData.get("maxPeople"),
    summary: formData.get("summary"),
    description: formData.get("description"),
    isPublished: formData.get("isPublished") === "on",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  const input = parsed.data;
  const id = String(formData.get("id") ?? "");
  const coverImage = String(formData.get("coverImage") ?? "") || null;
  const gallery = formData
    .getAll("gallery")
    .map(String)
    .filter((path) => path.length > 0);

  const row = {
    name: input.name,
    slug: input.slug || toSlug(input.name),
    duration_min: input.durationMin,
    buffer_after_min: input.bufferAfterMin,
    price: input.price,
    max_people: input.maxPeople,
    summary: input.summary || null,
    description: input.description || null,
    cover_image: coverImage,
    gallery,
    is_published: input.isPublished,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("products").update(row).eq("id", id)
    : await supabase.from("products").insert(row);

  if (error) {
    if (error.code === "23505") {
      return { error: `주소 "${row.slug}" 는 이미 다른 상품이 쓰고 있어요.` };
    }
    return { error: `저장하지 못했습니다: ${error.message}` };
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function togglePublished(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const next = formData.get("isPublished") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("products").update({ is_published: next }).eq("id", id);

  revalidatePath("/admin/products");
}

/**
 * 목록에서의 순서 바꾸기.
 *
 * 드래그 대신 위/아래 버튼을 쓴다. 모바일에서도 확실히 동작하고
 * 라이브러리도 필요 없다. 상품 개수가 수십 개를 넘길 일이 없는 규모다.
 */
export async function moveProduct(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const direction = formData.get("direction") === "up" ? -1 : 1;
  if (!id) return;

  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, sort_order")
    .order("sort_order")
    .order("created_at");

  if (!products) return;

  const index = products.findIndex((product) => product.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= products.length) return;

  // sort_order 값이 겹치거나 비어 있을 수 있으므로, 순서를 바꾼 뒤
  // 전체를 0부터 다시 매긴다. 값 두 개만 맞바꾸면 어긋난 상태가 남는다.
  const reordered = [...products];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  await Promise.all(
    reordered.map((product, order) =>
      supabase
        .from("products")
        .update({ sort_order: order })
        .eq("id", product.id),
    ),
  );

  revalidatePath("/admin/products");
}

const RESERVATION_STATUSES = [
  "requested",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;

export async function updateReservationStatus(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const rawStatus = String(formData.get("status") ?? "");
  const status = RESERVATION_STATUSES.find((value) => value === rawStatus);
  if (!id || !status) return;

  const supabase = await createClient();
  await supabase.from("reservations").update({ status }).eq("id", id);

  revalidatePath("/admin/reservations");
}

export async function saveAdminMemo(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const adminMemo = String(formData.get("adminMemo") ?? "").trim();

  const supabase = await createClient();
  await supabase
    .from("reservations")
    .update({ admin_memo: adminMemo || null })
    .eq("id", id);

  revalidatePath("/admin/reservations");
}

/**
 * 예약 완전 삭제.
 *
 * "취소"와 다르다 — 행 자체를 지운다. 되돌릴 수 없고, 손님도 예약
 * 조회에서 더는 찾을 수 없게 된다. 그래서 이 액션 자체에는 확인 절차를
 * 두지 않는다 — "정말 삭제하시겠습니까?" → "삭제"를 직접 입력해야
 * 눌리는 2중 확인은 실수 방지가 목적이라 화면(delete-reservation-
 * button.tsx)에서 다루고, 여기서는 그 확인을 통과해 넘어온 요청을
 * 그대로 처리한다.
 */
export async function deleteReservation(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const month = String(formData.get("month") ?? "");
  const date = String(formData.get("date") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.from("reservations").delete().eq("id", id);
  if (error) return;

  revalidatePath("/admin/reservations");

  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (date) params.set("date", date);
  redirect(`/admin/reservations?${params.toString()}`);
}

/**
 * 스케줄 관리 (Phase 5).
 *
 * weekly_hours / date_overrides / blocks 세 테이블을 다룬다.
 * 계산 로직(무엇이 열려 있는가)은 항상 lib/availability에만 두고,
 * 여기 액션들은 그 테이블의 행을 쓰는 일만 한다.
 *
 * redirect()를 쓰지 않는다 — 다른 가벼운 토글 액션들(togglePublished,
 * moveProduct 등)과 같은 이유다. 지금 보고 있는 페이지에 그대로 남아
 * revalidatePath로만 갱신해야, 매 클릭마다 페이지 전체를 다시 내비게이션하며
 * 5개 쿼리를 처음부터 다시 부르는 지연이 없다. 특히 주간 캘린더는 한 칸
 * 클릭마다 이 액션이 불리므로 여기서의 딜레이가 그대로 체감된다.
 */

/**
 * 요일별 기본 운영시간 저장. 한 요일에는 항상 구간을 하나만 둔다
 * (점심시간을 나눠 쉬는 등은 이 화면의 대상이 아니다 — 필요하면
 * 그 시간만 개별 차단하면 된다). 그래서 저장할 때마다 그 요일의
 * 기존 행을 지우고 새로 넣는다.
 */
export async function saveWeeklyHours(formData: FormData) {
  await requireAdmin();

  const weekday = Number(formData.get("weekday"));
  const closed = formData.get("closed") === "on";
  const openTime = String(formData.get("openTime") ?? "");
  const closeTime = String(formData.get("closeTime") ?? "");
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return;

  const supabase = await createClient();
  await supabase.from("weekly_hours").delete().eq("weekday", weekday);
  if (!closed && openTime && closeTime) {
    await supabase
      .from("weekly_hours")
      .insert({ weekday, open_time: openTime, close_time: closeTime });
  }

  revalidatePath("/admin/schedule");
}

/**
 * 주간 캘린더의 칸 하나(1시간) 클릭 토글.
 *
 * "정확히 겹치는 차단이 있으면 지우고, 없으면 만든다"는 판단과 실행을
 * DB 함수(toggle_block_hour, migrations/20260904000400) 안에서 한 번에
 * 처리한다. 예전엔 select로 확인한 뒤 delete/insert를 또 불렀는데,
 * 클릭 한 번마다 Vercel↔Supabase 왕복이 두 번 생겨 그만큼 굼떴다.
 */
export async function toggleBlockHour(formData: FormData) {
  await requireAdmin();

  const date = String(formData.get("date") ?? "");
  const hour = String(formData.get("hour") ?? "");
  if (!date || !hour) return;

  const start = kstToInstant(date, hour);
  const end = new Date(start.getTime() + 60 * 60_000);

  const supabase = await createClient();
  await supabase.rpc("toggle_block_hour", {
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });

  revalidatePath("/admin/schedule");
}

/**
 * 날짜 단위 휴무/특별 운영시간을 여러 날에 한 번에 등록.
 * 시험기간처럼 "12/1 ~ 12/10 통째로 휴무" 같은 걸 한 번에 처리하려고
 * 범위로 받아 날짜 수만큼 행을 만든다. date_overrides.date가
 * unique라 upsert로 넣으면 이미 등록된 날짜는 덮어쓴다.
 */
export async function saveDateOverrideRange(formData: FormData) {
  await requireAdmin();

  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "") || startDate;
  const closed = formData.get("closed") === "on";
  const openTime = String(formData.get("openTime") ?? "");
  const closeTime = String(formData.get("closeTime") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!startDate || endDate < startDate) return;
  if (!closed && (!openTime || !closeTime)) return;

  const dayCount = diffDays(startDate as DateString, endDate as DateString);
  // 시험기간 등록 실수로 몇 달치가 밀리는 걸 막는 안전장치.
  if (dayCount > 90) return;

  const rows = Array.from({ length: dayCount + 1 }, (_, i) => ({
    date: addDays(startDate as DateString, i),
    is_closed: closed,
    open_time: closed ? null : openTime,
    close_time: closed ? null : closeTime,
    reason: reason || null,
  }));

  const supabase = await createClient();
  await supabase.from("date_overrides").upsert(rows, { onConflict: "date" });

  revalidatePath("/admin/schedule");
}

export async function removeDateOverride(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("date_overrides").delete().eq("id", id);

  revalidatePath("/admin/schedule");
}

/**
 * 수기 예약 등록 (Phase 7).
 *
 * 전화나 DM으로 받은 예약을 관리자가 직접 넣는다. 손님용 신청과 같은
 * 계산(loadAvailableSlots)으로 다시 확인한다 — 관리자가 통화 중 착각해
 * 이미 찬 시간이나 운영시간 밖을 입력해도 이중예약으로 이어지지 않는다.
 * 이미 통화로 확인된 예약이라 개인정보 동의 체크박스는 없고, 상태도
 * 확인 대기(requested)가 아니라 바로 확정(confirmed)으로 넣는다.
 */
export type ManualReservationState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; code: string };

export async function createManualReservation(
  _prev: ManualReservationState,
  formData: FormData,
): Promise<ManualReservationState> {
  await requireAdmin();

  const parsed = manualReservationSchema.safeParse({
    productId: formData.get("productId"),
    date: formData.get("date"),
    time: formData.get("time"),
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    peopleCount: formData.get("peopleCount"),
    memo: formData.get("memo"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("duration_min, buffer_after_min")
    .eq("id", input.productId)
    .single();

  if (!product) {
    return { status: "error", error: "상품을 찾을 수 없어요." };
  }

  const slots = await loadAvailableSlots({
    date: input.date,
    productId: input.productId,
  });
  const stillAvailable = slots.some((slot) => slot.time === input.time);
  if (!stillAvailable) {
    return {
      status: "error",
      error:
        "이 시간은 예약할 수 없어요. 이미 다른 예약이 있거나 운영시간이 아니에요.",
    };
  }

  const shootStart = kstToInstant(input.date, input.time);
  const shootEnd = new Date(
    shootStart.getTime() + product.duration_min * 60_000,
  );
  const occupiesEnd = new Date(
    shootEnd.getTime() + product.buffer_after_min * 60_000,
  );
  const period = toTstzRange({ start: shootStart, end: occupiesEnd });

  // 코드가 우연히 겹치면(극히 드묾) 새로 뽑아 다시 시도한다.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateReservationCode();

    const { error } = await supabase.from("reservations").insert({
      code,
      product_id: input.productId,
      period,
      shoot_start: shootStart.toISOString(),
      shoot_end: shootEnd.toISOString(),
      status: "confirmed",
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      people_count: input.peopleCount,
      memo: input.memo || null,
    });

    if (!error) {
      revalidatePath("/admin/reservations");
      return { status: "success", code };
    }

    if (error.code === "23505") continue; // 예약번호 충돌. 다시 시도.

    if (error.code === "23P01") {
      // EXCLUDE 제약. 위 재확인 이후 그사이에 진짜로 시간이 찬 경우.
      return {
        status: "error",
        error: "방금 그 시간이 다른 예약으로 찼어요. 다시 골라주세요.",
      };
    }

    return { status: "error", error: `등록하지 못했습니다: ${error.message}` };
  }

  return {
    status: "error",
    error: "일시적인 오류로 등록하지 못했습니다. 다시 시도해주세요.",
  };
}

/**
 * 예약 설정 (Phase 7) — 리드타임/예약가능기간/취소기한/계좌/공지.
 * 지금까지는 이 값들을 바꾸려면 Supabase Table Editor를 열어야 했다.
 */
export type SettingsActionState = { error?: string; success?: boolean } | null;

export async function saveSettings(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

  const slotIntervalMin = Number(formData.get("slotIntervalMin"));
  const minLeadDays = Number(formData.get("minLeadDays"));
  const maxAdvanceDays = Number(formData.get("maxAdvanceDays"));
  const cancelDeadlineHours = Number(formData.get("cancelDeadlineHours"));
  const bankAccount = String(formData.get("bankAccount") ?? "").trim();
  const studioIntro = String(formData.get("studioIntro") ?? "").trim();
  const notice = String(formData.get("notice") ?? "").trim();

  if (
    !Number.isInteger(slotIntervalMin) ||
    slotIntervalMin <= 0 ||
    !Number.isInteger(minLeadDays) ||
    minLeadDays < 0 ||
    !Number.isInteger(maxAdvanceDays) ||
    maxAdvanceDays <= 0 ||
    !Number.isInteger(cancelDeadlineHours) ||
    cancelDeadlineHours < 0
  ) {
    return { error: "숫자 값을 다시 확인해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({
      slot_interval_min: slotIntervalMin,
      min_lead_days: minLeadDays,
      max_advance_days: maxAdvanceDays,
      cancel_deadline_hours: cancelDeadlineHours,
      bank_account: bankAccount || null,
      studio_intro: studioIntro || null,
      notice: notice || null,
    })
    .eq("id", 1);

  if (error) {
    return { error: `저장하지 못했습니다: ${error.message}` };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/"); // 랜딩 페이지가 studio_intro를 보여준다.
  // 동적 세그먼트가 있는 경로는 파일 구조 패턴 + type을 함께 줘야 한다
  // (revalidatePath는 layout.tsx가 실제로 있는 세그먼트에서만 "layout"
  // 타입이 먹는다 — /booking 아래엔 layout.tsx가 없어 개별로 지정한다).
  revalidatePath("/booking"); // 리터럴 경로
  revalidatePath("/booking/[slug]", "page");
  revalidatePath("/booking/[slug]/[date]", "page");

  return { success: true };
}
