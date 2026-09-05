import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { solapiApiKey, solapiApiSecret, solapiSenderPhone } from "./env";

/**
 * 솔라피(Solapi) 문자 발송.
 *
 * SDK 없이 REST API를 직접 호출한다 — HMAC 서명 하나만 계산하면 되는
 * 요청이라 SDK를 더할 이유가 없다(이 저장소는 Supabase 클라이언트도
 * 직접 감싸 쓰지, 불필요한 추상화 계층을 얹지 않는다).
 * 참고: https://developers.solapi.com/references/authentication/api-key
 */
function authHeader(): string {
  const date = new Date().toISOString();
  const salt = randomBytes(32).toString("hex");
  const signature = createHmac("sha256", solapiApiSecret())
    .update(date + salt)
    .digest("hex");
  return `HMAC-SHA256 apiKey=${solapiApiKey()}, date=${date}, salt=${salt}, signature=${signature}`;
}

export async function sendSms({
  to,
  text,
}: {
  to: string;
  text: string;
}): Promise<void> {
  const response = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      message: { to, from: solapiSenderPhone(), text },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`솔라피 발송 실패 (${response.status}) ${body}`.trim());
  }
}
