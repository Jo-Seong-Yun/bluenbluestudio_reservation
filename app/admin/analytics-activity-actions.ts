"use server";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { loadActivityPage } from "@/lib/analytics/activity";
export async function fetchAnalyticsActivity(input: unknown) {
  await requireAdmin();
  return loadActivityPage(await createClient(), input);
}
