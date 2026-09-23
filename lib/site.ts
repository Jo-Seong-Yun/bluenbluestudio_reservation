/**
 * 사이트 기본 정보.
 *
 * 임시 위치다. Phase 7에서 `settings` 테이블과 관리자 설정 화면이 생기면
 * 소개 문구·연락처처럼 자주 바뀌는 값은 DB로 옮기고, 여기에는
 * 배포마다 고정인 값만 남긴다.
 */
export const SITE = {
  name: "푸르른 스튜디오",
  nameEn: "Blue n Blue Studio",
  description:
    "사진과 영상을 담는 푸르른 스튜디오입니다. 원하는 날짜와 시간을 선택하여 예약해 주시기 바랍니다.",
} as const;

/**
 * 손글씨 로고(public/brand-logo.png)의 실제 가로세로 픽셀 크기. public/
 * 경로로 쓰는 next/image는 정적 임포트와 달리 크기를 자동으로 알아내지
 * 못해 직접 넘겨야 한다 — 관리자 헤더·예약 화면 양쪽에서 이 값을
 * 그대로 쓴다.
 */
export const BRAND_LOGO = {
  src: "/brand-logo.png",
  width: 1080,
  height: 554,
} as const;
