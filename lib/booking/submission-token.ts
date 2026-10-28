import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseSecretKey } from "@/lib/supabase/env";
import type { ApplicationDefinition } from "./submission";
function signature(payload: string) {
  return createHmac("sha256", supabaseSecretKey())
    .update(`application-v1:${payload}`)
    .digest();
}
export function signApplication(
  definition: Omit<ApplicationDefinition, "renderedAt"> & {
    renderedAt?: number;
  },
) {
  const payload = Buffer.from(
    JSON.stringify({
      ...definition,
      renderedAt: definition.renderedAt ?? Date.now(),
    }),
  ).toString("base64url");
  return `${payload}.${signature(payload).toString("base64url")}`;
}
export function readApplication(
  token: unknown,
  productId: string,
): ApplicationDefinition | null {
  try {
    if (typeof token !== "string" || token.length > 1500000) return null;
    const [payload, sig, ...rest] = token.split(".");
    if (rest.length || !sig) return null;
    const expected = signature(payload),
      received = Buffer.from(sig, "base64url");
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    )
      return null;
    const result = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as ApplicationDefinition;
    if (
      result.version !== 1 ||
      result.product.id !== productId ||
      !Number.isFinite(result.renderedAt) ||
      Date.now() - result.renderedAt > 86400000 ||
      result.renderedAt > Date.now() + 60000
    )
      return null;
    return result;
  } catch {
    return null;
  }
}
