import type { Database } from "@/lib/supabase/database.types";

/**
 * DB에 안 닿는(=서버 전용이 아닌) 문항 관련 조각들만 여기 둔다 —
 * 클라이언트 컴포넌트(신청서 폼, 문항편집 화면)도 그대로 import할 수
 * 있어야 해서다. DB 조회가 필요한 것(loadActiveCustomFields 등)은
 * custom-fields.ts(server-only)에 남는다.
 */
export type CustomField = Database["public"]["Tables"]["custom_fields"]["Row"];

/**
 * 이름/연락처/이메일/성별/생년월일은 다른 문항과 달리 답변이
 * reservation_answers가 아니라 reservations 테이블의 전용 컬럼으로
 * 간다(전화번호 조회·나이 계산·알림 발송이 그 컬럼을 그대로 쓰기
 * 때문). 상품을 만들 때 기본으로 5개가 생기고(app/admin/actions.ts의
 * DEFAULT_CUSTOM_FIELDS), 관리자가 문항편집에서 자유롭게 라벨을
 * 바꾸거나 지울 수 있다 — 지우면 그 상품 신청서는 그 항목을 안 받는다.
 */
export const SPECIAL_FIELD_TYPES = [
  "name",
  "phone",
  "email",
  "gender",
  "birth_date",
] as const;
export type SpecialFieldType = (typeof SPECIAL_FIELD_TYPES)[number];

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
