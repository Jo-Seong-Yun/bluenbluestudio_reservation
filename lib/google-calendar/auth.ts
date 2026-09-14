import "server-only";
import { createSign } from "node:crypto";
import {
  googleServiceAccountEmail,
  googleServiceAccountPrivateKey,
} from "@/lib/google-sheets/env";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/calendar";

/**
 * 스프레드시트 연동(lib/google-sheets/auth.ts)과 거의 같은 코드다 —
 * 같은 서비스 계정을 쓰지만 API마다 필요한 scope가 달라 토큰을
 * 따로 발급받는다(구글 OAuth 토큰은 발급 시점에 scope가 고정된다).
 * 토큰 캐시도 API별로 독립적으로 둔다.
 */
function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function fetchAccessToken(): Promise<{
  token: string;
  expiresAt: number;
}> {
  const email = googleServiceAccountEmail();
  const privateKey = googleServiceAccountPrivateKey();
  if (!email || !privateKey) {
    throw new Error("구글 서비스 계정 환경변수가 없습니다.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${claims}`;
  const signature = base64url(
    createSign("RSA-SHA256").update(signingInput).sign(privateKey),
  );
  const assertion = `${signingInput}.${signature}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`구글 토큰 발급 실패 (${response.status}) ${body}`.trim());
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  return { token: data.access_token, expiresAt: now + data.expires_in };
}

let cached: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - 60 > now) {
    return cached.token;
  }
  cached = await fetchAccessToken();
  return cached.token;
}
