"use client";

/**
 * 브라우저(클라이언트 컴포넌트)에서 쓰는 Supabase 클라이언트.
 * anon 키만 사용하므로 RLS 정책이 그대로 적용된다 — 손님 눈에 보이는
 * 것 이상은 절대 이 클라이언트로 가져올 수 없다.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabaseAnonKey, supabaseUrl } from "./env";

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
}
