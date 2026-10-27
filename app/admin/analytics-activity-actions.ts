"use server";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { loadActivityPage } from "@/lib/analytics/activity";
export async function fetchAnalyticsActivity(input: unknown) {
  await requireAdmin();
  return loadActivityPage(await createClient(), input);
}

export async function fetchAuditActivity(input: unknown) {
  await requireAdmin();
  const { loadAuditPage } = await import("@/lib/analytics/audit");
  return loadAuditPage(await createClient(), input);
}
export async function recordAdminNavigation(input: unknown) {
  const id = await requireAdmin();
  // Only static admin route names; never persist query strings or customer identifiers.
  const { z } = await import("zod");
  const parsed = z
    .enum([
      "/admin",
      "/admin/products",
      "/admin/reservations",
      "/admin/reservation-history",
      "/admin/customers",
      "/admin/revenue",
      "/admin/analytics",
      "/admin/schedule",
      "/admin/design",
      "/admin/emails",
      "/admin/settings",
      "/admin/other",
    ])
    .safeParse(input);
  if (!parsed.success) return;
  const { recordAdminSession } = await import("@/lib/analytics/audit-server");
  await recordAdminSession(id, "navigation", parsed.data);
}
