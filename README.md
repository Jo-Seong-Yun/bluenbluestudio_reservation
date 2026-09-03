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
cp .env.example .env.local   # 값은 Supabase 프로젝트에서 가져온다
npm run dev
```

http://localhost:3000

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
app/          화면 (App Router)
lib/          도메인 로직 — 시간 계산, 가용 슬롯, DB 접근
  time.ts     ★ 시간대 규칙. 모든 날짜/시간 계산의 기준
docs/         기획 문서
```

## 규칙

**시간은 전부 `lib/time.ts`를 거친다.**
저장은 UTC, 계산과 표시는 한국 시간(KST)이다.
Vercel 서버는 UTC로 도니까 `new Date()`의 날짜를 그대로 믿으면 밤 9시 이후 하루가 어긋난다.
날짜가 필요하면 `kstToday()`, `kstDateString()`을 쓴다.

**비밀 키는 커밋하지 않는다.**
`.env*`는 `.gitignore`에 있다.
`SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 쓰고 `NEXT_PUBLIC_` 접두사를 붙이지 않는다.

## 진행 상황

- [x] Phase 1 — 프로젝트 기반
- [ ] Phase 2 — 데이터 모델
- [ ] Phase 3 — 슬롯 계산 엔진
- [ ] Phase 4 — 관리자: 로그인 + 상품 관리
- [ ] Phase 5 — 관리자: 스케줄 관리
- [ ] Phase 6 — 손님 예약 플로우 (MVP)
