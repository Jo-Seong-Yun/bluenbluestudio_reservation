-- 통계 화면에서 "직전 확인 대비 변동치"를 빨간 글씨로 보여주는 기능용.
-- 통계 화면을 열 때마다 지금 시점을 여기 기록해두고, 다음에 열 때 이
-- 시점 이후 값과 비교한다(Gmail/Slack의 "마지막으로 읽은 시점" 배지와
-- 같은 방식). 한 번도 연 적 없으면 null — 그때는 비교 기준이 없어
-- 변동치를 보여주지 않는다.
alter table settings
  add column analytics_last_seen_at timestamptz;
