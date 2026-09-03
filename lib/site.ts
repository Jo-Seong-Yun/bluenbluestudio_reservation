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
    "사진과 영상을 담는 푸르른 스튜디오입니다. 원하는 날짜와 시간을 골라 예약하세요.",
} as const;
