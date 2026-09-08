import "server-only";
import nodemailer from "nodemailer";
import { gmailAppPassword, gmailUser } from "./env";

/**
 * Gmail SMTP로 이메일 발송.
 *
 * Resend는 도메인 인증 전엔 계정 소유자 본인 주소로만 보낼 수 있어
 * 손님에게는 메일이 안 갔다. 도메인을 새로 사지 않고 무료로 임의의
 * 수신자에게 보내려고 사장님 Gmail 계정(앱 비밀번호)으로 대신 보낸다.
 * SMTP라 REST처럼 fetch 한 번으로 끝나지 않아, 여기서만 nodemailer를 쓴다.
 */
export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser(), pass: gmailAppPassword() },
  });

  await transporter.sendMail({ from: gmailUser(), to, subject, text });
}
