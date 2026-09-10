import "server-only";
import { authHeader } from "./sms";
import { solapiSenderPhone } from "./env";

/**
 * 카카오 알림톡(솔라피 경유) 발송.
 *
 * 알림톡은 사전 심사를 받은 고정 문구에 변수만 채워 보내는 방식이라
 * templates.ts의 자유 문구를 그대로 못 쓴다 — 대신 목적별로 변수 이름과
 * 값의 맵을 넘긴다(예: `{ "#{상품명}": "프로필 촬영" }`). 실제 변수 이름은
 * 카카오 심사를 통과한 템플릿 문구에 맞춰야 하므로, 심사 결과에 따라
 * templates.ts의 kakaoVariables 쪽만 고치면 된다.
 *
 * `disableSms: false`로 두면 알림톡이 실패했을 때(카카오톡 미설치·차단
 * 등) 솔라피가 자동으로 문자로 대체 발송해준다 — 그래서 notify.ts는
 * 별도 SMS 재시도 로직을 두지 않는다. 대체 발송용 문구가 필요해 fallback
 * 텍스트를 함께 받는다.
 *
 * ⚠️ 실제 pfId·templateId·요청 형식은 솔라피 콘솔에서 알림톡 채널을
 * 연동하고 템플릿 심사를 받은 뒤 https://developers.solapi.com 문서로
 * 다시 한번 맞춰봐야 한다 — 이 환경에는 심사받은 실제 템플릿이 없어
 * 실제 발송 테스트는 못 해봤다(sms.ts/email.ts와 같은 처지).
 */
export async function sendKakaoAlimtalk({
  to,
  pfId,
  templateId,
  variables,
  fallbackText,
}: {
  to: string;
  pfId: string;
  templateId: string;
  variables: Record<string, string>;
  /** 알림톡 발송이 막혔을 때 솔라피가 대신 보낼 문자 문구. */
  fallbackText: string;
}): Promise<void> {
  const response = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      message: {
        to,
        from: solapiSenderPhone(),
        text: fallbackText,
        kakaoOptions: {
          pfId,
          templateId,
          variables,
          disableSms: false,
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`솔라피 알림톡 발송 실패 (${response.status}) ${body}`.trim());
  }
}
