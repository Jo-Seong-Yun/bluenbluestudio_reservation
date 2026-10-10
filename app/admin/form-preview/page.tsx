import { requireAdmin } from "@/lib/supabase/auth";
import { FormPreviewClient } from "./preview-client";
export default async function FormPreviewPage() {
  await requireAdmin();
  return <FormPreviewClient />;
}
