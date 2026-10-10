"use server";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { parseFormPages, formPages } from "@/lib/booking/form-pages";
import { DEFAULT_COPY, resolveCopy } from "@/lib/booking/copy";
import { updateBookingSettings } from "@/lib/booking/style-storage";
import { revalidatePath } from "next/cache";
export async function saveProductBookingCopy(
  _prev: { error?: string; success?: boolean } | null,
  form: FormData,
) {
  await requireAdmin();
  const id = String(form.get("productId") ?? "");
  const db = await createClient();
  const { data, error } = await db
    .from("products")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return { error: "상품을 확인하지 못했습니다." };
  const raw: Record<string, string> = {};
  for (const key of Object.keys(DEFAULT_COPY)) {
    if (!form.has(key)) continue;
    const value = String(form.get(key) ?? "");
    if (value.length > 1000)
      return { error: "문구는 항목당 1,000자 이내로 입력합니다." };
    raw[key] = value;
  }
  const serializedPages = form.get("formPages");
  if (serializedPages !== null) {
    const pages = parseFormPages(serializedPages);
    if (!pages)
      return {
        error:
          "페이지 이름·제목과 페이지 구성을 확인해 주십시오. 최대 20개입니다.",
      };
    raw.formPages = JSON.stringify(pages);
  }
  const allowedGroups = new Set(
    formPages(resolveCopy(raw)).map((page) => String(page.id)),
  );
  const { data: fields, error: fieldError } = await db
    .from("custom_fields")
    .select("id")
    .eq("product_id", id);
  if (fieldError) return { error: "신청서 문항을 확인하지 못했습니다." };
  for (const field of fields ?? []) {
    const value = form.get(`group:${field.id}`);
    if (value !== null && !allowedGroups.has(String(value)))
      return { error: "문항을 배치할 페이지를 확인해 주십시오." };
    if (value !== null && allowedGroups.has(String(value)))
      raw[`group:${field.id}`] = String(value);
  }
  for (const field of fields ?? []) {
    const order = form.get(`order:${field.id}`);
    if (typeof order === "string" && /^\d{1,6}$/.test(order))
      raw[`order:${field.id}`] = order;
    const value = form.get(`placeholder:${field.id}`);
    if (typeof value === "string") {
      if (value.length > 200)
        return { error: "입력 예시는 200자 이내로 입력합니다." };
      raw[`placeholder:${field.id}`] = value;
    }
  }
  try {
    await updateBookingSettings((current) => ({
      ...current,
      productCopies: {
        ...current?.productCopies,
        [id]: resolveCopy({ ...current?.productCopies?.[id], ...raw }),
      },
    }));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "저장하지 못했습니다." };
  }
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/booking", "layout");
  return { success: true };
}
