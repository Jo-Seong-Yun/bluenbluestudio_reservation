# 푸르른 스튜디오 예약 사이트

사진/영상 촬영 스튜디오 '푸르른 스튜디오'의 온라인 예약 사이트.
손님이 비어 있는 시간을 직접 보고 예약을 잡는다.

개발 계획은 [`docs/ROADMAP.md`](docs/ROADMAP.md)에 있다.

## 기술 스택

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS 4**
- **Supabase** (Postgres / Auth / Storage) — Phase 2부터
- **Vitest** — 시간 계산 로직 테스트
- 배포: **Vercel**

## 시작하기

```bash
npm install
cp .env.example .env.local   # 값은 Supabase 프로젝트에서 가져온다 — docs/SUPABASE_SETUP.md 참고
npm run dev
```

http://localhost:3000

Supabase를 아직 연결하지 않았다면 [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md)를 먼저 따라간다.

## 명령어

| 명령                 | 설명             |
| -------------------- | ---------------- |
| `npm run dev`        | 개발 서버        |
| `npm run build`      | 프로덕션 빌드    |
| `npm test`           | 테스트 실행      |
| `npm run test:watch` | 테스트 감시 모드 |
| `npm run typecheck`  | 타입 검사        |
| `npm run lint`       | ESLint           |
| `npm run format`     | Prettier 포맷    |

## 폴더 구조

```
app/                     화면 (App Router)
lib/
  time.ts                ★ 시간대 규칙. 모든 날짜/시간 계산의 기준
  availability/
    slots.ts               ★ 예약 가능 시간 계산 (순수 함수)
    range.ts               Postgres tstzrange 파싱·겹침 판정
    load.ts                DB에서 읽어 slots.ts에 넘기는 서버 함수
  supabase/
    client.ts             브라우저용 클라이언트 (anon 키, RLS 적용)
    server.ts              서버 컴포넌트용 클라이언트 (로그인 세션 유지)
    admin.ts                service role 클라이언트 — 서버 전용, RLS 우회
    database.types.ts      테이블 타입 (db:types로 재생성)
supabase/
  migrations/             스키마 SQL. 파일명 순서대로 적용된다
  seed.sql                로컬 개발용 예시 데이터
docs/                    기획 문서
proxy.ts                 로그인 세션 갱신 (Next 16에서 middleware의 새 이름).
                         /admin 경로에만 걸려 있다
```

## 배포 리전

`vercel.json`에서 함수 실행 리전을 `icn1`(서울)로 고정했다. Vercel Hobby
플랜은 기본값이 미국 리전(`iad1`)이라, 손님·관리자 요청이 서버를 거쳐
서울 리전의 Supabase까지 태평양을 두 번(왕복) 건너가게 된다. 매 요청마다
겪는 지연이라 캐시로는 안 가려지고, 인증 확인처럼 서버가 Supabase를
불러야 하는 동작일수록 체감이 크다.

## 규칙

**비밀 키 세 층.**

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`, 옛 이름 anon)
  — 브라우저에 노출돼도 되는 키. RLS가 실제 방어선
- `SUPABASE_SECRET_KEY` (`sb_secret_...`, 옛 이름 service_role)
  — RLS를 완전히 우회한다. `lib/supabase/admin.ts`에서만, 서버 코드에서만 쓴다.
  `"server-only"` 임포트가 실수로 클라이언트에 섞이는 걸 막아준다
- 관리자 권한 = "로그인한 사용자". 그래서 Supabase Auth의 이메일 회원가입을
  반드시 꺼둬야 한다 (`docs/SUPABASE_SETUP.md` 3번)

**이중예약은 DB가 막는다, 앱이 아니라.**
`reservations` 테이블에 `EXCLUDE USING gist` 제약이 있다. 같은 시간대에
`requested`/`confirmed` 예약 두 개를 동시에 넣으면 두 번째가 거절된다.
"조회 후 저장" 방식의 경쟁 조건을 애초에 차단한다.

**예약 가능 시간은 서버에서만 계산한다.**
운영시간·휴무·차단 테이블은 관리자 전용 RLS라 손님 키로는 못 읽는다.
차단 사유("시험", "개인 일정")가 손님에게 새지 않도록, 서버가 대신 읽고
`lib/availability/load.ts`가 **계산 결과만** 내려준다.

**시간은 전부 `lib/time.ts`를 거친다.**
저장은 UTC, 계산과 표시는 한국 시간(KST)이다.
Vercel 서버는 UTC로 도니까 `new Date()`의 날짜를 그대로 믿으면 밤 9시 이후 하루가 어긋난다.
날짜가 필요하면 `kstToday()`, `kstDateString()`을 쓴다.

**비밀 키는 커밋하지 않는다.**
`.env*`는 `.gitignore`에 있다.
`SUPABASE_SECRET_KEY`는 서버에서만 쓰고 `NEXT_PUBLIC_` 접두사를 붙이지 않는다.

## 진행 상황

- [x] Phase 1 — 프로젝트 기반
- [x] Phase 2 — 데이터 모델 (Supabase 프로젝트 연결은 아직. `docs/SUPABASE_SETUP.md` 참고)
- [x] Phase 3 — 슬롯 계산 엔진 (순수 함수·테스트 완료. 라이브 DB 연동은 미검증)
- [x] Phase 4 — 관리자: 로그인 + 상품 관리 (라이브 로그인은 미검증)
- [ ] Phase 5 — 관리자: 스케줄 관리
- [ ] Phase 6 — 손님 예약 플로우 (MVP)
