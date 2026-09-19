/**
 * 촬영 기록표 양식(관리자가 직접 편집하는 "행" 구성)의 타입과 기본값.
 * DB 접근이 없는 순수 타입/상수/함수만 있어서 "server-only"를 붙이지
 * 않는다 — 에디터(클라이언트 컴포넌트)와 렌더링(서버 컴포넌트) 양쪽이
 * 이 파일 하나를 그대로 가져다 쓴다.
 */

export type RecordSheetFieldRow = {
  id: string;
  type: "field";
  label: string;
  /** 라벨 아래 작게 표시할 보조 설명(이메일 칸의 안내문 등). */
  sublabel?: string;
  /** RecordSheetTags(build-data.ts)의 키, 또는 "option:옵션이름"
   * 형태로 상품 문항에서 내가 만든 유료 옵션 하나를 직접 가리킨다
   * (resolve.ts의 resolveTagValue 참고). */
  tag: string;
  tag2?: string;
  prefix?: string;
  prefix2?: string;
  suffix?: string;
  align?: "left" | "center" | "right";
  /** true면 라벨 칸이 2칸을 차지하고 값은 1칸만 쓴다("기본촬영",
   * "계" 행처럼 라벨이 길고 값은 금액 하나뿐인 행에 쓴다). */
  wideLabel?: boolean;
};

export type RecordSheetRow =
  | { id: string; type: "title"; text: string }
  | { id: string; type: "section"; text: string }
  | RecordSheetFieldRow
  | { id: string; type: "note"; text: string; align?: "left" | "center"; small?: boolean }
  | { id: string; type: "spacer" };

export type RecordSheetRowType = RecordSheetRow["type"];

export const RECORD_SHEET_ROW_TYPE_LABELS: Record<RecordSheetRowType, string> = {
  title: "제목",
  section: "구간 제목",
  field: "항목 (라벨 + 값)",
  note: "안내 문구",
  spacer: "빈 칸(간격)",
};

/** RecordSheetTags의 키 목록 — 에디터의 "값" 드롭다운에 고정 항목으로
 * 보여준다. 라벨은 화면에 보이는 한글 설명이다. */
export const FIXED_TAG_CATALOG: { key: string; label: string }[] = [
  { key: "성명", label: "성명" },
  { key: "생년월일", label: "생년월일" },
  { key: "성별", label: "성별(체크박스)" },
  { key: "연락처", label: "연락처" },
  { key: "이메일", label: "이메일" },
  { key: "신청자성명", label: "신청자 성명" },
  { key: "신청자생년월일", label: "신청자 생년월일" },
  { key: "신청자성별", label: "신청자 성별(체크박스)" },
  { key: "신청자연락처", label: "신청자 연락처" },
  { key: "신청자관계", label: "신청자와의 관계(체크박스)" },
  { key: "촬영일시", label: "촬영일시" },
  { key: "전달예정일", label: "완성본 전달예정일" },
  { key: "기본가", label: "기본가" },
  { key: "옵션1라벨", label: "옵션 슬롯1 이름(자동)" },
  { key: "옵션1금액", label: "옵션 슬롯1 금액(자동)" },
  { key: "옵션2라벨", label: "옵션 슬롯2 이름(자동)" },
  { key: "옵션2금액", label: "옵션 슬롯2 금액(자동)" },
  { key: "옵션3라벨", label: "옵션 슬롯3 이름(자동)" },
  { key: "옵션3금액", label: "옵션 슬롯3 금액(자동)" },
  { key: "옵션4라벨", label: "옵션 슬롯4 이름(자동)" },
  { key: "옵션4금액", label: "옵션 슬롯4 금액(자동)" },
  { key: "합계", label: "합계" },
  { key: "계좌", label: "입금계좌" },
  { key: "SNS동의", label: "SNS 게시 동의(체크박스)" },
];

export const OPTION_TAG_PREFIX = "option:";

/** 특정 유료 옵션(상품 문항편집에서 만든 옵션) 하나를 가리키는 태그. */
export function makeOptionTag(optionLabel: string): string {
  return `${OPTION_TAG_PREFIX}${optionLabel}`;
}

export function isOptionTag(tag: string): boolean {
  return tag.startsWith(OPTION_TAG_PREFIX);
}

export function optionTagLabel(tag: string): string {
  return tag.slice(OPTION_TAG_PREFIX.length);
}

let idSeq = 0;
export function newRowId(): string {
  idSeq += 1;
  return `row_${Date.now()}_${idSeq}`;
}

/** 지금까지 써오던 고정 레이아웃을 그대로 행으로 옮긴 기본값 —
 * record_sheet_template 테이블이 비어 있을 때(마이그레이션 직후 등)
 * 이 값으로 채워, 관리자가 손대기 전까지는 지금과 똑같이 보인다. */
export const DEFAULT_RECORD_SHEET_ROWS: RecordSheetRow[] = [
  { id: "title", type: "title", text: "푸르른 스튜디오 촬영 기록표" },
  { id: "r_name", type: "field", label: "성명*", tag: "성명" },
  {
    id: "r_birth",
    type: "field",
    label: "생년월일(8자리)*",
    tag: "생년월일",
    tag2: "성별",
  },
  { id: "r_phone", type: "field", label: "연락처*", tag: "연락처" },
  {
    id: "r_email",
    type: "field",
    label: "이메일*",
    sublabel: "(완성본을 전달받으실 이메일)",
    tag: "이메일",
  },
  { id: "r_app_name", type: "field", label: "신청자 성명", tag: "신청자성명" },
  {
    id: "r_app_birth",
    type: "field",
    label: "신청자 생년월일(8자리)",
    tag: "신청자생년월일",
    tag2: "신청자성별",
  },
  {
    id: "r_app_phone",
    type: "field",
    label: "신청자 연락처",
    tag: "신청자연락처",
  },
  {
    id: "r_app_relation",
    type: "field",
    label: "신청자와의 관계",
    tag: "신청자관계",
  },
  {
    id: "r_note1",
    type: "note",
    text: "*신청자란은 배우가 미성년자이거나 1명의 배우가 대표로 예약한 경우에만 작성합니다.",
    align: "left",
    small: true,
  },
  { id: "r_shoot", type: "field", label: "촬영일시*", tag: "촬영일시" },
  {
    id: "r_delivery",
    type: "field",
    label: "완성본 전달예정일*",
    tag: "전달예정일",
    suffix: " 이내",
    align: "right",
  },
  { id: "r_spacer1", type: "spacer" },
  { id: "r_section_price", type: "section", text: "상품 옵션 및 금액*" },
  {
    id: "r_base",
    type: "field",
    label: "기본촬영*",
    tag: "기본가",
    prefix: "₩",
    wideLabel: true,
  },
  {
    id: "r_opt1",
    type: "field",
    label: "추가옵션1",
    tag: "옵션1라벨",
    tag2: "옵션1금액",
    prefix2: "₩",
  },
  {
    id: "r_opt2",
    type: "field",
    label: "추가옵션2",
    tag: "옵션2라벨",
    tag2: "옵션2금액",
    prefix2: "₩",
  },
  {
    id: "r_opt3",
    type: "field",
    label: "추가옵션3",
    tag: "옵션3라벨",
    tag2: "옵션3금액",
    prefix2: "₩",
  },
  {
    id: "r_opt4",
    type: "field",
    label: "추가옵션4",
    tag: "옵션4라벨",
    tag2: "옵션4금액",
    prefix2: "₩",
  },
  {
    id: "r_total",
    type: "field",
    label: "계",
    tag: "합계",
    prefix: "₩",
    wideLabel: true,
  },
  { id: "r_account", type: "note", text: "*입금계좌: {계좌}", align: "left" },
  {
    id: "r_sns",
    type: "field",
    label: "완성본의 '푸르른 스튜디오'\n인스타그램 게시*",
    tag: "SNS동의",
  },
  {
    id: "r_confirm",
    type: "note",
    text: "위와 같이 촬영을 완료하였음을 확인합니다.",
    align: "center",
  },
  {
    id: "r_sign",
    type: "note",
    text: "20     .     .     .     (인)",
    align: "center",
  },
];

/** DB에 저장된 임의의 JSON을 신뢰하지 않고 검증한다 — 형식이 깨진
 * 행이 하나라도 있으면 전체를 거부한다(부분 렌더링보다 안전). */
export function parseRecordSheetRows(input: unknown): RecordSheetRow[] | null {
  if (!Array.isArray(input)) return null;
  const rows: RecordSheetRow[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const id = typeof r.id === "string" && r.id ? r.id : newRowId();

    if (r.type === "title" || r.type === "section") {
      if (typeof r.text !== "string") return null;
      rows.push({ id, type: r.type, text: r.text });
      continue;
    }

    if (r.type === "spacer") {
      rows.push({ id, type: "spacer" });
      continue;
    }

    if (r.type === "note") {
      if (typeof r.text !== "string") return null;
      rows.push({
        id,
        type: "note",
        text: r.text,
        align: r.align === "center" ? "center" : "left",
        small: Boolean(r.small),
      });
      continue;
    }

    if (r.type === "field") {
      if (typeof r.label !== "string" || typeof r.tag !== "string") return null;
      rows.push({
        id,
        type: "field",
        label: r.label,
        sublabel: typeof r.sublabel === "string" ? r.sublabel : undefined,
        tag: r.tag,
        tag2: typeof r.tag2 === "string" && r.tag2 ? r.tag2 : undefined,
        prefix: typeof r.prefix === "string" ? r.prefix : undefined,
        prefix2: typeof r.prefix2 === "string" ? r.prefix2 : undefined,
        suffix: typeof r.suffix === "string" ? r.suffix : undefined,
        align:
          r.align === "left" || r.align === "center" || r.align === "right"
            ? r.align
            : undefined,
        wideLabel: Boolean(r.wideLabel),
      });
      continue;
    }

    return null;
  }

  return rows;
}
