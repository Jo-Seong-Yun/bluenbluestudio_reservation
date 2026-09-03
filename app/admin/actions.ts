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
    // Supabase 원문은 영어라 그대로 보여주지 않는다.
    // 어느 쪽이 틀렸는지 알려주지 않는 것이 계정 추측을 막는 데도 낫다.
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
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
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
      supabase.from("products").update({ sort_order: order }).eq("id", product.id),
    ),
  );

  revalidatePath("/admin/products");
}
