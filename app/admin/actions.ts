"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { productSchema, toSlug } from "@/lib/validation/product";
import { manualReservationSchema } from "@/lib/validation/reservation";
import { addDays, diffDays, kstToInstant, type DateString } from "@/lib/time";
import { loadAvailableSlots } from "@/lib/availability/load";
import { toTstzRange } from "@/lib/availability/range";
import { generateReservationCode } from "@/lib/booking/code";
import {
  notifyCustomerCancelled,
  notifyCustomerConfirmed,
} from "@/lib/notifications/notify";
import { sanitizeDescriptionHtml } from "@/lib/sanitize-description";
import { PRODUCT_TAG_COLORS } from "@/lib/product-tag-colors";

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

  // 정해둔 팔레트 밖의 값(조작되거나 옛날 값)이 오면 그냥 태그 없음으로 —
  // DB 체크 제약에 걸려 저장 자체가 실패하게 두지 않는다.
  const tagColorRaw = String(formData.get("tagColor") ?? "");
  const tagColor =
    PRODUCT_TAG_COLORS.find((color) => color.key === tagColorRaw)?.key ?? null;

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
    tag_color: tagColor,
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

/**
 * 상품 상세 설명만 따로 저장. 상품 기본정보 폼(saveProduct)과는 별도
 * 액션이다 — 상세 설명 에디터는 같은 페이지 안에서 슬라이드로 열리는
 * 패널일 뿐 다른 폼이라, 저장 후에도 그 패널에 그대로 남아 있어야
 * 하니 saveProduct처럼 목록으로 redirect하지 않고 성공 여부만 돌려준다.
 */
export type ProductDescriptionState = {
  error?: string;
  success?: boolean;
} | null;

export async function saveProductDescription(
  _prev: ProductDescriptionState,
  formData: FormData,
): Promise<ProductDescriptionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "상품을 찾을 수 없어요." };

  const rawDescription = String(formData.get("description") ?? "");
  if (rawDescription.length > 20_000) {
    return { error: "설명이 너무 길어요." };
  }
  const description = sanitizeDescriptionHtml(rawDescription);

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  if (!product) return { error: "상품을 찾을 수 없어요." };

  const { error } = await supabase
    .from("products")
    .update({ description: description || null })
    .eq("id", id);

  if (error) {
    return { error: `저장하지 못했습니다: ${error.message}` };
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/booking/[slug]", "page");

  return { success: true };
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

  // 손님에게 알릴 상태(확정/취소)로 바뀔 때만, 갱신 전에 필요한 정보를
  // 미리 읽어둔다 — update 자체는 status 컬럼만 건드리니 갱신 뒤에는
  // 이 정보가 사라지지 않지만, 어차피 한 번 더 조회할 이유가 없다.
  const notifiable = status === "confirmed" || status === "cancelled";
  const { data: reservation } = notifiable
    ? await supabase
        .from("reservations")
        .select("code, customer_phone, customer_email, shoot_start, product_id")
        .eq("id", id)
        .single()
    : { data: null };

  await supabase.from("reservations").update({ status }).eq("id", id);

  revalidatePath("/admin/reservations");

  if (reservation) {
    const { data: product } = await supabase
      .from("products")
      .select("name")
      .eq("id", reservation.product_id)
      .single();

    const notice = {
      reservationId: id,
      customerPhone: reservation.customer_phone,
      customerEmail: reservation.customer_email,
      productName: product?.name ?? "촬영",
      shootStart: new Date(reservation.shoot_start),
      code: reservation.code,
    };

    // 알림 발송(SMS·이메일)은 응답을 붙잡지 않는다 — 관리자가 상태를
    // 바꾸는 버튼을 눌렀을 때 발송이 끝날 때까지 화면이 멈춰 있으면
    // 안 되니, after()로 응답 뒤에 보낸다.
    after(() =>
      status === "confirmed"
        ? notifyCustomerConfirmed(notice)
        : notifyCustomerCancelled(notice),
    );
  }
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
 * 예약 한 건의 촬영 원가(대관료, 소품, 외주 등). 매출 관리 화면의
 * 순이익 계산에 쓴다. 빈 값으로 저장하면 null(=원가 없음)로 되돌아간다
 * — "0원"과 "아직 입력 안 함"을 구분해야 나중에 빠뜨린 건을 알아볼 수 있다.
 */
export async function saveReservationCost(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const raw = String(formData.get("cost") ?? "").trim();
  const cost = raw === "" ? null : Number(raw);
  if (cost !== null && (!Number.isFinite(cost) || cost < 0)) return;

  const supabase = await createClient();
  await supabase.from("reservations").update({ cost }).eq("id", id);

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/revenue");
}

/** 촬영과 무관한 월별 고정비(임대료, 장비, 마케팅 등) 한 항목 추가. */
export async function addMonthlyExpense(formData: FormData) {
  await requireAdmin();

  const month = String(formData.get("month") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const amount = Number(formData.get("amount"));

  if (!/^\d{4}-\d{2}$/.test(month)) return;
  if (!label) return;
  if (!Number.isFinite(amount) || amount < 0) return;

  const supabase = await createClient();
  await supabase.from("monthly_expenses").insert({ month, label, amount });

  revalidatePath("/admin/revenue");
}

export async function deleteMonthlyExpense(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("monthly_expenses").delete().eq("id", id);

  revalidatePath("/admin/revenue");
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
    .select("name, duration_min, buffer_after_min")
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

    const { data, error } = await supabase
      .from("reservations")
      .insert({
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
      })
      .select("id")
      .single();

    if (!error) {
      revalidatePath("/admin/reservations");

      // 이미 통화로 확인하고 사장님이 직접 넣는 예약이라, "새 신청" 알림은
      // 필요 없다 — 확정 안내만 손님에게 보낸다. 응답은 기다리게 하지
      // 않고 after()로 보낸 뒤 바로 성공을 돌려준다.
      after(() =>
        notifyCustomerConfirmed({
          reservationId: data?.id ?? "",
          customerPhone: input.customerPhone,
          productName: product.name,
          shootStart,
          code,
        }),
      );

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
  const adminNotifyPhone = String(
    formData.get("adminNotifyPhone") ?? "",
  ).trim();
  const adminNotifyEmail = String(
    formData.get("adminNotifyEmail") ?? "",
  ).trim();

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

  if (adminNotifyPhone && !/^01[0-9]{8,9}$/.test(adminNotifyPhone)) {
    return { error: "알림 받을 번호는 숫자만, 010으로 시작해 입력해주세요." };
  }

  if (adminNotifyEmail && !adminNotifyEmail.includes("@")) {
    return { error: "알림 받을 이메일 형식을 확인해주세요." };
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
      admin_notify_phone: adminNotifyPhone || null,
      admin_notify_email: adminNotifyEmail || null,
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
  revalidatePath("/booking/[slug]/[date]/[time]", "page");

  return { success: true };
}

/**
 * 예약별 실제 지불액. 원가(cost)와 같은 화면·같은 방식으로 입력받는다.
 * 할인 이벤트 등으로 예약마다 실제 받는 금액이 다를 수 있어 상품
 * 정가와 별도로 둔다. 빈 값이면 null(=매출 계산에서 0으로 취급)로
 * 되돌린다.
 */
export async function saveReservationChargedAmount(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const raw = String(formData.get("chargedAmount") ?? "").trim();
  const chargedAmount = raw === "" ? null : Number(raw);
  if (
    chargedAmount !== null &&
    (!Number.isFinite(chargedAmount) || chargedAmount < 0)
  ) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("reservations")
    .update({ charged_amount: chargedAmount })
    .eq("id", id);

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/revenue");
}

/**
 * 커스텀 신청 문항 — 상품별 예약 폼에 자유롭게 문항을 추가한다.
 * 상품/스케줄과 같은 이유로 순서는 sort_order, 위/아래 버튼으로 바꾼다.
 * 문항은 상품마다 따로 관리되므로(product_id), 정렬·다음 순번 계산도
 * 항상 그 상품 안에서만 이뤄진다.
 */
const CUSTOM_FIELD_TYPES = [
  "short_text",
  "long_text",
  "single_choice",
  "multi_choice",
  "checkbox",
] as const;

/**
 * 추가/수정 폼에서 공통으로 쓰는 값 읽기 + 검증. 실패하면 null —
 * 폼이 조작되지 않는 한 벌어질 일이 없어 별도 에러 메시지는 안 둔다
 * (다른 관리자 액션들도 같은 수준으로 조용히 무시한다).
 *
 * 보기(옵션)는 구글폼처럼 한 줄짜리 입력을 여러 개 늘어놓는 방식이라,
 * 같은 이름("option")으로 여러 번 들어온다 — getAll로 그대로 순서를 살린다.
 */
function parseCustomFieldForm(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const required = formData.get("required") === "on";
  const active = formData.get("active") === "on";
  const options = formData
    .getAll("option")
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0);

  if (!productId || !label) return null;
  if (
    !CUSTOM_FIELD_TYPES.includes(type as (typeof CUSTOM_FIELD_TYPES)[number])
  ) {
    return null;
  }
  const needsOptions = type === "single_choice" || type === "multi_choice";
  if (needsOptions && options.length === 0) return null;

  return {
    product_id: productId,
    label,
    type: type as (typeof CUSTOM_FIELD_TYPES)[number],
    options: needsOptions ? options : null,
    description: description || null,
    required,
    active,
  };
}

function revalidateCustomFieldPaths(productId: string) {
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/booking/[slug]/[date]/[time]", "page");
}

export async function addCustomField(formData: FormData) {
  await requireAdmin();

  const row = parseCustomFieldForm(formData);
  if (!row) return;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("custom_fields")
    .select("sort_order")
    .eq("product_id", row.product_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (existing?.sort_order ?? -1) + 1;

  await supabase
    .from("custom_fields")
    .insert({ ...row, sort_order: nextOrder });

  revalidateCustomFieldPaths(row.product_id);
}

export async function updateCustomField(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const row = parseCustomFieldForm(formData);
  if (!row) return;

  const supabase = await createClient();
  await supabase.from("custom_fields").update(row).eq("id", id);

  revalidateCustomFieldPaths(row.product_id);
}

export async function deleteCustomField(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const productId = String(formData.get("productId") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("custom_fields").delete().eq("id", id);

  if (productId) revalidateCustomFieldPaths(productId);
}

export async function moveCustomField(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const direction = formData.get("direction") === "up" ? -1 : 1;
  if (!id || !productId) return;

  const supabase = await createClient();
  const { data: fields } = await supabase
    .from("custom_fields")
    .select("id, sort_order")
    .eq("product_id", productId)
    .order("sort_order");

  if (!fields) return;

  const index = fields.findIndex((field) => field.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= fields.length) return;

  const reordered = [...fields];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  await Promise.all(
    reordered.map((field, order) =>
      supabase
        .from("custom_fields")
        .update({ sort_order: order })
        .eq("id", field.id),
    ),
  );

  revalidateCustomFieldPaths(productId);
}
