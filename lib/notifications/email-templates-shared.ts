/**
 * 이메일 문구 편집(관리자 설정 화면)에서 서버·클라이언트 양쪽이 같이
 * 써야 하는 조각만 여기 둔다 — DB 조회가 필요한 것(email-templates.ts,
 * server-only)과 분리한다. custom-fields.ts/custom-fields-shared.ts와
 * 같은 이유의 같은 구조다.
 */

export const EMAIL_TEMPLATE_PURPOSES = [
  "customer_requested",
  "customer_confirmed",
  "customer_cancelled",
  "customer_reminder",
  "admin_new_request",
] as const;

export type EmailTemplatePurpose = (typeof EMAIL_TEMPLATE_PURPOSES)[number];

export type EmailTemplate = { subject: string; body: string };

export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplatePurpose, string> = {
  customer_requested: "손님 — 예약 접수",
  customer_confirmed: "손님 — 예약 확정",
  customer_cancelled: "손님 — 예약 취소",
  customer_reminder: "손님 — 촬영 전날 리마인드",
  admin_new_request: "사장님 — 새 예약 신청",
};

/** 각 문구에서 쓸 수 있는 변수와 설명. 에딧 화면에 안내로 보여준다. */
export const EMAIL_TEMPLATE_VARIABLES: Record<
  EmailTemplatePurpose,
  { key: string; description: string }[]
> = {
  customer_requested: [
    { key: "이름", description: "손님 이름" },
    { key: "상품명", description: "촬영 상품 이름" },
    {
      key: "후보목록",
      description: "손님이 낸 희망 시간 1~3개를 줄바꿈으로 나열",
    },
    { key: "예약번호", description: "예약 조회용 번호" },
    { key: "계좌", description: "설정에 입력해둔 입금 계좌" },
    { key: "공지", description: "설정에 입력해둔 예약 공지" },
  ],
  customer_confirmed: [
    { key: "이름", description: "손님 이름" },
    { key: "상품명", description: "촬영 상품 이름" },
    { key: "일시", description: "확정된 촬영 일시" },
    { key: "예약번호", description: "예약 조회용 번호" },
  ],
  customer_cancelled: [
    { key: "이름", description: "손님 이름" },
    { key: "상품명", description: "촬영 상품 이름" },
    { key: "일시", description: "촬영 일시(확정 전 취소면 빈 값)" },
    { key: "예약번호", description: "예약 조회용 번호" },
  ],
  customer_reminder: [
    { key: "이름", description: "손님 이름" },
    { key: "상품명", description: "촬영 상품 이름" },
    { key: "일시", description: "내일 촬영 일시" },
    { key: "예약번호", description: "예약 조회용 번호" },
  ],
  admin_new_request: [
    { key: "이름", description: "신청한 손님 이름" },
    { key: "연락처", description: "신청한 손님 연락처" },
    { key: "상품명", description: "촬영 상품 이름" },
    {
      key: "후보목록",
      description: "손님이 낸 희망 시간 1~3개를 줄바꿈으로 나열",
    },
    { key: "예약번호", description: "예약 조회용 번호" },
  ],
};

/**
 * 미리보기용 예시 값. 관리자가 문구를 고칠 때 실제로 어떻게 보일지
 * 바로 확인할 수 있게 쓴다 — 실제 발송과는 무관하다.
 */
export const EMAIL_TEMPLATE_PREVIEW_VALUES: Record<
  EmailTemplatePurpose,
  Record<string, string>
> = {
  customer_requested: {
    이름: "김철수",
    상품명: "프로필 촬영",
    후보목록: "1지망: 9월 12일(토) 10:00\n2지망: 9월 13일(일) 14:00",
    예약번호: "AB12CD34",
    계좌: "카카오뱅크 3333-01-1234567 홍길동",
    공지: "촬영 10분 전까지 도착해 주시기 바랍니다.",
  },
  customer_confirmed: {
    이름: "김철수",
    상품명: "프로필 촬영",
    일시: "9월 12일(토) 10:00",
    예약번호: "AB12CD34",
  },
  customer_cancelled: {
    이름: "김철수",
    상품명: "프로필 촬영",
    일시: "9월 12일(토) 10:00",
    예약번호: "AB12CD34",
  },
  customer_reminder: {
    이름: "김철수",
    상품명: "프로필 촬영",
    일시: "9월 12일(토) 10:00",
    예약번호: "AB12CD34",
  },
  admin_new_request: {
    이름: "김철수",
    연락처: "01012345678",
    상품명: "프로필 촬영",
    후보목록: "1지망: 9월 12일(토) 10:00\n2지망: 9월 13일(일) 14:00",
    예약번호: "AB12CD34",
  },
};

/**
 * 하드코딩된 기본 문구 — DB에 행이 없을 때의 안전망(email-templates.ts)
 * 이자, 관리자 화면의 "기본값으로 되돌리기" 버튼이 쓰는 값이다.
 * supabase/migrations의 email_templates 시드와 내용을 맞춰뒀다 —
 * 둘 중 하나만 고치면 서로 어긋나니 같이 고쳐야 한다.
 */
export const DEFAULT_EMAIL_TEMPLATES: Record<
  EmailTemplatePurpose,
  EmailTemplate
> = {
  customer_requested: {
    subject: "[푸르른 스튜디오] 예약 신청이 접수되었습니다",
    body: `{{상품명}} 예약 신청이 접수되었습니다.

희망 시간(이 중 하나로 확정됩니다):
{{후보목록}}

예약번호: {{예약번호}}

예약 내역은 입력하신 연락처로 조회할 수 있으며, 아래 계좌로 예약금을 입금하시면 예약이 최종 확정됩니다.

입금 계좌: {{계좌}}

{{공지}}`,
  },
  customer_confirmed: {
    subject: "[푸르른 스튜디오] 예약이 확정되었습니다",
    body: `{{이름}}님, 예약이 확정되었습니다.

상품: {{상품명}}
일시: {{일시}}
예약번호: {{예약번호}}

촬영 전날 다시 안내드리겠습니다.`,
  },
  customer_cancelled: {
    subject: "[푸르른 스튜디오] 예약이 취소되었습니다",
    body: `{{이름}}님, 예약이 취소되었습니다.

상품: {{상품명}}
일시: {{일시}}
예약번호: {{예약번호}}`,
  },
  customer_reminder: {
    subject: "[푸르른 스튜디오] 내일 촬영 예약 안내",
    body: `{{이름}}님, 내일 촬영 예약 안내입니다.

상품: {{상품명}}
일시: {{일시}}
예약번호: {{예약번호}}

늦지 않게 와주시기 바랍니다.`,
  },
  admin_new_request: {
    subject: "[푸르른 스튜디오] 새 예약 신청이 들어왔습니다",
    body: `새 예약 신청이 들어왔습니다.

상품: {{상품명}}
희망 시간:
{{후보목록}}

신청자: {{이름}} ({{연락처}})
예약번호: {{예약번호}}`,
  },
};

/**
 * {{변수명}} 자리표시자를 값으로 채운다. 모르는 변수(오타 등)는 그대로
 * 남겨서, 조용히 사라지는 대신 관리자가 화면에서 바로 알아챌 수 있게
 * 한다.
 */
export function renderEmailTemplate(
  text: string,
  variables: Record<string, string>,
): string {
  return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key: string) =>
    key in variables ? variables[key] : match,
  );
}
