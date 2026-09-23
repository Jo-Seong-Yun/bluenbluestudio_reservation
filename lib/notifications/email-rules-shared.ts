/**
 * 이메일 규칙 편집(관리자 설정 화면)에서 서버·클라이언트 양쪽이 같이
 * 써야 하는 조각만 여기 둔다 — DB 조회가 필요한 것(email-rules.ts,
 * server-only)과 분리한다. custom-fields.ts/custom-fields-shared.ts와
 * 같은 이유의 같은 구조다.
 *
 * 예전엔 이메일 "종류"가 코드에 6개로 고정돼 있었지만, 이제는 관리자가
 * 규칙(이름·트리거 조건·수신자·제목·본문)을 화면에서 자유롭게 추가·
 * 수정·삭제한다. 트리거는 실제로 코드가 이메일을 보낼 수 있는 지점
 * (예약 접수/일정확정/입금확인/완료/노쇼/취소/일정변경/관리자 신규알림)
 * 더하기, 촬영일 기준 며칠 전/후까지 지원한다 — 후자는 매일 도는
 * 크론이 훑어 발송한다.
 *
 * 예약 상태(reservations.status)는 "확정" 한 단계가 아니라
 * "일정확정"(시간만 잡힘, 입금 전)과 "입금확인/예약확정"(예약금 확인
 * 완료)으로 나뉜다(app/admin/(dashboard)/reservations/status-buttons.tsx)
 * — on_schedule_confirmed/on_payment_confirmed가 각각에 대응한다.
 */

export const EMAIL_TRIGGER_TYPES = [
  "on_requested",
  "on_schedule_confirmed",
  "on_payment_confirmed",
  "on_completed",
  "on_no_show",
  "on_cancelled",
  "on_rescheduled",
  "on_admin_new_request",
  "days_before_shoot",
  "days_after_shoot",
] as const;

export type EmailTriggerType = (typeof EMAIL_TRIGGER_TYPES)[number];

export const EMAIL_TRIGGER_LABELS: Record<EmailTriggerType, string> = {
  on_requested: "예약 접수 시",
  on_schedule_confirmed: "일정확정 시",
  on_payment_confirmed: "입금확인/예약확정 시",
  on_completed: "완료 처리 시",
  on_no_show: "노쇼 처리 시",
  on_cancelled: "예약 취소 시",
  on_rescheduled: "예약 일정 변경 시",
  on_admin_new_request: "새 예약 신청 시",
  days_before_shoot: "촬영 며칠 전",
  days_after_shoot: "촬영 며칠 후",
};

/** 이 트리거들만 촬영일 기준 날짜 오프셋(day_offset)이 필요하다. */
export const DAY_OFFSET_TRIGGER_TYPES: ReadonlySet<EmailTriggerType> = new Set([
  "days_before_shoot",
  "days_after_shoot",
]);

export const EMAIL_RECIPIENTS = ["customer", "admin"] as const;
export type EmailRecipient = (typeof EMAIL_RECIPIENTS)[number];

export const EMAIL_RECIPIENT_LABELS: Record<EmailRecipient, string> = {
  customer: "손님",
  admin: "사장님",
};

/** 받는 사람 목록을 "손님·사장님"처럼 화면에 보여줄 글자로 — 순서는 EMAIL_RECIPIENTS 기준. */
export function formatRecipients(recipients: readonly EmailRecipient[]): string {
  return EMAIL_RECIPIENTS.filter((r) => recipients.includes(r))
    .map((r) => EMAIL_RECIPIENT_LABELS[r])
    .join("·");
}

/**
 * 규칙의 받는 사람들을 실제 이메일 주소로 바꾼다. 주소가 없는 쪽(손님이
 * 이메일을 안 적었거나 사장님 알림 주소가 비어있음)은 빼고, 손님과
 * 사장님 주소가 같으면(사장님이 직접 테스트 예약을 한 경우 등) 한 번만
 * 보낸다.
 */
export function ruleRecipientAddresses(
  recipients: readonly EmailRecipient[],
  emails: { customerEmail?: string | null; adminEmail?: string | null },
): string[] {
  const addresses = recipients
    .map((r) => (r === "admin" ? emails.adminEmail : emails.customerEmail))
    .filter((to): to is string => Boolean(to));
  return [...new Set(addresses)];
}

export type EmailRule = {
  id: string;
  name: string;
  enabled: boolean;
  /** 비어있지 않은 받는 사람 목록(손님/사장님 중복 선택 가능). */
  recipients: EmailRecipient[];
  triggerType: EmailTriggerType;
  /** days_before_shoot/days_after_shoot 트리거에서만 쓰는 날짜 수. */
  dayOffset: number | null;
  /** null이면 전체 상품에 적용. */
  productId: string | null;
  subject: string;
  body: string;
  ctaText: string | null;
  ctaUrl: string | null;
};

/**
 * 모든 이메일 종류에 공통으로 삽입 가능한 변수. 예전엔 종류별로 쓸 수
 * 있는 변수가 달랐지만, 이제는 하나로 통합해 어느 규칙에든 자유롭게
 * 넣을 수 있다 — 그 발송 시점에 실제 값이 없는 변수(예: 접수 알림에
 * {{촬영장소}})를 넣어도 발송이 막히지 않고 그냥 빈 문자열로 채워질
 * 뿐이다.
 */
export const EMAIL_VARIABLES: { key: string; description: string }[] = [
  { key: "이름", description: "손님 이름" },
  { key: "연락처", description: "손님 연락처 (관리자 신규알림에서만 값이 채워짐)" },
  { key: "상품명", description: "촬영 상품 이름" },
  { key: "일시", description: "확정된 촬영 일시 (확정 전이면 빈 값)" },
  {
    key: "촬영장소",
    description: "예약관리에서 관리자가 입력한 촬영 장소 (안 넣었으면 빈 값)",
  },
  { key: "예약번호", description: "예약 조회용 번호" },
  { key: "계좌", description: "설정에 입력해둔 입금 계좌 (접수 시에만 값이 채워짐)" },
  { key: "공지", description: "설정에 입력해둔 예약 공지 (접수 시에만 값이 채워짐)" },
  {
    key: "후보목록",
    description: "손님이 낸 희망 시간 1~3개 나열 (접수·관리자 신규알림에서만 값이 채워짐)",
  },
  { key: "기존일시", description: "변경 전 촬영 일시 (일정 변경에서만 값이 채워짐)" },
  { key: "변경일시", description: "변경된 촬영 일시 (일정 변경에서만 값이 채워짐)" },
  { key: "취소사유", description: "취소 시 관리자가 입력한 사유 (취소 시에만 값이 채워짐)" },
];

/** 미리보기용 예시 값. 모든 변수를 항상 다 채워서 보여준다. */
export const EMAIL_VARIABLE_PREVIEW_VALUES: Record<string, string> = {
  이름: "김철수",
  연락처: "01012345678",
  상품명: "프로필 촬영",
  일시: "9월 12일(토) 10:00",
  촬영장소: "서울 중랑구 동일로116길 54 지하1층 언컷스튜디오",
  예약번호: "AB12CD34",
  계좌: "카카오뱅크 3333-01-1234567 홍길동",
  공지: "촬영 10분 전까지 도착해 주시기 바랍니다.",
  후보목록: "1지망: 9월 12일(토) 10:00\n2지망: 9월 13일(일) 14:00",
  기존일시: "9월 12일(토) 10:00",
  변경일시: "9월 13일(일) 14:00",
  취소사유: "고객 요청으로 취소",
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
