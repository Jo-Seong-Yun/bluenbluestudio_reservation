-- 로컬 개발용 예시 데이터. `supabase db reset` 시 자동 적용된다.
-- 실제 운영 데이터는 관리자 화면(Phase 4)에서 입력한다. 이 파일은
-- 화면 없이도 개발을 진행할 수 있도록 하기 위한 것이다.

insert into products
  (name, slug, duration_min, buffer_after_min, price, summary, description, is_published, sort_order)
values
  (
    '프로필 촬영',
    'profile',
    60,
    0,
    80000,
    '한 사람을 위한 기본 프로필 촬영',
    E'## 이런 분께 추천해요\n\n- 이력서·포트폴리오용 사진이 필요한 분\n- 프로필 사진을 새로 바꾸고 싶은 분\n\n## 포함 사항\n\n- 촬영 60분\n- 보정본 5장',
    true,
    1
  ),
  (
    '제품 촬영',
    'product',
    120,
    30,
    150000,
    '소품·제품 촬영, 정리 시간 포함',
    E'## 이런 분께 추천해요\n\n- 쇼핑몰 상세페이지용 제품 사진\n- SNS 홍보용 이미지\n\n## 포함 사항\n\n- 촬영 120분\n- 배경지 3종 중 선택\n- 보정본 10장',
    true,
    2
  ),
  (
    '준비 중인 상품',
    'coming-soon',
    60,
    0,
    0,
    '아직 공개 전입니다',
    '내용을 준비하고 있어요.',
    false,
    3
  );

-- 평일 저녁, 주말 종일 — 학생 사장님의 기본 시간표 예시
insert into weekly_hours (weekday, open_time, close_time) values
  (1, '18:00', '21:00'), -- 월
  (2, '18:00', '21:00'), -- 화
  (3, '18:00', '21:00'), -- 수
  (4, '18:00', '21:00'), -- 목
  (5, '18:00', '21:00'), -- 금
  (6, '10:00', '20:00'), -- 토
  (0, '10:00', '18:00'); -- 일

insert into date_overrides (date, is_closed, reason) values
  (current_date + interval '10 day', true, '예시: 시험 기간 휴무');

insert into blocks (period, reason) values
  (tstzrange(now() + interval '2 day', now() + interval '2 day' + interval '2 hour'), '예시: 개인 일정');

update settings set
  bank_account = '카카오뱅크 000-0000-0000 (예금주: 조성윤)',
  studio_intro = '사진과 영상을 담는 푸르른 스튜디오입니다.',
  notice = '예약 후 24시간 이내 입금이 확인되지 않으면 예약이 자동 취소될 수 있습니다.'
where id = 1;
