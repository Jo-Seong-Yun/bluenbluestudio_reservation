import "server-only";
import { createSign } from "node:crypto";
import {
  googleServiceAccountEmail,
  googleServiceAccountPrivateKey,
} from "./env";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * 서비스 계정 JWT를 직접 서명해 Google OAuth 액세스 토큰을 받아온다
 * (RFC 7523 JWT Bearer 방식). googleapis 같은 무거운 SDK 없이, 이
 * 프로젝트가 솔라피 연동에서 이미 쓰던 것처럼 Node 내장 crypto + fetch
 * 조합만으로 처리한다.
 */
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

// 서버리스 인스턴스가 살아있는 동안(warm) 재사용 — 매 동기화마다 토큰을
// 새로 발급받을 필요는 없다. 만료 1분 전에는 새로 받는다.
let cached: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - 60 > now) {
    return cached.token;
  }
  cached = await fetchAccessToken();
  return cached.token;
}
