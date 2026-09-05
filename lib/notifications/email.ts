import "server-only";
import { resendApiKey, resendFromEmail } from "./env";

/** Resend 이메일 발송. REST API를 직접 호출한다 (SMS와 같은 이유). */
export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey()}`,
    },
    body: JSON.stringify({ from: resendFromEmail(), to, subject, text }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend 발송 실패 (${response.status}) ${body}`.trim());
  }
}
