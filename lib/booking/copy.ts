import { parseFormPages, formPages } from "./form-pages";
import {
  SNS_CONSENT_FIELD_LABEL,
  type CustomField,
} from "./custom-fields-shared";
export const COPY_SECTIONS = [
  [
    "상품설명",
    {
      detailIntro: "촬영 상품의 구성과 가격을 확인합니다.",
      priceNote: "추가옵션 선택 시 최종 금액이 달라질 수 있습니다.",
      detailButton: "촬영 일정 선택하기 →",
      detailButtonNote: "날짜 확인만으로 예약이 확정되지는 않습니다.",
      detailDescriptionTitle: "상세 내용",
      detailDeliveryTitle: "결과물 안내",
      processTitle: "촬영 신청 절차",
      process1Title: "희망 시간 3개 선택",
      process1Body: "원하는 촬영 날짜와 시간을 선택합니다.",
      process2Title: "신청서 작성",
      process2Body: "촬영에 필요한 내용을 작성합니다.",
      process3Title: "스튜디오의 일정 안내",
      process3Body: "희망 시간 중 하나로 촬영 일정을 확정합니다.",
    },
  ],
  [
    "일정선택",
    {
      timesTitle: "희망하는 촬영 일시를 선택하세요",
      timesIntro: "가능한 날짜와 시간 중 희망 시간 3개를 선택합니다.",
      timesGuide:
        "날짜를 선택하면 시간 선택으로, 희망 시간 3개를 채우면 선택 내역으로 이동합니다.",
      timesEmpty: "달력에서 날짜를 먼저 선택해 주십시오.",
      timesButton: "신청서 작성하기 →",
      timesNote: "서로 다른 날짜의 시간도 선택할 수 있습니다.",
    },
  ],
  [
    "신청서",
    {
      actorTitle: "촬영하실 배우님의 정보를 알려주세요",
      actorIntro: "실제 촬영하시는 분을 기준으로 작성해주세요",
      contactTitle: "예약 안내를 받을 연락처를 알려주세요",
      contactIntro:
        "일정 확정 및 촬영 관련 안내를 받으실 연락처를 작성해주세요",
      requestTitle: "촬영에 필요한 내용을 알려주세요",
      requestIntro: "추가 선택과 요청사항을 확인합니다.",
      consentTitle: "마지막으로 동의 내용을 확인해 주세요",
      consentIntro: "",
    },
  ],
  [
    "최종 확인",
    {
      reviewTitle: "작성하신 신청서를 확인해주세요",
      reviewIntro: "",
      reviewButton: "예약 신청하기",
    },
  ],
  [
    "신청 완료",
    {
      successTitle: "예약 신청이 접수되었습니다",
      successIntro: "희망 시간을 확인한 뒤 촬영 일정을 안내드립니다.",
      successCodeNote: "예약번호는 예약조회에 사용할 수 있습니다.",
      successTimesTitle: "신청한 희망 시간",
      successTimesNote: "곧 푸르른 스튜디오가 일정을 확정해드립니다.",
      successButton: "내 예약 확인하기 →",
      successButtonNote: "예약번호로 신청 내역을 확인할 수 있습니다.",
      nextTitle: "이제 이렇게 진행됩니다",
      next1Title: "스튜디오에서 희망 시간을 확인합니다",
      next1Body: "신청한 시간 중 가능한 일정을 확인합니다.",
      next2Title: "확정된 촬영 일정을 안내드립니다",
      next2Body: "안내받은 일정과 예약 상태를 확인합니다.",
      nextNote: "예약 조회에서 진행 상태를 확인할 수 있습니다.",
    },
  ],
] as const;
export type BookingCopy = Record<string, string>;
export const DEFAULT_COPY: BookingCopy = Object.assign(
  {},
  ...COPY_SECTIONS.map(([, values]) => values),
);
export const OPTIONAL_COPY_KEYS = new Set(["consentIntro", "reviewIntro"]);
export const COPY_LABELS: Record<string, string> = {
  detailIntro: "상품 소개",
  priceNote: "가격 안내",
  processTitle: "신청 절차 제목",
  process1Title: "절차 1 제목",
  process1Body: "절차 1 설명",
  process2Title: "절차 2 제목",
  process2Body: "절차 2 설명",
  process3Title: "절차 3 제목",
  process3Body: "절차 3 설명",
  detailButton: "일정 선택 버튼 문구",
  detailButtonNote: "일정 선택 버튼 아래 안내",
  detailDescriptionTitle: "상세 설명 영역 제목",
  detailDeliveryTitle: "결과물 영역 제목",
  timesTitle: "일정 선택 제목",
  timesIntro: "일정 선택 설명",
  timesNote: "일정 선택 보조 안내",
  timesGuide: "일정 선택 방법 안내",
  timesEmpty: "날짜 선택 전 안내",
  timesButton: "신청서 이동 버튼 문구",
  reviewTitle: "최종 확인 제목",
  reviewButton: "예약 신청 버튼 문구",
  successTitle: "접수 완료 제목",
  successIntro: "접수 완료 설명",
  nextTitle: "다음 절차 제목",
  next1Title: "다음 절차 1 제목",
  next1Body: "다음 절차 1 설명",
  next2Title: "다음 절차 2 제목",
  next2Body: "다음 절차 2 설명",
  nextNote: "다음 절차 보조 안내",
  successCodeNote: "예약번호 안내",
  successTimesTitle: "희망 시간 영역 제목",
  successTimesNote: "희망 시간 보조 안내",
  successButton: "예약 조회 버튼 문구",
  successButtonNote: "예약 조회 버튼 아래 안내",
  consentIntro: "동의 확인 설명 (비우면 숨김)",
  reviewIntro: "최종 확인 설명 (비우면 숨김)",
};
const LEGACY_DEFAULTS: Record<string, string> = {
  processTitle: "촬영 신청은 이렇게 진행됩니다",
  timesTitle: "언제 촬영하고 싶으세요?",
  actorTitle: "촬영하실 배우 정보를 알려주세요",
  actorIntro: "촬영하는 분을 기준으로 입력합니다.",
  contactIntro: "일정 확정과 촬영 안내에 사용합니다.",
  consentIntro: "각 항목을 확인하고 직접 선택합니다.",
  reviewTitle: "신청 내용을 확인합니다",
  reviewIntro: "입력한 정보와 희망 시간을 확인한 후 신청합니다.",
};
export function resolveCopy(raw: unknown): BookingCopy {
  const result = { ...DEFAULT_COPY };
  if (raw && typeof raw === "object")
    for (const key of Object.keys(DEFAULT_COPY)) {
      const value = (raw as BookingCopy)[key];
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === LEGACY_DEFAULTS[key]) continue;
        if (trimmed || OPTIONAL_COPY_KEYS.has(key))
          result[key] = trimmed.slice(0, 1000);
      }
    }
  if (raw && typeof raw === "object")
    for (const [key, value] of Object.entries(raw))
      if (
        /^group:[a-zA-Z0-9-]{1,80}$/.test(key) &&
        /^\d{1,3}$/.test(String(value))
      )
        result[key] = String(value);
  if (raw && typeof raw === "object")
    for (const [key, value] of Object.entries(raw))
      if (
        /^placeholder:[a-zA-Z0-9-]{1,80}$/.test(key) &&
        typeof value === "string"
      )
        result[key] = value.slice(0, 200);
  if (raw && typeof raw === "object") {
    const pages = parseFormPages((raw as BookingCopy).formPages);
    if (pages) result.formPages = JSON.stringify(pages);
    for (const [key, value] of Object.entries(raw))
      if (
        /^order:[a-zA-Z0-9-]{1,80}$/.test(key) &&
        /^\d{1,6}$/.test(String(value))
      )
        result[key] = String(value);
  }
  return result;
}
export function productCopy(style: unknown, id: string): BookingCopy {
  return resolveCopy(
    (style as { productCopies?: Record<string, unknown> } | null)
      ?.productCopies?.[id],
  );
}
export function fieldGroup(field: CustomField, copy?: BookingCopy): number {
  const assigned = copy?.[`group:${field.id}`];
  const pages = copy ? formPages(copy) : null;
  if (
    assigned &&
    /^\d{1,3}$/.test(assigned) &&
    (!pages || pages.some((page) => page.id === Number(assigned)))
  )
    return Number(assigned);
  const defaultGroup = legacyFieldGroup(field);
  return !pages || pages.some((page) => page.id === defaultGroup)
    ? defaultGroup
    : pages[0].id;
}
function legacyFieldGroup(field: CustomField): number {
  if (
    field.label === SNS_CONSENT_FIELD_LABEL ||
    /SNS|개인정보|동의|약관/i.test(field.label)
  )
    return 3;
  if (
    /신청자|신청인|관계|본인/.test(field.label) ||
    ["phone", "email"].includes(field.type)
  )
    return 1;
  if (
    ["name", "gender", "birth_date"].includes(field.type) ||
    /성별|생년월일/.test(field.label)
  )
    return 0;
  return 2;
}
export const GROUP_COPY_KEYS = [
  ["actorTitle", "actorIntro"],
  ["contactTitle", "contactIntro"],
  ["requestTitle", "requestIntro"],
  ["consentTitle", "consentIntro"],
] as const;
