"use server";
import { requireAdmin } from "@/lib/supabase/auth";
import { updateBookingSettings } from "@/lib/booking/style-storage";
import { inquiryUrl } from "@/lib/booking/inquiry";
import { revalidatePath } from "next/cache";
export async function saveInquiryUrl(
  _previous: { error?: string; success?: boolean } | null,
  form: FormData,
) {
  await requireAdmin();
  const raw = String(form.get("inquiryUrl") ?? "").trim();
  const url = inquiryUrl(raw);
  if (raw && !url)
    return { error: "https://로 시작하는 올바른 문의 링크를 입력해주세요." };
  try {
    await updateBookingSettings((current) => ({
      ...current,
      inquiryUrl: url ?? "",
    }));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "저장하지 못했습니다.",
    };
  }
  revalidatePath("/booking");
  revalidatePath("/admin/settings");
  return { success: true };
}
