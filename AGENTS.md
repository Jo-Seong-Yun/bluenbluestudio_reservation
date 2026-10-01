<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 푸르른 스튜디오 예약 사이트 — 작업 전 필독

작업을 시작하기 전에 반드시 **`docs/CODEX_HANDOFF.md`** 를 처음부터 끝까지 읽는다.
개발 역사, 시스템 구조, DB 스키마, 모든 파이프라인, 사장님(사용자)과 일하는 규칙이 담겨 있다.

핵심 규칙 요약:

- 사장님께는 항상 한국어 존댓말로 답한다. 애매한 요구는 구현 전에 반드시 확인받는다.
- 요청이 고객/관리자 이용 편의성을 떨어뜨릴 우려가 있으면 먼저 말한다.
- 시간 계산은 `lib/time.ts`(저장 UTC, 계산·표시 KST). 이중예약은 DB EXCLUDE 제약이 최종 방어선.
- DB 변경은 `supabase/migrations/`에 SQL 추가 + `lib/supabase/database.types.ts` 수동 수정.
  사장님이 Supabase SQL Editor에서 실행했다고 확인하기 전에는 그 컬럼을 쓰는 코드를 master에 머지하지 않는다.
- 완료 전 `npm run typecheck`, `npm run lint`, `npm test` 통과. UI는 `app/dev-preview-*` 임시 페이지로
  화면을 확인하고 커밋 전에 지운다.
- master 푸시 = Vercel 자동 배포(실제 서비스 반영).
