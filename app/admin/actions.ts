"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { productSchema, toSlug } from "@/lib/validation/product";

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
