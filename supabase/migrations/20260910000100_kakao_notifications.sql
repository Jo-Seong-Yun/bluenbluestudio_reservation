-- Phase 8 확장: 카카오 알림톡(솔라피 경유) 채널 추가.
--
-- 알림톡은 카카오톡 채널 개설 + 발신 프로필(pfId) 등록 + 템플릿 사전 심사가
-- 끝나야 실제로 보낼 수 있다(문서: lib/notifications/kakao.ts). 심사 전에는
-- 관련 환경변수가 비어 있으므로 notify.ts가 자동으로 SMS만 쓰고, 심사가
-- 끝나 환경변수를 채우면 코드 변경 없이 알림톡으로 전환된다 — 그래서 이
-- 마이그레이션은 미리 적용해 둬도 지금 당장의 발송 동작을 바꾸지 않는다.

alter table notification_logs
  drop constraint notification_logs_channel_check;

alter table notification_logs
  add constraint notification_logs_channel_check
  check (channel in ('sms', 'email', 'kakao'));
