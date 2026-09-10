import type { Database } from "@/lib/supabase/database.types";

/**
 * DB에 안 닿는(=서버 전용이 아닌) 문항 관련 조각들만 여기 둔다 —
 * 클라이언트 컴포넌트(신청서 폼, 문항편집 화면)도 그대로 import할 수
 * 있어야 해서다. DB 조회가 필요한 것(loadActiveCustomFields 등)은
 * custom-fields.ts(server-only)에 남는다.
 */
export type CustomField = Database["public"]["Tables"]["custom_fields"]["Row"];

/**
 * 이름/연락처/이메일/생년월일은 다른 문항과 달리 답변이
 * reservation_answers가 아니라 reservations 테이블의 전용 컬럼으로
 * 간다(전화번호 조회·나이 계산·알림 발송이 그 컬럼을 그대로 쓰기
 * 때문) — 그래서 이 답변 종류(type)는 문항편집에서 바꿀 수 없게 잠가
 * 둔다(field-modal.tsx). 상품을 만들 때 기본으로 5개가 생기고
 * (app/admin/actions.ts의 DEFAULT_CUSTOM_FIELDS), 성별도 그중
 * 하나지만 그런 의존이 없는 단순 표시용 정보라 여기 안 넣는다 —
 * 성별은 처음부터 문항이 만들어져 있긴 해도 다른 일반 문항처럼 답변
 * 종류까지 자유롭게 바꿀 수 있다(기본은 single_choice, 옵션 남성/여성).
 *
 * "gender" 타입 자체는 여전히 존재한다 — 예전에 만들어진 문항이나
 * 관리자가 직접 "성별"을 답변 종류로 고른 문항은 지금도 이 타입으로
 * 저장되고, reservations.gender 컬럼으로 그대로 라우팅된다
 * (lib/booking/custom-fields.ts의 extractReservationFormData). 다만
 * 그 라우팅은 SPECIAL_FIELD_TYPES가 아니라 field.type을 직접 비교해서
 * 하므로, 여기서 빼도 그 동작에는 영향이 없다 — 이 목록은 오직
 * "답변 종류를 못 바꾸게 잠글지"만 결정한다.
 */
export const SPECIAL_FIELD_TYPES = [
  "name",
  "phone",
  "email",
  "birth_date",
] as const;
export type SpecialFieldType = (typeof SPECIAL_FIELD_TYPES)[number];

/**
 * 이름·연락처는 신청서에서 아예 빠지면 손님을 특정하거나 연락할 방법이
 * 없어져 예약 자체가 무의미해진다 — 그래서 이 둘만 지울 수 없다.
 * 이메일·성별·생년월일은 나머지 SPECIAL_FIELD_TYPES처럼 자유롭게 지울
 * 수 있다. delete-field-button.tsx(UI)와 app/admin/actions.ts의
 * deleteCustomField(서버, 실제 강제) 둘 다 이 목록을 쓴다.
 */
export const LOCKED_FIELD_TYPES = ["name", "phone"] as const;

export const FIELD_TYPE_LABELS: Record<string, string> = {
  short_text: "단답형",
  long_text: "장문형",
  single_choice: "객관식 (하나 선택)",
  multi_choice: "체크박스 (여러 개 선택)",
  checkbox: "단일 체크박스 (동의/확인용)",
  name: "이름",
  phone: "연락처",
  email: "이메일",
  gender: "성별",
  birth_date: "생년월일",
};

/** 문항 하나의 FormData 필드 이름. 폼과 액션이 같은 규칙을 써야 한다. */
export function fieldFormName(fieldId: string): string {
  return `custom_${fieldId}`;
}
