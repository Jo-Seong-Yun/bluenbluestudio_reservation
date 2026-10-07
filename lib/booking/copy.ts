import type { CustomField } from "./custom-fields-shared";
export const COPY_SECTIONS = [
  [
    "상품설명",
    {
      detailIntro: "촬영 상품의 구성과 가격을 확인합니다.",
      priceNote: "추가옵션 선택 시 최종 금액이 달라질 수 있습니다.",
      processTitle: "촬영 신청은 이렇게 진행됩니다",
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
      timesTitle: "언제 촬영하고 싶으세요?",
      timesIntro: "가능한 날짜와 시간 중 희망 시간 3개를 선택합니다.",
      timesNote: "서로 다른 날짜의 시간도 선택할 수 있습니다.",
    },
  ],
  [
    "신청서",
    {
      actorTitle: "촬영하실 배우 정보를 알려주세요",
      actorIntro: "촬영하는 분을 기준으로 입력합니다.",
      contactTitle: "예약 안내를 받을 연락처를 알려주세요",
      contactIntro: "일정 확정과 촬영 안내에 사용합니다.",
      requestTitle: "촬영에 필요한 내용을 알려주세요",
      requestIntro: "추가 선택과 요청사항을 확인합니다.",
      consentTitle: "마지막으로 동의 내용을 확인해 주세요",
      consentIntro: "각 항목을 확인하고 직접 선택합니다.",
    },
  ],
  [
    "최종 확인",
    {
      reviewTitle: "신청 내용을 확인합니다",
      reviewIntro: "입력한 정보와 희망 시간을 확인한 후 신청합니다.",
    },
  ],
  [
    "신청 완료",
    {
      successTitle: "예약 신청이 접수되었습니다",
      successIntro: "희망 시간을 확인한 뒤 촬영 일정을 안내드립니다.",
      nextTitle: "이제 이렇게 진행됩니다",
      next1Title: "스튜디오에서 희망 시간을 확인합니다",
      next1Body: "신청한 시간 중 가능한 일정을 확인합니다.",
      next2Title: "확정된 촬영 일정을 안내드립니다",
      next2Body: "안내받은 일정과 예약 상태를 확인합니다.",
    },
  ],
] as const;
export type BookingCopy = Record<string, string>;
export const DEFAULT_COPY: BookingCopy = Object.assign(
  {},
  ...COPY_SECTIONS.map(([, values]) => values),
);
export function resolveCopy(raw: unknown): BookingCopy {
  const result = { ...DEFAULT_COPY };
  if (raw && typeof raw === "object")
    for (const key of Object.keys(DEFAULT_COPY)) {
      const value = (raw as BookingCopy)[key];
      if (typeof value === "string" && value.trim())
        result[key] = value.trim().slice(0, 1000);
    }
  if (raw && typeof raw === "object")
    for (const [key, value] of Object.entries(raw))
      if (
        /^group:[a-zA-Z0-9-]{1,80}$/.test(key) &&
        ["0", "1", "2", "3"].includes(String(value))
      )
        result[key] = String(value);
  if (raw && typeof raw === "object")
    for (const [key, value] of Object.entries(raw))
      if (
        /^placeholder:[a-zA-Z0-9-]{1,80}$/.test(key) &&
        typeof value === "string"
      )
        result[key] = value.slice(0, 200);
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
  if (assigned && ["0", "1", "2", "3"].includes(assigned))
    return Number(assigned);
  if (/SNS|개인정보|동의|약관/i.test(field.label)) return 3;
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
