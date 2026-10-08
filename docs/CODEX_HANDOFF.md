# 푸르른 스튜디오 예약 사이트 — Codex 인수인계 개발 문서

> 작성일: 2026-10-01 (Claude Code → ChatGPT Codex 인수인계)
> 저장소: `Jo-Seong-Yun/bluenbluestudio_reservation` (예전 이름 `Jo-Seong-Yun/instagram` — GitHub가 자동 리다이렉트한다)
> 기준 커밋: master `9047563` (팀원 이메일 기능까지 반영된 상태)
>
> 이 문서는 **이 저장소에서 작업을 이어받는 AI 코딩 에이전트(Codex)** 가
> 사장님(사용자)의 개발 역사, 현재 시스템, 모든 파이프라인, 작업 방식을
> 한 번에 파악하도록 쓴 것이다. 작업을 시작하기 전에 **처음부터 끝까지
> 한 번 읽는 것**을 전제로 한다. 코드와 이 문서가 다르면 **코드가 정답**이다
> — 그때는 이 문서도 함께 고친다.

---

## 목차

0. [Codex에게 — 먼저 읽을 것 (프롬프트)](#0-codex에게--먼저-읽을-것-프롬프트)
1. [프로젝트 한눈에 보기](#1-프로젝트-한눈에-보기)
2. [사장님과 일하는 방식 (반드시 지킬 규칙)](#2-사장님과-일하는-방식-반드시-지킬-규칙)
3. [기술 스택 · 인프라 · 환경변수](#3-기술-스택--인프라--환경변수)
4. [저장소 구조 (파일 맵)](#4-저장소-구조-파일-맵)
5. [데이터 모델 (DB 스키마 · RPC · RLS · 제약)](#5-데이터-모델-db-스키마--rpc--rls--제약)
6. [핵심 도메인 규칙](#6-핵심-도메인-규칙)
7. [파이프라인 상세](#7-파이프라인-상세)
8. [화면별 기능 맵 (고객 / 관리자)](#8-화면별-기능-맵-고객--관리자)
9. [개발 역사 (날짜별)](#9-개발-역사-날짜별)
10. [최근 결정 · 되돌린 결정 (다시 하지 말 것)](#10-최근-결정--되돌린-결정-다시-하지-말-것)
11. [알려진 이슈 · 기술부채 · 남은 일](#11-알려진-이슈--기술부채--남은-일)
12. [개발 · 검증 · 배포 절차](#12-개발--검증--배포-절차)
13. [코드 작성 컨벤션](#13-코드-작성-컨벤션)
14. [Codex용 프롬프트 템플릿](#14-codex용-프롬프트-템플릿)

---

## 0. Codex에게 — 먼저 읽을 것 (프롬프트)

아래 블록은 Codex가 매 작업 세션을 시작할 때 따라야 할 지침이다. 사장님이
새 세션을 열 때 이 블록을 그대로 붙여넣어도 된다.

```text
너는 '푸르른 스튜디오' 예약 사이트(Next.js 16 + Supabase + Vercel)의 개발을
이어받은 엔지니어다. 저장소 루트의 docs/CODEX_HANDOFF.md를 먼저 끝까지 읽고
시작한다.

[대화 규칙]
- 사장님에게는 항상 한국어 존댓말(~습니다/~요 존대)로 답한다. 반말 금지.
- 애매한 요구는 추측해서 구현하지 말고 반드시 먼저 확인받는다.
  (사장님이 직접 지시한 규칙이다: "애매한 것은 반드시 내게 확인받을 것.")
- 사장님 요청이 고객/관리자의 이용 편의성을 떨어뜨린다고 판단되면,
  구현은 하되(또는 하기 전에) 그 우려와 대안을 분명히 말한다.
- "UI 먼저 보여줘"라고 하면 실제 기능 연결 없이 화면만 만들어 스크린샷으로
  보여주고, 확인을 받은 뒤 기능을 연결한다.
- 결과 보고는 짧게: 무엇을 바꿨는지, 어떻게 검증했는지, 검증 못 한 것은 무엇인지.

[개발 규칙]
- 이 Next.js는 16 버전이다. API/관례가 학습 데이터와 다를 수 있으니
  node_modules/next/dist/docs/ 의 해당 가이드를 먼저 확인한다.
  (middleware.ts가 아니라 proxy.ts, PageProps<"/route"> 전역 타입, 등)
- 모든 시간 계산은 lib/time.ts를 거친다 (저장 UTC, 계산/표시 KST).
- 이중예약은 DB EXCLUDE 제약이 최종 방어선이다. 앱 로직만 믿지 않는다.
- DB 스키마 변경은 supabase/migrations/에 SQL 파일을 추가하고,
  lib/supabase/database.types.ts를 손으로 맞춘다. 사장님이 Supabase
  SQL Editor에서 직접 실행한다. 새 컬럼을 읽는 코드는 사장님이
  "SQL 실행했다"고 확인하기 전까지 master에 머지하지 않는다
  (머지하면 프로덕션 쿼리가 깨진다).
- 작업 후 npm run typecheck / npm run lint / npm test 를 통과시킨다.
- UI 변경은 반드시 화면으로 확인한다. 로컬에는 DB 접속 정보가 없으므로
  app/dev-preview-xxx/page.tsx 임시 페이지에 예시 데이터를 넣어 띄우고
  Playwright로 스크린샷을 찍어 확인한 뒤, 커밋 전에 그 임시 페이지를 지운다.
- 커밋 메시지는 한국어로, "무엇을/왜"가 드러나게 쓴다.
- master에 푸시하면 Vercel이 자동 배포한다 = 곧바로 실제 손님에게 반영된다.
```

---

## 1. 프로젝트 한눈에 보기

| 항목        | 내용                                                                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 서비스      | 사진/영상 촬영 스튜디오 **'푸르른 스튜디오' (Blue n Blue Studio)** 의 온라인 예약 + 운영 관리 사이트                                                                 |
| 운영자      | 사장님 1인 (학업과 병행. 관리자 계정은 사장님 것 하나뿐)                                                                                                             |
| 핵심 흐름   | 손님이 상품을 고르고 **희망 시간 3개(후보)** 를 골라 신청 → 사장님이 그중 1개로 **일정확정** → 손님 입금 → **입금확인/예약확정** → 촬영 → **완료** → **결과물 전송** |
| 결제        | 온라인 결제 없음. 계좌이체(입금 계좌는 설정에서 관리)                                                                                                                |
| 알림        | 이메일(Gmail SMTP, 관리자가 규칙으로 자유 구성) + SMS/카카오 알림톡(솔라피, 선택)                                                                                    |
| 백업/연동   | 구글 스프레드시트(예약/고객DB 탭), 구글 캘린더(확정 일정) — 단방향 DB→구글                                                                                           |
| 관리자 기능 | 상품·문항, 예약관리(달력), 예약내역(표), 고객DB, 매출, 통계, 스케줄, 디자인, 이메일 규칙, 설정, 촬영 기록표 인쇄                                                     |
| 배포        | Vercel (함수 리전 `icn1` 서울), Supabase (서울 리전)                                                                                                                 |
| 규모        | 커밋 약 540개(2026-09-03 ~ 2026-10-01), 마이그레이션 66개, 유닛 테스트 229개                                                                                         |

### 설계 철학 (로드맵 0장에서 확정)

- **코드에 상수로 박히는 값을 최대한 줄인다.** 상품, 운영시간, 리드타임,
  취소 기한, 계좌번호, 안내 문구, 이메일 문구, 디자인까지 전부 DB에 두고
  관리자 화면에서 바꾼다. "값을 바꾸려고 배포하는 일"이 없어야 한다.
- 슬롯: 기본 **1시간 단위, 정각 시작**. 촬영 시간은 상품마다 지정.
- **당일 예약 불가**(최소 리드타임 1일, 설정으로 변경 가능).
- 부가 기능(알림·시트·캘린더·통계 기록)은 **best-effort** — 실패해도
  예약 흐름 자체는 절대 막지 않는다(throw 하지 않고 로그만 남긴다).

---

## 2. 사장님과 일하는 방식 (반드시 지킬 규칙)

이 섹션은 지난 한 달간 사장님이 반복해서 요구하거나 직접 지시한 사항이다.

### 2-1. 커뮤니케이션

1. **항상 한국어 존댓말.** 사장님이 명시적으로 "나에게는 반드시 존대할 것"이라고 했다.
2. **애매하면 확인받는다.** "애매한 것은 반드시 내게 확인받을 것." 선택지를
   2~3개로 정리해서(가능하면 권장안 표시) 물어본다. 예: 한글 자판에서 `ㅁ`만
   보내면 영문 `A` 키일 수 있으니 "A안을 고르신 것이 맞습니까?"라고 확인했다.
3. **이용 편의성 우려는 먼저 말한다.** 사장님이 "내가 말한 게 오히려 사용자
   편의성을 떨어뜨리는 것 같으면 말해줘"라고 했다. 실제로 상품 상세 설명을
   숨겼을 때 우려를 말했고, 사장님은 결국 원상복구했다.
4. **"UI 먼저 보여줘" = 화면만 먼저.** 기능 연결/배포 없이 스크린샷으로 시안을
   보여주고 승인 후 연결한다.
5. **사장님 표현을 그대로 쓴다.** 예: '동반인'이 아니라 **'팀원'**, '지망'이
   아니라 **'N번째'**, 사이트 문구는 **~합니다체**(해요체 금지).
6. **정직하게 보고한다.** 확인하지 못한 것(실제 DB/메일 수신/배포 결과)은
   "확인하지 못했다"고 말한다. 추측을 사실처럼 말하지 않는다
   (과거에 GCP 결제 원인을 단정했다가 사장님이 반박한 적이 있다).
7. 사장님이 "당장", "제대로" 같은 말을 쓰면 이전 시도가 실패했다는 뜻이다.
   같은 접근을 반복하지 말고 근본 원인을 찾는다(예: 표 행 클릭 — 셀 안 링크로
   세 번 실패한 뒤 `<tr onClick>` 방식으로 해결).

### 2-2. 작업 흐름 (지금까지의 방식)

1. 작업 브랜치에서 개발 → 커밋 → 푸시
2. `git merge --no-ff <작업브랜치>` 로 master에 머지 → master 푸시 → **Vercel 자동 배포**
3. 작업 브랜치로 돌아가 계속 작업
   (Claude 시절 작업 브랜치: `claude/doenun-sigan-meaning-msbu66`.
   Codex는 자신의 브랜치를 쓰되 같은 no-ff 머지 방식을 권장)
4. **DB 변경이 있으면**: 마이그레이션 SQL을 사장님께 코드블록으로 드리고,
   사장님이 Supabase → SQL Editor에서 실행 → "실행했다"는 답을 받은 뒤 master 머지.
5. PR은 사장님이 요청할 때만 만든다(지금까지는 PR 없이 직접 머지).

### 2-3. 사장님의 외부 서비스 상황 (2026-10-01 기준)

- **Google Cloud**: 프로젝트 `bluenbluestudio`, 무료 체험판 계정. 2026-10-01
  결제 수단(신한카드) 거부 메일을 받았다. 이 프로젝트는 **스프레드시트 API와
  캘린더 API(서비스 계정)** 만 쓴다. GCP가 정지되면 **시트 백업과 캘린더
  동기화만 멈추고** 예약·이메일(Gmail SMTP)·카카오/SMS는 영향 없다.
  BigQuery 등 불필요한 API가 켜져 있었다(코드는 안 씀). 청구 원인은 미확정.
- **Gmail**: 사장님 Gmail 계정(`bluenbluestudio@gmail.com`로 보임)의 앱 비밀번호로 발송.
- **솔라피(SMS/카카오)**: 카카오 알림톡 템플릿은 심사 전/미설정일 수 있다.
  SMS는 `SOLAPI_SMS_ENABLED=false`로 꺼둘 수 있다.
- **Microsoft Clarity**: `NEXT_PUBLIC_CLARITY_PROJECT_ID`가 있으면 스크립트 삽입.

---

## 3. 기술 스택 · 인프라 · 환경변수

### 3-1. 스택

| 영역             | 사용 기술                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 프레임워크       | **Next.js 16.3.4** (App Router, Turbopack, Server Components, Server Actions)                                              |
| 언어/런타임      | TypeScript 5, React 19.2                                                                                                   |
| 스타일           | Tailwind CSS 4 (`app/globals.css`에 디자인 토큰: `bg-surface`, `text-muted`, `border-border`, `bg-brand`, `text-boost` 등) |
| DB/인증/스토리지 | Supabase (Postgres + RLS, Auth 이메일/비밀번호, Storage `product-images` 공개 버킷)                                        |
| 리치 에디터      | Tiptap 3 (상품 상세 설명, 문항 설명, 이메일 본문 — 구글 독스급 툴바)                                                       |
| 이메일           | nodemailer + Gmail SMTP                                                                                                    |
| SMS/알림톡       | 솔라피 REST API                                                                                                            |
| 검증             | zod 4                                                                                                                      |
| 테스트           | Vitest 4 (`lib/**/*.test.ts`)                                                                                              |
| 기타             | sanitize-html(상세설명 정화), react-image-crop(이미지 자르기), motion(애니메이션), lucide-react(아이콘), hls.js(/ig 영상)  |
| 미사용 의존성    | `docxtemplater`, `pizzip` (예전 .docx 기록표용 — 지금 코드에서 import 없음. 정리 후보)                                     |

### 3-2. 인프라

- **Vercel**: master 푸시 → 자동 빌드/배포. `vercel.json`
  - `regions: ["icn1"]` — 서울 리전 고정(미국 기본 리전이면 Supabase 왕복 지연이 큼)
  - `crons: [{ path: "/api/cron/reminders", schedule: "0 10 * * *" }]` → **매일 UTC 10:00 = KST 19:00**
  - Vercel rate limit 때문에 자동 배포가 누락된 적이 있다 → 빈 커밋 대신 다음 커밋으로 재트리거하거나 Vercel 대시보드에서 Redeploy.
- **Supabase**: 서울 리전. Auth의 **이메일 회원가입은 꺼져 있어야 한다**
  (로그인한 사용자 = 관리자이기 때문. `docs/SUPABASE_SETUP.md` 3번).
- **Google Cloud 서비스 계정**: 같은 계정으로 Sheets/Calendar 둘 다 접근.
  스프레드시트와 캘린더를 그 서비스 계정 이메일에 공유해 둬야 한다.

### 3-3. 환경변수 전체 목록

`.env.example`에 일부만 있다(아래 ★표시는 `.env.example`에 **빠져 있는 것**).

| 변수                                                                                                         | 용도                               | 비고                                                                     |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`                                                                                   | Supabase URL                       | 필수                                                                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                                                                       | 공개 키(옛 anon)                   | 필수. RLS가 방어선                                                       |
| `SUPABASE_SECRET_KEY`                                                                                        | 비밀 키(옛 service_role)           | 서버 전용(`lib/supabase/admin.ts`), RLS 우회                             |
| `NEXT_PUBLIC_SITE_URL`                                                                                       | 이메일 내 절대 URL                 | 없으면 `VERCEL_PROJECT_PRODUCTION_URL`/`VERCEL_URL` 사용 (`lib/site.ts`) |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD`                                                                           | 이메일 발송                        | 앱 비밀번호 16자리                                                       |
| `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_PHONE`                                                 | SMS                                | 없으면 발송만 건너뛰고 로그에 실패                                       |
| `SOLAPI_SMS_ENABLED`                                                                                         | 정확히 `"false"`면 SMS(+알림톡) 끔 | 이메일은 무관                                                            |
| `SOLAPI_KAKAO_PF_ID`                                                                                         | 알림톡 발신 프로필                 | 선택                                                                     |
| `SOLAPI_KAKAO_TEMPLATE_CUSTOMER_REQUESTED` / `_CONFIRMED` / `_CANCELLED` / `_REMINDER` / `ADMIN_NEW_REQUEST` | 목적별 알림톡 템플릿 ID            | 없으면 그 목적만 SMS                                                     |
| ★`SOLAPI_KAKAO_TEMPLATE_CUSTOMER_RESCHEDULED`                                                                | 일정변경 알림톡                    | 코드엔 있음(`lib/notifications/env.ts`)                                  |
| `CRON_SECRET`                                                                                                | 크론 라우트 보호                   | Vercel이 `Authorization: Bearer` 로 자동 첨부                            |
| ★`GOOGLE_SHEETS_CLIENT_EMAIL`                                                                                | 서비스 계정 이메일                 | 시트·캘린더 공용                                                         |
| ★`GOOGLE_SHEETS_PRIVATE_KEY`                                                                                 | 서비스 계정 PEM                    | Vercel에선 `\n`이 리터럴로 저장됨 → 코드가 실제 줄바꿈으로 복원          |
| ★`GOOGLE_SHEETS_SPREADSHEET_ID`                                                                              | 백업 시트 ID                       | 셋 다 있어야 시트 동기화 동작                                            |
| ★`GOOGLE_CALENDAR_ID`                                                                                        | 동기화 대상 캘린더                 | 위 2개 + 이것                                                            |
| ★`NEXT_PUBLIC_CLARITY_PROJECT_ID`                                                                            | Microsoft Clarity                  | 선택                                                                     |

> 원칙: 값이 없다고 예약 흐름을 막지 않는다. `configured()`가 false면 그 기능만 조용히 건너뛴다.
> 환경변수 누락 시 화면은 `components/config-notice.tsx`로 "무엇이 빠졌는지"를 보여준다(500 대신).

---

## 4. 저장소 구조 (파일 맵)

```
AGENTS.md / CLAUDE.md      에이전트 지침(Next.js가 관리하는 블록 + 이 문서 안내)
README.md                  초기 README (일부 내용이 현재와 다름 — 11장 참고)
docs/
  ROADMAP.md               초기 개발 로드맵(Phase 0~10). 역사 자료
  SUPABASE_SETUP.md        Supabase 최초 연결 가이드
  CODEX_HANDOFF.md         ← 이 문서
proxy.ts                   (Next16의 middleware) /admin/* 에서만 동작. JWT 로컬 검증 후 헤더에 관리자 id 실음
vercel.json                리전 icn1 + 크론
supabase/
  migrations/              66개 SQL. 파일명 순서대로 적용
  setup.sql, seed.sql      초기 일괄 적용/예시 데이터(초기 6개 마이그레이션 기준)
public/
  brand-logo.png           손글씨 로고(1080x554)
  ig-logo-white.png        /ig 랜딩용 흰 로고

app/
  layout.tsx               루트 레이아웃(폰트, Clarity)
  page.tsx                 홈: 사이트명 + "예약하기" → /booking
  globals.css              디자인 토큰, 애니메이션, .text-boost(zoom 105.56%) 등
  ig/                      인스타 광고 랜딩(/ig) — 히어로 + 실제 상품 링크(?ref=landing)
  map/                     /map?q=주소 — 지도앱 선택·주소 복사(현재 이메일에서 링크 제거됨, 사실상 미사용)
  booking/
    layout.tsx             처리 중 오버레이 Provider
    page.tsx               ① 상품 목록(카드, 태그색 띠, 할인가, 썸네일 옵션)
    booking-list-view-tracker.tsx   목록 진입 기록
    [slug]/page.tsx        ② 상품 상세 + 희망 시간 3개 선택(BookingFlow)
    [slug]/product-view-tracker.tsx 상세 진입 기록
    [slug]/apply/page.tsx  ③ 신청서(ReservationForm) — 후보 재검증
    [slug]/apply/apply-view-tracker.tsx 신청서 진입 기록
    lookup/                예약 조회(예약번호+연락처 / 연락처만) + 손님 직접 취소
  api/cron/reminders/route.ts   매일 크론: 전날 SMS 리마인드 + 촬영 N일 전/후 이메일 규칙
  admin/
    login/                 로그인
    actions.ts             ★ 관리자 서버 액션 전부(약 3,500줄)
    (dashboard)/
      layout.tsx           AdminWorkspace(사이드바+헤더), requireAdmin, 처리 중 오버레이
      page.tsx             → /admin/products 리다이렉트
      products/            상품관리(그리드, 카드 메뉴, 편집기 3단, 문항 관리)
      reservations/        예약관리(달력 + 상세 패널 + 각종 모달/폼) ★
        [id]/record-sheet/print/  촬영 기록표 인쇄 화면
      reservation-history/ 예약내역(표 + 상세 패널)
      customers/           고객DB
      revenue/             매출관리
      analytics/           통계
      schedule/            스케줄관리(운영시간, 주간 차단, 휴무)
      design/              예약 페이지 디자인
      emails/              이메일 규칙
      settings/            설정(예약 규칙, 완료 화면 문구, 이메일 양식, 알림 연락처, 구글 소급, 기록표 양식)
  dev-preview-history4/    ⚠ 임시 미리보기 페이지가 실수로 커밋되어 배포됨 — 삭제 대상(11장)

components/
  booking-flow.tsx         달력 + 시간 선택 + 후보 3개 + 신청 버튼(손님)
  reservation-form.tsx     신청서·내용 확인(상품별 문항, 우측 예상 금액 요약)
  reservation-success-card.tsx 신청 완료 카드(예약번호, 후보, 계좌 복사)
  admin-calendar.tsx       관리자 월 달력(상태 점 색, 상품 태그색 칩)
  admin-nav.tsx            관리자 메뉴 10개
  team-recipients-field.tsx ★ 공통 "받는 사람(예약자+팀원)" 입력 영역 + recipientSummary
  rich-text-editor.tsx, tiptap/  Tiptap 에디터와 확장
  rich-text.tsx            저장된 HTML 렌더링
  ui.tsx                   Button, Field, ErrorText, inputClass 등 공용 UI
  submit-button.tsx        useFormStatus 기반 제출 버튼
  pending-overlay.tsx      "처리 중" 오버레이(Provider + useReportPending)
  money-input.tsx          ₩ 접두사 + 실시간 천단위 콤마 입력
  week-grid.tsx            스케줄 주간 차단 그리드
  time-select.tsx, field-description.tsx, loading-overlay.tsx, config-notice.tsx

lib/
  time.ts                  ★ 시간대 규칙(KST). kstToday, kstToInstant, kstDateString, addDays …
  availability/            ★ 슬롯 계산(slots.ts 순수함수 + load.ts DB 로딩 + range.ts tstzrange)
  booking/
    actions.ts             손님 서버 액션(슬롯 로드, 신청, 조회, 취소, 조회수 기록)
    code.ts                예약번호 생성(8자리, 헷갈리는 문자 제외)
    custom-fields*.ts      문항 렌더/추출/가격 계산(shared는 클라이언트·서버 공용)
    ref-cookie.ts          ?ref= 유입경로 쿠키(30일)
  notifications/
    notify.ts              ★ 알림 오케스트레이션(이메일 규칙·SMS·알림톡·로그)
    email.ts               Gmail SMTP 발송
    sms.ts, kakao.ts       솔라피
    email-rules.ts         규칙 DB 로딩(서버)
    email-rules-shared.ts  트리거/수신자/변수/렌더 공용 로직
    email-html.ts          HTML 메일 래핑(카드 레이아웃, 로고, 브랜드색, CTA, 요약 박스)
    templates.ts           SMS/알림톡 문구 + buildEmailVariables
    team-emails.ts         팀원 이메일 정규화/폼 파싱/기본 칸 수(공용)
    team-emails-server.ts  예약의 팀원 이메일 읽기(서버, 관리자 권한)
    log.ts                 notification_logs 기록
    admin-contact.ts       설정의 사장님 알림 이메일
    env.ts                 알림 관련 환경변수
  google-sheets/           시트 인증/API/동기화
  google-calendar/         캘린더 인증/API/동기화
  customers.ts / customers-db.ts   고객 요약 계산(순수) / customers 테이블 작업
  product-analytics.ts     통계 집계
  record-sheet/            촬영 기록표 양식 스키마·데이터 구성·태그 해석·저장소
  reservations/load-detail.ts  상세 패널용 예약 상세 로딩
  booking-style.ts         예약 페이지 디자인 값/템플릿
  product-tag-colors.ts    상품 태그 11색(구글 캘린더 색과 1:1)
  images.ts, storage-upload.ts, crop-image.ts  스토리지/이미지
  sanitize-description.ts  상세설명 HTML 정화
  age.ts                   만나이/한국나이/미성년자
  site.ts                  사이트명, siteBaseUrl, 로고 크기
  supabase/                클라이언트(client/server/admin), auth(requireAdmin), env, database.types.ts
  validation/              zod 스키마(product, reservation)
```

---

## 5. 데이터 모델 (DB 스키마 · RPC · RLS · 제약)

정식 타입: `lib/supabase/database.types.ts` (CLI 생성이 아니라 **손으로 맞춘 파일**. 컬럼을 추가하면 여기도 고친다).

### 5-1. 테이블

#### `products` — 촬영 상품

| 컬럼                                                   | 의미                                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `id`, `name`, `slug`(URL용, 비우면 이름으로 자동 생성) |                                                                                                                     |
| `duration_min`                                         | 촬영 시간(분). 슬롯 길이                                                                                            |
| `buffer_after_min`                                     | 촬영 후 정리 시간. 다음 슬롯을 밀어냄                                                                               |
| `price`, `sale_price`                                  | 정가 / 할인가(있으면 할인가로 판매, 할인율 배지)                                                                    |
| `max_people`                                           | 최대 인원(비우면 제한 없음). **팀원 이메일 기본 칸 수 = max_people - 1**                                            |
| `summary`                                              | **"요약"** — 상품 목록 카드에서 상품명 아래(최대 200자, 카드에 2줄)                                                 |
| `description`                                          | 상세 설명(Tiptap HTML, sanitize). 상품 상세 페이지 왼쪽 박스                                                        |
| `cover_image`                                          | 대표 이미지 경로(목록 썸네일 — 설정에서 썸네일 표시 켰을 때만)                                                      |
| `gallery`                                              | 예시 사진 경로 배열 — **현재 UI 없음(10장 참고). 데이터만 보존**                                                    |
| `is_published`                                         | 공개 여부                                                                                                           |
| `sort_order`                                           | 목록 순서                                                                                                           |
| `tag_color`                                            | 태그 색 키(11색, 구글 캘린더 colorId와 대응)                                                                        |
| `delivery_note`                                        | 완성본 전달예정일(촬영 기록표에 들어감, 예: "7일")                                                                  |
| (`page_summary`)                                       | 2026-09-30에 잠깐 만들었다 제거한 컬럼. 사장님이 SQL을 실행했다면 DB에만 빈 열로 남아 있을 수 있음 — 코드에서 안 씀 |

#### `reservations` — 예약 ★

| 컬럼                                                                                            | 의미                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code`                                                                                          | 손님용 예약번호(8자리, `3456789ABCDEFGHJKMNPQRSTUVWXY`)                                                                                                    |
| `product_id`                                                                                    | 상품                                                                                                                                                       |
| `status`                                                                                        | `requested`(접수) → `schedule_confirmed`(일정확정) → `payment_confirmed`(입금확인/예약확정) → `completed`(촬영 완료) / `no_show`(노쇼) / `cancelled`(취소) |
| `period` (tstzrange), `shoot_start`, `shoot_end`                                                | **확정 전(requested, 후보만 있음)에는 null.** 확정 시 고른 후보로 채움. period는 버퍼 포함 점유구간                                                        |
| `confirmed_candidate_rank`                                                                      | 확정할 때 고른 후보 순번(1~3)                                                                                                                              |
| `customer_name`, `customer_phone`(숫자만), `customer_email`                                     | 예약자                                                                                                                                                     |
| `team_emails` text[]                                                                            | **팀원 이메일**(2026-10-01 추가). 손님용 메일을 각자 따로 받음                                                                                             |
| `gender`, `birth_date`                                                                          | 신청서 특수 문항에서 추출                                                                                                                                  |
| `people_count`                                                                                  | 인원(수기 등록에서 입력)                                                                                                                                   |
| `memo`                                                                                          | 손님 요청사항 / `admin_memo` 사장님 메모(손님에게 안 보임)                                                                                                 |
| `shoot_location`                                                                                | 촬영 장소(이메일 `{{촬영장소}}`)                                                                                                                           |
| `estimated_amount`                                                                              | 신청 시점 예상 금액 스냅샷(기본가+유료옵션, 서버 재계산)                                                                                                   |
| `charged_amount`, `charged_amount_memo`, `charged_amount_breakdown` (jsonb `[{label, amount}]`) | 실제 지불액(항목별 편집, 합계가 charged_amount)                                                                                                            |
| `cost`, `cost_memo`                                                                             | 촬영 원가(대관료·소품·외주) — 매출 순이익 계산                                                                                                             |
| `cancel_reason`, `status_before_cancel`                                                         | 취소 사유 / 취소 직전 상태(휴지통 복원용)                                                                                                                  |
| `reminded_at`                                                                                   | 전날 SMS 리마인드 발송 시각(중복 방지)                                                                                                                     |
| `deliverable_sent_at`                                                                           | 결과물 전송 완료 시각(예약내역 표에서 "작업종료" 판정)                                                                                                     |
| `google_calendar_event_id`                                                                      | 캘린더 이벤트 id                                                                                                                                           |
| `ref`                                                                                           | 신청 시 유입경로(?ref=)                                                                                                                                    |

#### `reservation_candidates` — 희망 시간 후보(1~3번째)

`reservation_id`, `rank`(1~3), `shoot_start`, `shoot_end`, `period`. 확정 후에도 지우지 않고 이력으로 남김.
**후보는 시간을 잠그지 않는다**(다른 손님도 같은 시간을 후보로 낼 수 있다).

#### `custom_fields` — 상품별 신청서 문항

`product_id`(상품별), `label`, `type`, `options`(선택지), `option_prices`(선택지별 가격, 유료 옵션), `description`(Tiptap HTML), `required`, `active`, `sort_order`.

- `type`: `short_text`, `long_text`, `single_choice`, `multi_choice`, `checkbox`, 특수 타입 `name`, `phone`, `email`, `gender`, `birth_date`
- 특수 타입 답변은 `reservations`의 해당 컬럼으로도 들어간다(이름/연락처/이메일/성별/생년월일).
- 새 상품 생성 시 기본 문항 자동 생성(`DEFAULT_CUSTOM_FIELDS` in `app/admin/actions.ts`):
  이름(name, 필수), 연락처(phone, 필수), 이메일(email), 성별(single_choice 남성/여성, 필수), 생년월일(birth_date, 필수),
  - 촬영 기록표용: 신청인 이름/생년월일/성별/연락처/관계(보호자·팀원·기타), **SNS 업로드 동의(필수)**.
- 이름·연락처 문항은 삭제 잠금.

#### `reservation_answers` — 문항 답변

`reservation_id`, `field_id`, `value`(multi_choice는 JSON 배열 문자열, checkbox는 "true"/"false").

#### `customers` — 고객DB (연락처 기준 1인 1행)

`phone`(유니크), `name`, `gender`, `birth_date`, `email`, 그리고 수기 보정값 `first_visit_override`, `last_visit_override`, `visit_count_override`, `sns_consent_override`('동의'/'비동의'), `age_override`.

- 예약이 생기거나 바뀔 때마다 `upsertCustomerFromReservation`으로 갱신.
- **email은 한 번 채워지면 새 예약으로 덮어쓰지 않는다** → 관리자가 고친 주소가 최신일 수 있음(결과물 전송은 고객DB 이메일 우선).

#### `settings` — 단일 행(id=1) 사이트 설정

`slot_interval_min`(기본 60), `min_lead_days`(1), `max_advance_days`(60), `cancel_deadline_hours`(손님 직접 취소 마감),
`bank_account`, `notice`, `studio_intro`(홈 문구), `reservation_success_heading/message`(신청 완료 화면),
`admin_notify_phone/email`, `test_email`(규칙 테스트 발송 주소), `logo_url`, `brand_color`(이메일 브랜드),
`show_product_thumbnails`, `booking_style`(jsonb: accentColor, saleColor, textColor, textSize, cardRadius, cardSize),
`analytics_reset_at`(통계 리셋 시점), `analytics_last_seen_at`(직전 확인 시점).

#### `email_rules` — 이메일 규칙 ★

`name`, `enabled`, `recipients`(['customer','admin'] 다중), `trigger_type`, `day_offset`(촬영 N일 전/후용),
`product_id`(특정 상품에만, null=전체), `subject`, `body`(Tiptap HTML, `{{변수}}`),
`cta_text/cta_url` ~ `_3`(CTA 버튼 최대 3개), `sort_order`.

#### `notification_logs` — 발송 기록

`channel`(email/sms/kakao), `purpose`, `recipient`, `reservation_id`, `success`, `error`.

- `purpose` 예: `rule:<규칙id>`(규칙 메일), `rule-test:<id>`(테스트), `customer-email:<preset|custom>`(고객DB 단체메일), `customer_requested` 등(SMS/알림톡 목적)
- 예약 상세 패널의 **"발송 기록"** 섹션이 이 테이블을 보여준다.
- 크론의 중복 발송 방지(`hasRuleEmailBeenSent`)도 이 테이블로 판단(규칙×예약×주소, 성공 기준).

#### 스케줄 3층 구조

- `weekly_hours`: 요일별 운영시간(한 요일에 여러 구간 가능)
- `date_overrides`: 날짜 단위 휴무(`is_closed`) 또는 특별 운영시간, `reason`
- `blocks`: 사장님 개인 일정 차단(tstzrange) — 주간 캘린더에서 시간 칸 클릭 토글(`toggle_block_hour` RPC)
- 우선순위: **blocks > date_overrides > weekly_hours**

#### 통계

- `booking_list_views`(목록 진입), `product_views`(상세 진입), `apply_views`(신청서 진입): 각각 `ref`, `memo`, `viewed_at`
- 퍼널: 목록 → 상세 → 신청서 → 실제 예약(reservations.ref)

#### 기타

- `monthly_expenses`: 매출관리 지출(`month`, `date`, `label`, `amount`, `memo`, `kind`: `other`=기타지출 / `fixed`=고정지출)
- `record_sheet_template`: 촬영 기록표 행 구성 JSON(단일 행)
- `email_templates`: **레거시**(이메일 규칙 시스템 이전의 문구 테이블). 코드에서 안 씀

### 5-2. RPC (Postgres 함수)

| 함수                                      | 권한                                   | 역할                                                                                                                                                                                 |
| ----------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `create_reservation_with_candidates(...)` | anon, authenticated / SECURITY DEFINER | 예약 + 후보 3개를 한 트랜잭션으로 생성                                                                                                                                               |
| `lookup_reservation(p_code, p_phone)`     | anon / SECURITY DEFINER                | 예약번호+연락처 정확 일치 1건                                                                                                                                                        |
| `lookup_reservations_by_phone(p_phone)`   | anon / SECURITY DEFINER                | 연락처로 예약 목록(상품명 조인)                                                                                                                                                      |
| `cancel_reservation(p_code, p_phone)`     | anon / SECURITY DEFINER                | 손님 직접 취소. requested/schedule_confirmed/payment_confirmed만, `cancel_deadline_hours` 이전만. `status_before_cancel` 저장, `cancel_reason='손님이 예약 조회 화면에서 직접 취소'` |
| `toggle_block_hour(p_start, p_end)`       | authenticated                          | 차단 토글                                                                                                                                                                            |

### 5-3. RLS 요약

- **"로그인한 사용자 = 관리자"**: 관리 테이블은 `authenticated`만 읽기/쓰기.
- 공개(anon) 허용: 공개 상품 조회, 문항 조회, 설정 조회, 이메일 문구(레거시) 조회, 상품 이미지 조회,
  손님 예약 신청/답변 등록(RPC/정책), 조회 기록 insert.
- 운영시간·휴무·차단은 관리자 전용 → **예약 가능 시간은 서버가 대신 계산**해서 결과만 내려준다
  (차단 사유가 손님에게 새지 않게).
- RLS에 막히면 Supabase는 **에러 없이 0건 처리**하는 경우가 있다 → 삭제/수정 후 `count`나 반환 행으로 성공 여부를 확인한다(과거 버그: 통계 리셋/로그 삭제가 성공처럼 보였음).

### 5-4. 핵심 제약

```sql
-- 이중예약 방지 (20261017000200)
alter table reservations add constraint reservations_no_overlap
  exclude using gist (period with &&)
  where (status in ('requested', 'schedule_confirmed', 'payment_confirmed'));
```

- `period`가 null인 접수(후보만) 예약은 제약에 걸리지 않는다 → 확정 순간(`confirmReservationCandidate`)에 비로소 점유.
- 충돌 시 Postgres 에러 코드 **`23P01`** → 앱은 "그사이 다른 예약으로 확정되었습니다" 류 메시지로 변환.
- 예약번호 충돌 `23505` → 최대 3회 재생성.

### 5-5. 마이그레이션 목록 (적용 순서)

```
20260903000100_extensions            20260924000100_settings_show_thumbnails
20260903000200_products              20260925000100_product_sale_price
20260903000300_schedule              20260926000100_product_views
20260903000400_reservations          20260927000100_booking_list_views
20260903000500_settings              20260928000100_analytics_delete_policy
20260903000600_storage               20260929000100_analytics_reset_marker
20260903000700_cancel_reservation    20260930000100_reservation_success_copy
20260904000100_authenticated_can_reserve   20261001000100_analytics_insert_authenticated
20260904000200_lookup_by_phone       20261002000100_priced_options
20260904000300_delete_reservation    20261003000100_confirm_before_deposit_copy
20260904000400_toggle_block_hour     20261004000100_record_sheet_fields
20260905000100_manual_reservation    20261005000100_charged_amount_breakdown
20260906000100_notifications         20261006000100_record_sheet_template
20260906000200_reservation_email     20261006000200..400 privacy_consent_text(추가→상품별→삭제)
20260908000100_revenue_costs         20261007000100_monthly_expenses_date_memo
20260909000100_custom_fields         20261008000100_monthly_expenses_kind
20260909000200_custom_field_description_active  20261009000100_analytics_referral_and_apply_views
20260909000300_custom_fields_per_product        20261010000100_activity_log_memo
20260909000400_product_tag_color     20261011000100_activity_log_memo_update_policy
20260909000500_custom_fields_special_types      20261013000100_booking_style
20260910000100_kakao_notifications   20261014000100_email_templates_insert_policy
20260911000100_reservation_candidates           20261015000100_reservation_shoot_location
20260912000100_email_templates       20261016000100_email_rules
20260919000100_email_templates_rescheduled      20261017000100_reservation_status_split
20260920000100_reservation_amount_memos         20261017000200_reservation_status_split_constraints
20260921000100_customers             20261017000300_email_rules_status_triggers
20260922000100_calendar_event_id     20261018000100_email_rules_sort_order
20260923000100_product_tag_color_google         20261019000100_reservation_status_pipeline
                                     20261019000200_cancel_reservation_pipeline
                                     20261020000100_email_rules_multi_recipients
                                     20261021000100_settings_test_email
                                     20261023000100_email_cta_and_brand
                                     20261024000100_analytics_last_seen
                                     20261024000200_email_rules_deliverable_trigger
                                     20261025000100_deliverable_sent_at
                                     20261026000100_reservation_team_emails   ← 최신(실행 완료)
```

> 파일명 날짜는 실제 날짜가 아니라 순서용 번호다(일부는 미래 날짜처럼 보임). 새 파일은 **마지막 번호보다 큰 번호**로 만든다(예: `20261027000100_xxx.sql`).
> 상태 분할 마이그레이션(`..._status_split`)은 enum 값 추가 후 **별도 실행**이 필요했다(같은 트랜잭션에서 새 enum 값 사용 불가).

---

## 6. 핵심 도메인 규칙

### 6-1. 시간 (lib/time.ts)

- **저장은 UTC(timestamptz), 계산·표시는 KST(Asia/Seoul).**
- Vercel 서버는 UTC로 돈다 → `new Date()`의 날짜를 그대로 쓰면 밤 9시 이후 하루가 어긋난다.
- 날짜는 `"YYYY-MM-DD"` 문자열(`DateString`)로 다루고, `kstToday()`, `kstDateString()`, `kstTimeString()`, `kstToInstant(date, "HH:MM")`, `addDays`, `diffDays`, `monthGridDates` 등을 쓴다.

### 6-2. 예약 가능 시간 계산 (lib/availability)

`computeAvailableSlots(input)` — **순수 함수**(테스트 다수: `slots.test.ts`)

1. 그날 운영시간 결정: `date_overrides`가 `weekly_hours`를 덮어씀(휴무면 끝)
2. 리드타임/예약가능기간 밖이면 그날 전체 닫힘 (`min_lead_days`, `max_advance_days`)
3. 운영시간 안에서 `slot_interval_min` 간격으로 후보 시각 생성
4. 후보마다 점유구간(촬영시간+버퍼)을 그려 운영시간 밖·`blocks`·기존 예약과 겹치면 제외

- 기존 예약 = `requested/schedule_confirmed/payment_confirmed` 중 **period가 있는 것**
- `load.ts`: `loadAvailableSlots`, `isReservationTimeAvailable`, `loadAvailableDates`(달력에 가능일 표시), `pickDefaultBookingMonth`(이번 달 남은 가능일이 적으면 다음 달을 기본 표시)

### 6-3. 예약 상태 파이프라인

```
requested ──(후보 확정)──▶ schedule_confirmed ──▶ payment_confirmed ──▶ completed
   │  "접수"                 "일정확정"              "입금확인/예약확정"    "촬영 완료"
   │                                                            └────▶ no_show "노쇼"
   └─────────────── 어느 단계(requested/schedule/payment)에서든 ──────▶ cancelled "취소"
```

- 앞으로만 이동(`ALLOWED_FORWARD_TRANSITIONS` in `app/admin/actions.ts`):
  `requested→schedule_confirmed`(레거시 예약만, 보통은 후보 확정 액션), `schedule_confirmed→payment_confirmed`, `payment_confirmed→completed|no_show`
- **되돌리기**: `completed/no_show → payment_confirmed`만 (`revertReservationStatus`, 이메일 없음)
- **취소**: 사유 필수, `status_before_cancel` 저장 → **휴지통**(예약관리 화면 상단 `<details>`)
- **복원**: 휴지통에서 `status_before_cancel`로 복원(그사이 시간이 찼으면 23P01로 거절). 이메일 없음
- **완전 삭제**: 2중 확인 후 행 삭제(시트에는 "삭제됨" 표시, 캘린더 이벤트 삭제)
- 상태 라벨/색(관리자 화면 전체 통일):
  접수(amber) / 일정확정(blue) / 입금확인(brand) / 촬영완료(emerald) / 취소(gray) / 노쇼(red)

### 6-4. 금액

- **예상 금액**(`estimated_amount`) = 기본가(할인가 우선) + 선택한 유료 옵션 합. 신청 시 서버에서 재계산(클라이언트 값 불신).
- **실제 지불액**(`charged_amount_breakdown`) = 관리자가 항목별로 편집(기본가/옵션 자동 채움 + 직접 추가/삭제). 합계가 `charged_amount`.
- **원가**(`cost`) — 매출관리 순이익 = 실제 지불액 합 − 원가 − 기타지출 − 고정지출(7-15).
- 금액 입력은 전부 `MoneyInput`(₩ + 실시간 콤마).

---

## 7. 파이프라인 상세

> 공통 패턴: 서버 액션에서 **DB 변경 → `revalidatePath` → 응답** 후,
> 알림·시트·캘린더·고객DB 갱신은 **`after(async () => …)`** 로 응답 뒤에 실행한다
> (버튼 응답이 외부 API를 기다리지 않게). 이 작업들은 절대 throw하지 않는다.

### 7-1. 고객 예약 신청 (메인 퍼널)

```
[진입] / 또는 /ig(?ref=landing) 또는 홍보링크(?ref=xxx)
  │  ?ref 값은 ref-cookie로 30일 저장 → 조회 기록과 실제 예약에 같은 값 기록
  ▼
① /booking  상품 목록 (logBookingListView)
  - 공개 상품 카드 그리드: 태그색 점, 썸네일(설정), 요약, 촬영 길이·최대 인원, 정가/할인가/할인율, "상세 보기 →". 전체/1인/그룹 필터.
  - 하단 "이미 예약하셨습니까? 예약 조회 →" (/booking/lookup)
  - 디자인은 settings.booking_style(강조색/세일색/글자색·크기/모서리/카드크기)
  ▼
② /booking/[slug]  상품 상세 (logProductView)
  - 왼쪽 = 상품명·촬영 길이·최대 인원 + 전체 상세 내용(description)·결과물 안내(delivery_note)
  - 오른쪽 = 상품명·가격·예약 가능 기간·"희망 시간 선택하기"
  - 버튼 → ?step=times: 왼쪽 달력·시간, 오른쪽 예약 요약. 모바일은 위아래로 쌓인다.
  - 달력: 가능일만 활성(loadAvailableDates), 월 이동은 가능 범위 안에서만(?month=YYYY-MM)
  - 날짜 클릭 → loadSlotsForDate(서버 액션)로 시간 버튼 표시
  - 희망 시간 **정확히 3개** 선택(토글, 3개 차면 나머지 비활성)
  - 우측 요약에 1~3번째 희망 시간·삭제·기본 요금·신청 정보 입력 버튼. 3개를 채워야 다음 단계로 간다. 시간 로딩 실패 안내 및 늦은 응답 덮어쓰기 방지.
  - 이동: /booking/[slug]/apply?slots=YYYY-MM-DD_HH-MM,...
  ▼
③ /booking/[slug]/apply  신청서 (logApplyView)
  - 서버가 후보 3개를 다시 검증(지났거나 그사이 찬 시간) → 하나라도 무효면 "다시 고르기" 화면
  - 상품별 문항(custom_fields)만 순서대로 렌더(이름/연락처도 문항 중 하나)
  - 연락처 하이픈 자동, 생년월일 입력 시 만나이/한국나이/미성년자 즉시 표시
  - 한 줄 입력에서 Enter = 다음 문항으로 이동(제출 아님)
  - 우측 예약 요약에 기본가+유료 옵션 예상 금액을 항상 표시한다.
  - "신청 내용 확인하기" → 실제 제출 FormData의 모든 활성 문항 답변·희망 시간·금액 확인 → "예약 신청하기". 수정으로 돌아가도 입력/선택을 유지한다. 확인 버튼 클릭 자체로 제출되지 않으며 성별·다중선택 필수 입력도 검사한다.
  ▼
④ createReservation (lib/booking/actions.ts)
  1. 후보 3개 스키마 검증(reservationSchema) → 활성 문항 조회 → 문항 추출/필수 검증(extractReservationFormData). 문항 조회 실패를 빈 목록으로 취급하지 않고 신청을 중단한다. 신청서 최초 로딩 실패 시에도 빈 폼 대신 날짜/시간을 유지하는 다시 불러오기 안내를 보여준다. 성별은 `gender` 및 일반 `single_choice` 모두 상품의 `required` 설정을 따르며, 선택 문항이면 생략 가능하다.
  2. 예상 금액 서버 재계산
  3. 후보 3개 실시간 재검증(loadAvailableSlots)
  4. create_reservation_with_candidates RPC (예약번호 23505 충돌 시 재시도 ≤3)
  5. reservation_answers insert
  6. after(): 고객DB upsert → notifyCustomerRequested(손님: 알림톡/SMS + on_requested 이메일 규칙)
             + notifyAdminNewRequest(사장님: SMS/알림톡 + on_admin_new_request 이메일 규칙)
             + 시트(예약/고객) + 캘린더 동기화
  ▼
⑤ 완료 카드(ReservationSuccessCard): 설정의 제목/설명, 예약번호, 후보 3개,
   입금 계좌(복사 버튼), 공지, "예약 조회하러 가기"
```

### 7-2. 고객 조회 · 취소 (/booking/lookup)

- 예약번호+연락처로 1건 조회(`lookup_reservation`), 또는 연락처만으로 목록(`lookup_reservations_by_phone`)
- 결과는 상태 필터(전체/확정 대기/확정/촬영 완료/취소·노쇼) + 왼쪽 예약 목록/오른쪽 상세로 표시한다. 취소 전 확인 다이얼로그에서 한 번 더 확인한다.
- 손님 직접 취소: `cancel_reservation` RPC(마감 시간 이전만) → after(): 고객DB upsert,
  `notifyCustomerCancelled`(저장된 팀원 포함), 시트·캘린더

### 7-3. 관리자 상태 변경 — 확인창(StatusTransitionModal) ★

파일: `app/admin/(dashboard)/reservations/status-transition-modal.tsx`
(일정확정/입금확인/완료/노쇼/취소/후보확정이 모두 이 창을 거친다)

1. 버튼 클릭 → 창이 열리면서 동시에:
   - `previewStatusChangeEmails(reservationId, triggerType, extraVars)` — 이 트리거에 걸린 이메일 규칙들을 **실제 예약 데이터로 렌더**해서 카드로 보여줌
   - `loadReservationRecipientInfo(reservationId)` — 예약자 이메일, 고객DB 이메일, 사장님 이메일, 상품 최대 인원, 저장된 팀원
2. 창 구성: (취소면 사유 입력 필수) → **받는 사람**(예약자 자동 + 팀원 칸) → 메일 카드들(발송 대상 주소 표시, 제목 input + 본문 Tiptap 편집 가능)
3. 버튼: **취소 / 이메일 보내지 않기(skipEmail=true) / 확인**
4. 제출 폼: `id`, `nextStatus` 또는 `rank`/`cancelReason`, `overrides`(규칙id별 수정된 제목/본문 JSON), `teamEmailsPresent`, `teamEmails[]`, (`skipEmail`)
5. 서버(`applyReservationTransition` / `cancelReservationWithReason` / `confirmReservationCandidate`):
   - 팀원 주소 검증(형식 오류면 상태 변경 전에 거절) → 상태 업데이트와 **같은 update로 team_emails 저장**
   - after(): 고객DB upsert, 시트·캘린더 동기화
   - skipEmail이 아니면 after(): 이메일(+일정확정은 SMS/알림톡) 발송, overrides 적용
   - `payment_confirmed/completed/no_show`는 **이메일 규칙만**(SMS 심사 문구 없음) — `EMAIL_ONLY_STATUS_TRIGGERS`
6. 취소 사유 입력 칸에서 포커스가 빠지면, `{{취소사유}}`를 쓰는 규칙이 있을 때만 미리보기 재렌더(직접 고친 본문이 날아가지 않게)

### 7-4. 후보 확정 (ConfirmCandidateButtons)

- 상세 패널에서 후보 1~3번째 각각 "확정" 버튼 → 같은 확인창(`on_schedule_confirmed`, `{{일시}}`는 고른 후보 시간으로 미리보기)
- `confirmReservationCandidate`: 후보 조회 → 팀원 검증 → `status=schedule_confirmed`, `period/shoot_start/shoot_end/confirmed_candidate_rank` 설정(여기서 처음 점유. 23P01이면 "이미 다른 예약으로 확정")
- 예약내역 표의 상태 변경 열은 후보 확정을 직접 못 함("후보 확정 대기" 안내 → 행 클릭해서 상세 패널에서)

### 7-5. 일정 변경 (RescheduleForm, 상세 패널 안)

- 확정 상태(schedule/payment)에서만. 날짜·시간 직접 입력(운영시간/리드타임 무시 — 사장님 요구)
- 받는 사람(팀원) 칸 포함. 형식만 맞으면 저장, 겹치면 23P01로 거절
- after(): `notifyCustomerRescheduled`(SMS/알림톡 + `on_rescheduled` 규칙, `{{기존일시}}`/`{{변경일시}}`), 시트·캘린더
- 미리보기/수정 확인창은 **없음**(바로 발송)

### 7-6. 수기 예약 등록 (ManualReservationButton, 예약관리 화면)

- 전화·DM 예약을 사장님이 직접 입력: 상품, 날짜, 시간(직접 입력), 이름, 연락처, **예약자 이메일(선택)**, **팀원 칸**, 인원, 메모, 유료 옵션(가격 있는 선택형 문항만 표시), 예상금액 합계
- 서버가 그 시간이 실제로 열려 있는지 재검증(`isReservationTimeAvailable`) → 바로 `schedule_confirmed`로 insert
- after(): 고객DB upsert, `notifyCustomerConfirmed`(예약자 이메일·팀원 포함), 시트·캘린더
- (2026-10-01 이전에는 이메일 입력칸이 없어 수기 예약자에게 메일이 나갈 수 없었다)

### 7-7. 결과물 전송 (DeliverableSendModal)

- 위치: 예약관리 상세 패널(날짜 확정·미취소 예약, basePath가 `/admin/reservations`일 때만) + 예약내역 표의 상태 변경 열(완료된 예약)
- 창: 결과물 링크(구글 드라이브 URL 직접 입력, 필수) → 받는 사람(예약자=**고객DB 이메일 우선**, 없으면 예약건 이메일 + 팀원) → 예약건/고객DB 이메일 불일치 경고 → 이메일 없음 경고 → `on_deliverable_sent` 규칙 미리보기/수정(`{{결과물링크}}`는 링크 입력칸 blur 시 반영)
- `sendDeliverableEmail`: 팀원 검증 → `notifyEmailOnlyEvent` 발송 → `deliverable_sent_at` + `team_emails` 저장
- 예약 상태는 바뀌지 않는다. 표에서는 이후 "작업종료" 텍스트로 바뀜
- (구글 드라이브 Picker 연동을 시도했다가 확인창 뒤에 가리는 문제 등으로 **걷어냄** → 링크 직접 입력)

### 7-8. 알림 시스템 ★

#### 채널

| 채널          | 구현                                                  | 조건                                                      |
| ------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| 이메일        | `lib/notifications/email.ts` (nodemailer, Gmail SMTP) | GMAIL_USER/APP_PASSWORD. 이메일 규칙이 있을 때만          |
| 카카오 알림톡 | `kakao.ts` (솔라피)                                   | pfId + 목적별 템플릿ID가 있으면 우선 시도                 |
| SMS           | `sms.ts` (솔라피)                                     | 알림톡이 시도되지 않았고 `SOLAPI_SMS_ENABLED !== "false"` |

#### 손님 알림 공통(`notifyCustomer` in notify.ts)

알림톡 시도 → 안 됐으면 SMS → 그리고 별도로 이메일 규칙(`sendTriggerEmails`).
목적: `customer_requested`, `customer_confirmed`, `customer_cancelled`, `customer_rescheduled`, `customer_reminder`, 사장님 `admin_new_request`.

#### 이메일 규칙 엔진 (`sendTriggerEmails`)

1. `loadEmailRulesForTrigger(trigger, productId)` — 켜진 규칙 중 상품 필터 일치(또는 전체)를 `sort_order` 순으로
2. 변수 = 호출 측 변수 + `siteVariableOverrides()`(**`{{계좌}}`/`{{공지}}`는 항상 현재 설정값으로 덮어씀**)
3. 브랜드(로고/색) 로딩
4. 규칙마다 `ruleRecipientAddresses(rule.recipients, {customerEmail, adminEmail, teamEmails})`
   - `customer` → 예약자 + **팀원 각각**, `admin` → 사장님 알림 이메일(설정). 중복 제거
5. 주소마다 `tryRuleEmail` → 제목 렌더, 본문 `renderEmailHtml` → `finalizeEmailHtml`(카드 레이아웃·헤더·푸터·CTA·브랜드) → 평문 대체본 → 발송 → `notification_logs` 기록(성공/실패)
6. 확인창에서 고친 내용(override)이 있으면 규칙 원문 대신 그 HTML을 그대로 사용

#### 트리거

| trigger_type            | 라벨                 | 발생 지점                           |
| ----------------------- | -------------------- | ----------------------------------- |
| `on_requested`          | 예약 접수 시         | 손님 신청                           |
| `on_admin_new_request`  | 새 예약 신청 시      | 손님 신청(사장님용)                 |
| `on_schedule_confirmed` | 일정확정 시          | 후보 확정 / 레거시 전환 / 수기 등록 |
| `on_payment_confirmed`  | 입금확인/예약확정 시 | 상태 변경                           |
| `on_completed`          | 완료 처리 시         | 상태 변경                           |
| `on_no_show`            | 노쇼 처리 시         | 상태 변경                           |
| `on_cancelled`          | 예약 취소 시         | 관리자 취소 / 손님 직접 취소        |
| `on_rescheduled`        | 예약 일정 변경 시    | 일정 변경                           |
| `on_deliverable_sent`   | 결과물 전송 시       | 결과물 전송                         |
| `days_before_shoot`     | 촬영 며칠 전         | 크론(day_offset)                    |
| `days_after_shoot`      | 촬영 며칠 후         | 크론(day_offset)                    |

#### 이메일 변수 (`EMAIL_VARIABLES` / `buildEmailVariables`)

`{{이름}}` `{{연락처}}` `{{상품명}}` `{{일시}}` `{{촬영장소}}` `{{예약번호}}` `{{계좌}}` `{{공지}}` `{{후보목록}}`(1번째/2번째… 표기)
`{{기존일시}}` `{{변경일시}}` `{{취소사유}}` `{{예상금액}}` `{{추가옵션}}` `{{모든옵션}}` `{{결과물링크}}`

#### HTML 메일 (`email-html.ts`)

- 표준 이메일 카드(가운데 정렬, 헤더 로고, 푸터 — 수신거부·개인정보 안내), 브랜드 색
- CTA 버튼 최대 3개(본문 폭 60%를 채우도록), 표는 좌우 꽉 채움
- 에디터의 "요약 박스"(예약 정보 표)를 직접 삽입·편집(자동 생성 아님)
- 폰트: 본고딕/나눔고딕/나눔명조(Google Fonts 링크)
- 발신자 이름 통일(스튜디오명)

#### 관리 화면 (`/admin/emails`)

규칙 목록(순서 이동, 켜기/끄기, 삭제), 규칙 모달(PC 좌 편집/우 실시간 미리보기, 모바일 위아래):
이름, 트리거, day_offset, 받는 사람(손님/사장님 중복), 상품 필터, 제목, 본문(Tiptap + 변수 삽입), CTA 1~3.
상단에 **테스트 발송 주소** 저장 → 규칙별 "테스트 발송"(예시 값으로 채움, `{{계좌}}/{{공지}}`만 실제값).

#### 고객DB 단체 메일 (`sendCustomerEmails`)

고객DB에서 선택한 손님들에게 프리셋(규칙) 또는 직접 작성 메일. **"받는 사람 직접 추가"** 칸으로 고객DB에 없는 주소도 가능(`{{이름}}`/`{{연락처}}`는 빈 칸). 예약과 무관(트리거/수신자 설정 안 탐).

### 7-9. 팀원 이메일 (2026-10-01 신규) ★

- 공통 컴포넌트 `components/team-recipients-field.tsx` — "받는 사람": `1 · 예약자 <주소> 자동` + `2 · 팀원 [입력] ✕` … + `[+ 팀원 추가]`
- 처음 열 때 칸 수: 저장된 팀원이 있으면 그대로, 없으면 **상품 max_people - 1**개 빈 칸(`initialTeamEmailRows`)
- 최대 10명, 형식 검증, 소문자 정규화, 중복·예약자 본인 주소 제거(`normalizeTeamEmails`)
- 폼 필드: `teamEmailsPresent=1`(칸이 있는 폼 표시 — 전부 지운 경우와 칸이 없는 폼을 구분) + `teamEmails`(여러 개)
- 서버 공통: `resolveTeamEmails(formData, customerEmail, saved)` — 칸이 있으면 그 값으로 `team_emails` 덮어씀, 없으면 저장값 사용
- 적용처: 상태 변경/취소/후보 확정 확인창, 결과물 전송, 일정 변경, 수기 등록, 고객DB 단체메일(라벨 "추가", 저장 안 함)
- 자동 메일: 크론 day-offset 규칙, 손님 직접 취소에도 저장된 팀원 포함
- **팀원은 손님용(customer) 규칙만 받는다. 사장님용 메일은 안 받는다. 주소마다 따로 발송**(서로 주소 노출 없음)
- "이메일 보내지 않기"를 눌러도 팀원 목록은 저장됨
- ⚠ 배포 직후라 실제 수신 테스트는 사장님 확인 대기

### 7-10. 크론 (`/api/cron/reminders`, 매일 KST 19:00)

1. `Authorization: Bearer $CRON_SECRET` 확인
2. **내일 촬영**인 `schedule_confirmed/payment_confirmed` 중 `reminded_at is null` → `notifyCustomerReminder`(SMS/알림톡만) → `reminded_at` 기록
3. `days_before_shoot/days_after_shoot` 규칙 스윕: 규칙마다 대상 날짜(오늘±offset)의 예약을 찾아, 예약자+사장님+**팀원** 주소 중 아직 성공 발송 기록이 없는 주소에만 발송
   - ⚠ 대상 상태가 `schedule_confirmed/payment_confirmed`뿐이라, **촬영 후 `completed`로 바꾼 예약은 `days_after_shoot` 대상에서 빠진다**(11장)

### 7-11. 구글 스프레드시트 백업 (단방향 DB→시트)

- 탭 "예약": 예약 1건 = 1행(예약번호 기준 upsert). 삭제 시 상태 칸만 "삭제됨"
- 탭 "고객DB": 손님 1명 = 1행(연락처 기준). 방문 이력(첫/최근 방문, 횟수 — **완료** 예약 기준)
- 예약이 생성/변경되는 모든 지점에서 after()로 호출. 실패해도 throw 안 함
- 관리자 버튼: 설정의 "소급 반영"(전체 덮어쓰기 + customers 채우기), 예약관리 "예약정보 업로드", 고객DB "고객정보 업로드"
- 값은 RAW 입력, 전체 덮어쓰기 전 비우기(과거 중복 행 버그 수정)

### 7-12. 구글 캘린더 동기화 (단방향 DB→캘린더)

- 확정된 예약만 이벤트로 유지(취소·미확정이면 이벤트 삭제). 제목 `상품명 · 손님이름`
- 이벤트 색 = 상품 태그 색(팔레트가 구글 캘린더 11색과 1:1)
- `google_calendar_event_id` 저장. 설정 화면에 "소급 반영" 버튼(결과를 실제 성공/실패로 집계)

### 7-13. 고객DB

- 화면: 표(이름, 나이, 성별, 연락처, 이메일, 첫/최근 방문, 경과일, 방문횟수, SNS 동의, 최초 수집일/경과일), 다중 선택
- 손님 추가(수기, 예약 없는 현장 손님), 정보 수정(모든 칸 + override 값), 선택 삭제(2중 확인), 메일 발송, 시트 업로드
- 계산은 `lib/customers.ts`(순수, 테스트), DB는 `lib/customers-db.ts`
- SNS 동의는 가장 최근 완료 예약의 "SNS 업로드 동의" 문항 답변(상품별 문항 id가 달라 라벨로 찾음)

### 7-14. 통계 (/admin/analytics)

- 퍼널: 목록 진입 → 상세 진입 → 신청서 진입 → 실제 예약 (상품별 전환율)
- 최근 N일 동향, 시간대별 접속자(KST 0~23시 막대), 유입경로(ref)별 집계, 상세 로그(메모·개별 삭제)
- 관리자 로그인 상태의 방문은 기록 제외(`isAdminVisitor`)
- "통계 리셋" = 행 삭제가 아니라 `analytics_reset_at` 기록(이후만 집계, 로그는 보존)
- 열 때마다 `analytics_last_seen_at` 갱신 → 다음에 직전 확인 대비 변동치를 빨간 글씨로

### 7-15. 매출관리 (/admin/revenue)

- 상단에서 월별/연간 매출을 선택해 같은 화면을 전환한다. 기본은 월별이며 기존 `?month=YYYY-MM` 링크도 유지한다. 월별은 월 선택·이전/다음 달, 연간은 연도 선택·이전/다음 해를 제공하고 전환 시 마지막 월 번호를 유지한다.
- 촬영일 `shoot_start`를 KST 기간으로 조회한다. 대상 예약 상태: `payment_confirmed`, `completed`, `no_show`(입금된 예약)
- 매출 = 예약별 **실제 지불액(`charged_amount`)** 합. 지불액 미입력 예약 수를 따로 알려준다(예상 금액으로 대체하지 않음)
- 상품별: 건수, 매출, 원가(`cost`), 촬영이익(매출 − 촬영 원가), 수익률(= 촬영이익 ÷ 원가 × 100, "지출 대비"). 전체 순이익과 구분하며 기존 계산 기준은 유지한다.
- 지출: 기타지출(`kind=other`) / 고정지출(`kind=fixed`) — 일자·항목·금액·비고 추가/삭제
- 순이익 = 매출 − 원가 − 기타지출 − 고정지출
- 연간 화면: 연간 요약, 1~12월 매출·순이익 그래프/표(월 선택 시 월별 화면 이동), 연간 상품 실적, 연간 기타·고정지출. 고정지출은 실제 등록한 항목을 합산하며 12배하지 않는다. 지출 표시 월 필터는 목록에만 적용하고 연간 합계를 바꾸지 않는다.
- `lib/revenue/summary.ts`가 월·연 공통 계산을 담당한다. `load.ts`는 응답 한도를 넘는 예약·상품·지출도 페이지 단위로 읽는다. 조회 실패는 0원으로 표시하지 않고 오류/재시도 화면을 제공한다. DB 스키마 변경 없음.

### 7-16. 촬영 기록표

- 상세 패널 "기록표 생성"(날짜 확정 예약) → `/admin/reservations/[id]/record-sheet/print` 인쇄용 HTML(브라우저 인쇄, 헤더/푸터 숨김 CSS)
- 양식은 설정의 기록표 에디터에서 행 단위 편집(`record_sheet_template.rows`, 기본값 `DEFAULT_RECORD_SHEET_ROWS`)
- 값 = 예약 정보 + 문항 답변(신청인 정보, 관계, SNS 동의) + 고객DB 보충 + 실제 지불액 항목 + 상품 `delivery_note`
- 태그: 고정 태그 카탈로그(`FIXED_TAG_CATALOG`) + `option:<옵션라벨>`(유료 옵션 선택 여부)

### 7-17. 상품관리 & 문항

- 목록: 정사각형 카드 그리드, 카드 점 세 개 메뉴(복제/삭제/태그색), 공개 토글
- "상품 추가" = 초안 상품 생성 후 바로 수정 화면(저장 안 하고 나가면 경고 모달 + 손대지 않은 초안 자동 정리 `discardDraftProduct`)
- 수정 화면 3단: ① 기본 정보 폼(이름, **요약**, 촬영/정리 시간, 가격/할인가, 최대 인원, 주소(slug), 완성본 전달예정일, 태그 색, 대표 이미지) ② 상세 설명 Tiptap 에디터 ③ 신청서 문항(모달 추가/수정, 활성 토글, 순서 이동, 다른 상품에서 가져오기, 상세설명 서식)
- 저장: 타이틀 옆 저장 버튼 / Ctrl+S. Enter는 다음 칸 이동
- 상품 링크 복사 버튼

### 7-18. 스케줄관리 (/admin/schedule)

- 요일별 기본 운영시간(자동 저장, select 기반 시간 선택)
- 주간 캘린더: 시간 칸 클릭으로 차단 토글(낙관적 업데이트)
- 날짜 단위 휴무/특별 운영시간(기간 지정 저장, 삭제)

### 7-19. 디자인 / 설정

- `/admin/design`: 예약 페이지 디자인(템플릿 + 강조색/세일색/글자색/글자크기/카드 모서리/카드 크기) + 실시간 미리보기
- `/admin/settings`: 예약 규칙(슬롯 간격·리드타임·예약가능기간·취소마감), 예약 완료 화면 문구(+실시간 미리보기), 이메일 양식(로고 업로드·브랜드 색), 홈 화면 문구, 상품 목록 썸네일 표시, 알림 받을 연락처(사장님 전화/이메일), 구글 시트/캘린더 소급, 촬영 기록표 양식 에디터. 저장 버튼은 상단 sticky 줄

### 7-20. 인증

- `/admin/login` 이메일+비밀번호(Supabase Auth). 회원가입 꺼짐 → 계정은 사장님 1개
- `proxy.ts`(matcher `/admin/:path*`): `supabase.auth.getClaims()`로 **JWT 로컬 검증**(JWKS 캐시, 네트워크 왕복 없음) → 요청 헤더 `VERIFIED_ADMIN_HEADER`에 user id(클라이언트가 보낸 같은 헤더는 항상 삭제 후 재설정)
- `requireAdmin()`(lib/supabase/auth.ts): 헤더만 읽음. **모든 관리자 서버 액션의 첫 줄**에서 호출(서버 액션은 POST로 직접 호출될 수 있음)
- `app/admin/(dashboard)/layout.tsx`도 확인 후 미로그인 시 로그인으로

### 7-21. 이미지 · 스토리지

- 버킷 `product-images`(공개). DB에는 **경로만** 저장, URL은 `publicImageUrl(path)`로 조합
- 업로드: `uploadProductImage`(대표 이미지·상세설명 삽입 이미지), `uploadLogoImage`(이메일 로고)
- 에디터 안 이미지: 자르기/크기/위치 조정

### 7-22. 기타 공개 페이지

- `/` 홈: 사이트명·설명 + "예약하기"
- `/ig`: 인스타 광고 랜딩(그라데이션 히어로, 로고, 실제 상품명으로 slug 조회 → `/booking/<slug>?ref=landing`)
- `/map?q=주소`: 지도앱 선택·주소 복사(현재 이메일에서 링크 제거 → 사실상 미사용)

---

## 8. 화면별 기능 맵 (고객 / 관리자)

### 8-1. 고객 화면

| 경로                            | 기능                                        |
| ------------------------------- | ------------------------------------------- |
| `/`                             | 홈                                          |
| `/ig`                           | 광고 랜딩                                   |
| `/booking`                      | 상품 목록                                   |
| `/booking/[slug]`               | 상품 상세, ?step=times로 희망 시간 3개 선택 |
| `/booking/[slug]/apply?slots=…` | 신청서 → 내용 확인 → 완료 카드              |
| `/booking/lookup`               | 예약 조회/취소                              |
| `/map`                          | 주소(미사용)                                |

### 8-2. 관리자 메뉴 (`components/admin-nav.tsx` 순서)

스튜디오 운영: 예약관리 · 예약내역 · 고객DB · 매출관리 · 통계 / 사이트 관리: 상품관리 · 스케줄관리 · 디자인 · 이메일 · 설정 (`/admin` → `/admin/products`)

- 2안 업무 책상 디자인: 데스크톱 고정 사이드바, 현재 메뉴 강조, 64px 공통 헤더, 모바일 모달 메뉴(Escape로 닫기). 메뉴 10개와 로그아웃 모두 유지.
- 관리자 영역은 시스템 다크 설정과 관계없이 밝은 회색/흰색/차분한 파랑을 사용한다. 고객 화면의 기존 테마는 유지한다.
- 로고는 전체 `푸르른 스튜디오` 손글씨로 변경(`public/brand-logo.svg`, 기존 전체 흰색 원본의 알파 형태를 보존해 파란색으로 렌더링). 관리자와 고객 상품 목록에 같은 로고를 쓴다.

### 8-3. 예약관리 (`/admin/reservations`) — 달력 중심

- 월 달력(상태 색 점, 상품 태그색 칩, 날짜 칸 전체 클릭) + 오른쪽 **상세 패널**(`DetailPanel`)
- 확정 대기(후보만) 목록, 휴지통(취소 예약), 수기 예약 등록, 예약정보 시트 업로드
- URL: `?month=YYYY-MM&date=YYYY-MM-DD&id=<예약id>`

### 8-4. 예약내역 (`/admin/reservation-history`) — 표 중심

- 전체/일정 확인 대기/입금 확인 대기/촬영 완료 요약, 검색(이름/연락처/예약번호), 상태 필터 및 상태별 빠른 탭(취소·노쇼 포함), 정렬(예약시점/촬영일 빠른·느린 순), 건수 배지, 달력 이동 링크
- 열(고정 비율): **상태 배지(짧은 라벨) · 촬영일시 · 상품(태그색 배지) · 예약자(예약번호 보조 표기) · 연락처 · 결제금액 · 접수일 · 예약 처리**. 좁은 데스크톱에서는 표 영역만 스크롤하고, 모바일은 같은 행/처리 버튼을 모든 정보가 보이는 카드로 배치한다. 열 너비 드래그와 별도 예약번호 열은 추가하지 않는다.
- **행 전체 클릭 또는 키보드 Enter/Space → `?id=` 상세 패널**(버튼/링크와 내부 SVG 클릭은 행 이동에서 제외). 선택 전에는 표를 넓게 사용하고, 선택 후 넓은 화면은 오른쪽 패널, 작은 화면은 아래 패널로 배치해 자동으로 상세 위치를 보여준다.
- 상태 변경 열(`reservation-action-cell.tsx`): 후보 대기 안내 / 일정확정 / 입금확인·예약확정 / 완료·노쇼 / 취소(빨간 글씨) / 완료 후 결과물 전송 → "작업종료" + 되돌리기 / 노쇼 "작업종료"+되돌리기 / 취소 "작업종료"+복원. 버튼 글자 크기 통일(`px-3 py-1.5 text-xs`)
- 상세 패널은 예약관리와 동일 컴포넌트지만 `basePath="/admin/reservation-history"`이면 **상태 변경·결과물 전송 섹션을 숨김**(표에서 처리하므로)

### 8-5. 상세 패널 (`detail-panel.tsx`) 구성 순서

뒤로/목록 · 예약번호 · 상품명 · 일시 · 예약자/연락처/인원/성별·나이(미성년자 강조)/상태 · 손님 메모 · 문항 답변 · (취소면 취소 사유 + 복원) · 후보 확정 버튼(대기 시) · 상태 버튼(예약관리에서만) · 일정 변경(+팀원) · 기록표 생성 · 결과물 전송(예약관리에서만) · 사장님 메모 · 촬영 장소 · 실제 지불액(항목별) · 촬영 원가(라벨 아래 안내문, 메모) · **발송 기록**(채널 배지/목적/수신자/시각/성공✓·실패✗+사유, 구분선) · 예약 삭제(되돌릴 수 없음)

- 패널은 `key={예약id}`로 마운트 → 다른 예약으로 넘어갈 때 입력값이 남는 버그 방지(과거 긴급 수정)

---

## 9. 개발 역사 (날짜별)

> 전체 커밋은 `git log --no-merges --reverse` 로 볼 수 있다. 아래는 흐름 요약.

**2026-09-03 — 시작**: 기존 작업 전체 삭제 후 재시작. 로드맵(Phase 0 운영 규칙 확정), Phase 1 기반(Next16, Tailwind4, Vitest), Phase 2 데이터 모델(스키마·RLS), Phase 3 슬롯 계산 엔진, Phase 4 로그인·상품관리, Phase 6 손님 예약 MVP. 서울 리전 고정, 로그인 확인 중복 제거.

**09-04**: 관리자도 예약 가능 RLS, 전화번호만으로 조회, 예약 관리 화면, 상태 버튼, 조회 화면 3칸, 완전 삭제(2중 확인), Phase 5 스케줄 관리(주간 차단 토글).

**09-05~06**: Phase 7(수기 예약, 예약 설정), 예약 흐름 한 화면→신청서 분리, 상세 설명 편집기, **Phase 8 알림**(SMS 솔라피 + 이메일 Resend + 전날 리마인드), 손님 이메일 수집, 접수 메일에 계좌·안내.

**09-08**: **이메일 Resend → Gmail SMTP 전환**(도메인 없이 아무에게나 보내려고), 매출관리(원가·고정비·순이익), 알림을 after()로(응답 지연 제거), 지불액·성별·생년월일·**커스텀 문항**, 문항을 상품별로, 관리자 로고/헤더 다듬기.

**09-09**: 상세 설명 **Tiptap** 전환(툴바, 글자색, 사진 삽입·자르기), 상품 편집 3단, 상품 그리드·태그 색(소프트 10종→나중에 구글 11색), 드래그 정렬 시도 후 제거→메뉴, 기본 문항을 문항편집으로 이동, 상품 복제, 상품 추가=수정화면.

**09-10**: 처리 중 오버레이, 낙관적 업데이트, **JWT 로컬 검증(getClaims)**, 이름·연락처 문항 잠금, 저장 안 한 변경 경고(여러 번 수정), 디자인 스킬 리디자인 시도→**Revert**, 카카오 알림톡 채널, SMS 끄기 스위치.

**09-11~12**: **후보 1~3지망 방식**(정확히 3개), 이메일 문구 설정 편집, 사이트 문구 **~합니다체로 통일**, 시간 선택 UI(달력 옆, 신청 버튼 달력 세로 중앙 고정), 확정 예약 일정 변경, 텍스트 잘림 근본 원인 수정(grid 재작성).

**09-14~15**: 모바일 터치 개선, **[긴급] 상세 패널 입력값 잔존 버그(key)**, 지불액/원가 ₩ 서식, 상품별 수익률, **구글 시트 백업**(예약/고객DB 탭 + 소급), **고객DB 화면 + customers 테이블**, **구글 캘린더 동기화**(태그 색=캘린더 색), Aura 다크 테마 시도→라이트 기본으로 복귀.

**09-16~17**: 상품 목록 썸네일 토글, 상품 카드 행동유도 재설계, **할인가**, 상품 상세 페이지 레이아웃 확정(한 박스+구분선, 90% zoom), 신청서 문항 카드화 + Enter 다음 문항, 공용 Button 통일, 관리자 달력 개선, 상품 링크 복사, 운영시간 자동 저장, **통계**(조회수·전환율·3단 퍼널·상세 로그·리셋).

**09-18~19**: 예약 완료 화면 문구 설정(+미리보기, 계좌 복사), **유료 옵션 가격 + 예상 금액**, 문항 가져오기, "확정 → 입금" 순서 문구, **촬영 기록표**(.docx → 실제 양식 PDF에 맞춘 인쇄 HTML, 고객DB 보충, 양식 에디터), 수기 예약 옵션, **실제 지불액 항목별 편집**.

**09-20~21**: 개인정보 동의 문구 편집(공통→상품별)→**전용 칸 전면 삭제**(문항으로 처리), 스케줄 미리보기 제거.

**09-22**: 기타지출/고정지출(일자·비고), 금액 입력 실시간 콤마 통일, **유입경로(ref) 추적 + 신청서 진입 퍼널 + 관리자 방문 제외**, 로그 메모, 기본 표시 달 자동 전환, 파비콘.

**09-23 (대규모 개편일)**: 손글씨 로고 헤더, 할인 배지 로즈, **예약 페이지 디자인 커스터마이징(Calendly류) → 별도 디자인 페이지**, 촬영 장소 + `{{촬영장소}}`, **이메일 → 관리자가 자유롭게 만드는 규칙 시스템으로 전면 개편**, **상태 세분화(일정확정/입금확인·예약확정)**, 규칙 순서·`{{계좌}}/{{공지}}` 항상 채움, **상태 변경 단계별 파이프라인 + 확인모달 + 휴지통**, 이메일 본문 서식 에디터(HTML 메일), 다중 수신자, 구글 독스급 에디터, 규칙 테스트 발송, 표준 메일 양식, **CTA 버튼·로고·브랜드 색**, Clarity, 시간대별 접속자 차트.

**09-24~28**: 규칙 모달 반응형, **발송 기록 섹션**, 로고 업로드, 발신자 이름·요약 블록·수신거부 푸터, 지도 링크 시도→제거, 모달 잘림 근본 수정, **요약 박스 직접 편집**, 표 편집(행열·셀색·열너비), 고객DB 최근방문 경과일·SNS 동의·수기 추가, CTA 최대 3개, **고객DB 메일 발송**, 로그 개별 삭제(RLS 성공 위장 버그 수정), `{{예상금액}}`, **"N지망"→"N번째"**, **/ig 인스타 랜딩**(ref=landing).

**09-29**: 통계 직전 대비 변동치, `{{추가옵션}}/{{모든옵션}}`, 신청서 옵션 가격 표시, **예약내역(표) 페이지 + 결과물 전송**(드라이브 Picker → 걷어내고 링크 직접 입력), 예약내역에서 예약관리 기능 전부 사용, 결과물 전송 고객DB 이메일 우선 + 불일치 경고 + 발송 주소 표시.

**09-30**: 예약내역 표 대개편(상태 변경 열, 행 전체 클릭, 열 고정, 예약번호 열 삭제, 상품 태그색 배지, 짧은 상태 라벨, 버튼 스타일 통일), 확인창 **"이메일 보내지 않기"**, 상세 패널 원가/발송기록 레이아웃 정리, 고객 상품 페이지 실험들(아래 10장 — 대부분 되돌림), 요약 라벨 정리.

**10-01**: **모든 이메일 발송에서 받는 사람(팀원) 직접 추가**(DB `team_emails`), 수기 등록 예약자 이메일 칸.

**10-01 Codex 작업**: 사용자 선택 2안으로 관리자 공통 틀/예약내역/모바일 정보 배치를 정리하고 전체 손글씨 로고 적용. 기존 메뉴·서버 액션·기록표·이메일·수기 예약 기능 유지. 문항 조회 실패 시 필수 검증이 생략되는 경로 재현 및 차단, 성별 관련 회귀 테스트 추가. 공통 상세 패널 목록 복귀 날짜도 KST로 계산. 기존 린트 오류(테스트 이메일 결과 표시, 수기 예약 문항 로딩)를 정리하고 수기 상품 전환 시 오래된 조회 결과 반영 방지. DB 스키마 변경 없음. 운영 문항 설정/실예약은 클라우드 Supabase 환경변수 부재로 미확인. 타입 검사·린트(오류 0)·테스트 203개 및 임시 페이지 데스크톱/모바일 검증 완료. 사용자 배포 승인 후 master 반영 대상.

**10-01 매출관리 월·연 전환**: 사용자 승인 시안을 구현했다. 월/연 공통 KST 집계, 연간 요약·월별 그래프/표·상품 실적, 월별 상세 이동, 연간 지출 목록의 월 필터를 추가했다. 기존 실제 지불액·원가·등록된 지출 계산과 지출 추가/삭제 액션은 유지했다. 연도 경계·월/연 합계 일치·응답 한도·조회 실패 회귀 검증을 추가했다. DB 스키마 변경 없음. 운영 데이터 조회·실제 지출 저장은 환경변수 부재로 미확인이며 화면 확인에는 샘플 데이터를 사용했다.

**10-01 다크블루 예약 1안 적용**: 사용자 승인으로 고객 상품 목록·상세·시간 선택·신청서/확인·완료·조회/취소를 공통 다크블루 틀로 연결했다. 문항은 기존 상품별 custom_fields를 그대로 사용하며 관리자 상품 수정에 같은 입력 컴포넌트를 쓰는 신청서 미리보기를 추가했다. 제목·설명·보기·필수/활성·순서·옵션 가격 편집을 유지한다. 관리자 디자인 미리보기도 실제 상품 카드로 갱신했다. 예전 기본 디자인 조합만 새 기본 네이비로 표시하고 직접 지정한 색상은 유지한다. DB 변경 없음. 운영 DB 저장·메일은 클라우드 환경변수 부재로 미확인, UI 확인에는 샘플 데이터를 사용했다. 일반 로컬 빌드는 Google Fonts 네트워크 제한으로 실패해 별도 오프라인 폰트 응답을 사용하는 빌드 검증을 수행한다. 사용자가 미배포 변경 전체 배포를 승인했다.

---

## 10. 최근 결정 · 되돌린 결정 (다시 하지 말 것)

사장님이 시도해 보고 **되돌린** 것들이다. 사장님이 다시 요청하지 않는 한 재도입하지 않는다.

| 날짜     | 시도                                                              | 결과                   | 현재 상태                                              |
| -------- | ----------------------------------------------------------------- | ---------------------- | ------------------------------------------------------ |
| 09-10    | 디자인 스킬로 전체 리디자인                                       | Revert                 | 원래 디자인                                            |
| 09-15    | Aura풍 다크 시네마틱 테마                                         | "너무 어둡다"          | 라이트 기본                                            |
| 09-09    | 상품 카드 드래그 정렬/슬라이드 애니메이션                         | 제거                   | 점 세 개 메뉴                                          |
| 09-20~21 | 개인정보 동의 전용 칸(privacy_consent_text)                       | 전면 삭제              | 문항으로 처리                                          |
| 09-27~28 | 이메일 촬영 장소 지도 링크/앱 선택                                | 제거                   | 주소 텍스트만                                          |
| 09-29    | 구글 드라이브 Picker                                              | 걷어냄                 | 링크 직접 입력                                         |
| 09-30    | 예약내역 열 너비 드래그 조절                                      | 제거                   | 고정 비율 열                                           |
| 09-30    | 예약내역 "예약번호" 열                                            | 삭제                   | 행 전체 클릭                                           |
| 09-30    | **고객 상품 페이지에서 상세 설명 숨김**                           | 사장님이 원상복구 요청 | **상세 설명 표시(원래 2단 배치)**                      |
| 09-30    | 상품명 아래 소개 줄(page_summary)                                 | 제거                   | 없음                                                   |
| 09-30    | 달력 위 파란 안내 박스("먼저 희망하는 시간 3개를…") + 상품별 문구 | 제거                   | 없음(달력 카드 안 기존 작은 안내문만)                  |
| 09-30    | 예시 사진(gallery) 가로 스크롤 표시 + 업로드 칸                   | 제거                   | 업로드 칸 없음, DB 데이터 보존, 저장 시 gallery 미변경 |

확정된 결정:

- 상품 폼 `summary` 라벨은 **"요약"**(상품 목록 카드용). 상품 페이지 전용 문구 칸은 없다.
- 대표 이미지 = 목록 썸네일 전용(설정에서 썸네일 표시 켰을 때). 상품 상세 페이지엔 이미지 없음.
- 고객 플로우(10-01 새 승인안): [진입] → 상품 선택 → 상품 상세(전체 설명) → 희망 시간 3개 → 신청서 → 내용 확인 → 제출 → 접수 완료. 다크블루 1안, 전체 로고 유지.
- 표현: '팀원', 'N번째', ~합니다체.

---

## 11. 알려진 이슈 · 기술부채 · 남은 일

### 11-1. 즉시 정리하면 좋은 것

1. (10-01 해결) 배포에 남아 있던 샘플 페이지 `app/dev-preview-history4/`를 제거했다. 이번 검증용 임시 페이지도 제거 완료.
2. **`.env.example` 누락**: `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`, `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_CALENDAR_ID`, `NEXT_PUBLIC_CLARITY_PROJECT_ID`, `SOLAPI_KAKAO_TEMPLATE_CUSTOMER_RESCHEDULED`.
3. **README / ROADMAP이 오래됨**: README의 이중예약 설명(`requested/confirmed`), 진행상황 등이 현재와 다르다. 현재 기준은 이 문서.
4. (10-01 해결) 예약내역 후보 대기 안내를 "행을 선택해 확정"으로 수정했다.
5. 미사용 의존성 `docxtemplater`, `pizzip` 제거 후보. 레거시 테이블 `email_templates`, 미사용 컬럼 `products.gallery`(데이터 보존 중), `products.page_summary`(있다면) 정리 여부는 **사장님 확인 후**.
6. (10-01 해결) 수기 예약/테스트 이메일의 useEffect 동기 setState 린트 오류를 정리했다. 기존 경고 6건(`_prev` 미사용 5건, 외부 폰트 링크 1건)은 남아 있다.

### 11-2. 동작상 의심되는 점

1. **`days_after_shoot` 규칙이 완료(completed) 예약을 제외**: 크론이 `schedule_confirmed/payment_confirmed`만 조회. 촬영 후 사장님이 "완료" 처리하면 촬영 후 N일 메일이 안 나간다. 의도 확인 후 `completed` 포함 여부 결정 필요.
2. **손님 이메일 기준 불일치**: 결과물 전송은 **고객DB 이메일 우선**, 상태 변경/취소/후보확정/리마인드는 **예약건 `customer_email`** 기준. 고객DB에서 고친 주소가 상태 변경 메일엔 반영 안 됨.
3. 일정 변경은 확인창(미리보기/수정/이메일 안 보내기)이 없다.
4. 팀원 기능은 2026-10-01 배포 직후 — 실제 메일 수신·발송 기록·저장/미리채움을 사장님이 확인해야 함.
5. GCP 결제 거부 → 프로젝트 정지 시 시트/캘린더 동기화 실패(로그만 남고 예약은 정상).
6. `lib/notifications/team-emails-server.ts`의 손님 직접 취소용 팀원 조회는, `cancel_reservation` RPC가 이미 전체 행을 반환하므로 중복 조회다(무해).

### 11-3. 로드맵상 남은 일 (Phase 9~10)

- 개인정보처리방침/이용약관 페이지, SEO(메타·OG·sitemap·네이버/구글 등록), Lighthouse/접근성, Supabase 백업 확인, 에러 모니터링(Sentry), 베타 테스트
- 확장: 온라인 결제, 구글 캘린더 양방향(학교 일정 자동 차단), 촬영 공간 분리, 결과물 갤러리

---

## 12. 개발 · 검증 · 배포 절차

### 12-1. 명령어

```bash
npm install
npm run dev          # 개발 서버(로컬엔 .env.local이 없어 DB 페이지는 대부분 비어 보임)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest run (229 tests)
npm run build        # 프로덕션 빌드
npm run format       # prettier
```

- `.next/dev/types`에 지운 페이지 흔적이 남아 tsc가 실패하면 `rm -rf .next/dev/types` 후 재실행.

### 12-2. UI 검증 방법 (DB 없이)

로컬에 Supabase 키가 없으므로, 실제 페이지 대신 **임시 미리보기 페이지**를 쓴다.

1. `app/dev-preview-<이름>/page.tsx`에 실제 컴포넌트를 import하고 예시 데이터를 넣는다
   (서버 컴포넌트 페이지라면 그 JSX를 복사해 product 등만 목업으로 교체)
2. `npx next dev -p 3141` 실행
3. Playwright(Chromium 사전설치: `/opt/pw-browsers/chromium` — 환경에 따라 다름)로 데스크톱(1440~1800px)·모바일(400px) 스크린샷, `document.documentElement.scrollWidth > clientWidth`로 가로 넘침 확인
4. 사장님께 스크린샷 공유(시안 요청 시)
5. **커밋 전에 `app/dev-preview-*` 와 `public/dev-preview/` 삭제** (한 번 실수로 배포됨 — 11-1 #1)

주의: 서버 액션을 호출하는 컴포넌트(확인창 등)는 미리보기에서 열면 DB가 없어 실패한다 → 하위 표시 컴포넌트만 떼어 미리보기.

### 12-3. DB 변경 절차

1. `supabase/migrations/<마지막보다 큰 번호>_<설명>.sql` 작성(`add column if not exists` 등 재실행 안전하게)
2. `lib/supabase/database.types.ts` 수동 수정
3. 코드 수정 → 검사 통과 → **작업 브랜치에만 커밋/푸시**
4. 사장님께 SQL 코드블록 전달 → Supabase SQL Editor 실행 요청
5. "실행했다" 확인 후 master 머지/푸시
   (새 컬럼을 select/update하는 코드가 SQL 실행 전에 배포되면 그 화면/액션이 즉시 깨진다)

### 12-4. 배포

```bash
git checkout master
git merge --no-ff <작업브랜치> -m "Merge branch '<작업브랜치>' ..."
git push origin master        # → Vercel 자동 배포
git checkout <작업브랜치>
```

- 배포 결과는 Vercel 대시보드에서 확인. 배포 후 사장님께 확인 포인트를 안내.

---

## 13. 코드 작성 컨벤션

- **주석은 한국어로, "왜"를 쓴다.** 이 코드베이스는 결정 배경(과거 버그, 사장님 요청, 트레이드오프)을 주석으로 꽤 자세히 남기는 스타일이다. 기존 스타일을 따른다.
- 서버 액션은 `app/admin/actions.ts`(관리자), `lib/booking/actions.ts`(손님)에 모은다. 관리자 액션 첫 줄은 항상 `await requireAdmin()`.
- `useActionState` 기반 폼 + `SubmitButton`/`useReportPending`(처리 중 오버레이).
- 서버 전용 모듈은 `import "server-only"`. 클라이언트·서버 공용 순수 로직은 `*-shared.ts` 또는 server-only 없는 파일로 분리하고 유닛 테스트.
- 외부 연동(알림/시트/캘린더/기록)은 `after()` + 절대 throw 금지 + 실패 로그.
- 금액 입력은 `MoneyInput`, 시간은 `lib/time.ts`, 상태 라벨/색은 기존 매핑 재사용.
- 상품 태그 색: `lib/product-tag-colors.ts`(`tagColorDotClass`, `tagColorCellClass` 등).
- `inputClass`에는 `text-base`가 박혀 있다 → 다른 글자 크기가 필요하면 클래스 문자열을 따로 쓴다(Tailwind 클래스 충돌 주의).
- `.text-boost`는 `zoom: 105.56%`라 **박스에 붙이면 박스 크기까지 커진다** → 텍스트 요소에만 붙인다.
- 모달은 `<dialog>` + `showModal()`, 화면 중앙 정렬, `w-[calc(100%-2rem)] max-w-2xl` 패턴.
- 표 행 클릭은 `<tr onClick>` + `isInteractiveTarget()`(버튼/링크/입력 클릭은 제외) 패턴.
- 사이트 문구: ~합니다체, "N번째", "팀원".
- 커밋 메시지: 한국어, `feat(영역): …` / `fix: …` / `style: …` / `revert: …` 형식 혼용.

---

## 14. Codex용 프롬프트 템플릿

### 14-1. 세션 시작

```text
docs/CODEX_HANDOFF.md를 처음부터 끝까지 읽고, 특히 2장(일하는 방식), 6장(도메인 규칙),
10장(되돌린 결정), 11장(알려진 이슈)을 숙지해 줘. 읽은 뒤 현재 master와 문서가
다른 부분이 있으면 알려 주고, 사장님께는 존댓말로 보고해 줘.
```

### 14-2. 기능 추가 요청

```text
[요청] <사장님이 원하는 것>
[범위] <어느 화면/어느 흐름>
진행 방식:
1) 관련 코드를 먼저 찾아 현재 동작을 파악하고, 애매한 점은 구현 전에 질문할 것
2) 이 요청이 고객/관리자 이용 편의성을 떨어뜨릴 우려가 있으면 먼저 말할 것
3) DB 변경이 필요하면 마이그레이션 SQL과 타입을 만들되 master 머지는 내가 SQL을 실행한 뒤에
4) typecheck/lint/test 통과 + 미리보기 스크린샷으로 화면 확인
5) 작업 브랜치 커밋 → master no-ff 머지 → 푸시, 결과를 짧게 보고
```

### 14-3. UI 시안 먼저

```text
<기능> UI를 먼저 재구성해서 보여줘. 실제 발송/저장 연결과 배포는 하지 말고,
dev-preview 페이지로 데스크톱·모바일 스크린샷만 보여준 뒤 내 확인을 기다려.
```

### 14-4. 버그 수정

```text
[증상] <스크린샷/설명>
[기대] <원하는 동작>
재현 경로를 코드로 추적해 근본 원인을 찾고(같은 방식의 땜질 반복 금지),
수정 후 같은 시나리오를 미리보기나 테스트로 검증해서 보고해 줘.
```

### 14-5. DB 변경 포함 작업

```text
이 작업은 DB 컬럼 추가가 필요할 수 있어. 필요하면:
- supabase/migrations/ 에 재실행 안전한 SQL(add column if not exists 등)
- lib/supabase/database.types.ts 수정
- 작업 브랜치에만 푸시하고, 내가 Supabase SQL Editor에서 실행할 SQL을 코드블록으로 줘
- 내가 "실행했다"고 하면 그때 master에 머지
```

### 14-6. 문서 갱신

```text
이번 작업으로 바뀐 동작을 docs/CODEX_HANDOFF.md의 해당 장(파이프라인/화면 맵/
되돌린 결정/알려진 이슈/개발 역사)에 반영해 줘. 코드와 문서가 다르면 코드가 정답이야.
```

### 2026-10-01 고객 예약 화면 정리
- 상품 목록의 소개 문구와 예약 전 과정의 1~5 단계 표시, 공통 하단 예약 조회 영역을 제거했습니다.
- 상품 버튼은 “지금 신청하기”로 표시하며 상품 설명을 확인하는 기존 연결을 유지합니다.
- “이미 촬영을 신청하셨나요?” 안내는 데스크톱에서 기존 화면 높이를 유지합니다. 상품이 많아지면 아래로 확장되며 모바일에서는 상품 아래에 자연스럽게 배치합니다.

### 2026-10-01 예약번호 단독 조회 — SQL 실행 확인 완료
- 예약번호 조회에서는 연락처 입력을 없애고 `lookup_reservation_by_code(p_code)`로 예약번호만 대조합니다.
- 새 RPC는 조회/취소 연결에 필요한 최소 정보만 반환합니다. 기존 연락처 조회 및 취소 RPC는 변경하지 않습니다.
- 사용자가 `supabase/migrations/20261001000200_lookup_reservation_by_code.sql`의 SQL Editor 실행 완료를 확인했습니다. 예약번호 단독 조회 변경을 master에 병합하고 푸시합니다.
- 임시 페이지로 데스크톱/모바일 입력란과 조회 방식 전환을 검증했고 타입 검사·린트·232개 테스트를 통과했습니다. 환경에 운영 DB 자격 증명이 없어 실제 DB 조회는 로컬에서 확인하지 못했습니다.

### 2026-10-01 모바일 상품 상세 읽기 개선
- 600px 이하에서는 상품 상세 설명에 저장된 양쪽 정렬 문단만 왼쪽 정렬로 표시하고 한글 단어 단위 줄바꿈을 적용합니다.
- 긴 URL 등은 영역 안에서 줄바꿈하며, 가운데/오른쪽 정렬과 데스크톱 서식은 유지합니다. DB의 원문은 변경하지 않습니다.
- 실제 상세 컴포넌트로 320px·390px·1440px 정렬 및 가로 넘침을 확인했습니다.

### 2026-10-01 예약 진행 단계 표시 조정
- 사용자 요청에 따라 1~5 단계 표시를 복원하되 상품 목록에서는 숨깁니다.
- 상품 선택 후 상세 화면부터 표시하고, 희망 시간·신청서·내용 확인·접수 완료 화면에 현재 단계를 반영합니다.

### 2026-10-01 매출 표 제목 정렬 보정
- 상품별 실적 및 연간 화면의 월별 실적 표에서 금액/수익률 제목을 본문과 같은 오른쪽 정렬로 표시합니다. 상품/월/건수는 왼쪽 정렬입니다.
- 실제 대시보드 컴포넌트로 데스크톱·모바일에서 제목/본문 열 정렬을 확인했습니다.

### 2026-10-02 신청서 4안 적용 — Enter로만 문항 이동
- 승인된 4안의 다크블루 진행선과 문항별 박스를 고객 신청서에 적용합니다. 접힌 문항에는 입력 요약, 펼친 문항에는 입력칸과 필수/작성 중 표시를 제공합니다.
- 1.5초 입력 대기나 선택 변경에 따른 자동 이동은 사용하지 않습니다. 유효한 답변에서 Enter를 누르면 다음 문항을 펼칩니다. 장문형은 Shift+Enter로 줄바꿈하고, 한글 조합 중 Enter는 문항 이동으로 처리하지 않습니다.
- 문항 제목을 눌러 직접 이동할 수 있으며 문항별 다음 버튼은 없습니다. 마지막 문항 Enter는 내용 확인 단계로 이동하며, 실제 접수는 별도의 예약 신청 버튼으로 수행합니다.
- 관리자 상품 수정의 활성 문항/순서/필수 여부/설명/선택지 및 유료 옵션을 그대로 반영합니다. 접힌 입력칸을 유지하여 입력값과 최종 제출 데이터를 보존하고, 필수 누락 시 해당 문항을 펼쳐 오류를 보여줍니다.
- 모바일 하단에는 예상 금액과 기존 확인/접수 버튼을 고정합니다. DB/RPC 변경은 없습니다. 임시 실제 컴포넌트 페이지로 Enter·필수 검증·유료 옵션·관리자 미리보기 및 320~1440px 화면을 확인하며 운영 DB 접수/메일 발송은 실행하지 않습니다.

### 2026-10-02 오늘 예상 통장 잔액
- 매출관리 상단에 월/연 선택 기간과 독립적인 오늘(KST) 예상 통장 잔액 카드를 추가합니다. 기준 미설정/조회 실패는 0원으로 표시하지 않습니다.
- 처음 현재 실제 통장 잔액을 설정하면 당시 장부 순액을 함께 저장합니다. 이후 예상 잔액은 `기준 잔액 + 현재 장부 순액 - 기준 장부 순액 + 미등록 입출금 보정`입니다. 재설정하면 기존 보정값은 초기화합니다.
- 설정은 로그인한 관리자 자신의 Supabase Auth `user_metadata.bluenblue_bank_reference_v1`에 저장합니다. 다른 메타데이터나 권한을 바꾸지 않으며 서버 액션은 관리자 인증 후 금액 검증과 장부 재조회를 수행합니다. 신규 테이블/SQL 실행은 필요 없습니다.
- 장부 입금은 입금확인/촬영완료/노쇼의 실제 지불액을 현재 상태 기준으로 누적합니다. 입금 확인된 미래 촬영도 포함합니다. 원가는 촬영일이 오늘 이하인 예약의 등록 원가를, 기타/고정지출은 실제 등록 일자가 오늘 이하인 항목만 차감합니다.
- 현재 DB에는 은행 입출금일/환불일/원가 지급일이 없습니다. 따라서 은행 실잔액이나 완전한 현금 장부로 보장하지 않습니다. 미래·일자 없는 원가, 일자 없는 지출, 지불액 미입력, 지불액이 남은 취소 예약은 확인 항목으로 표시합니다. 선지급/미환불/별도 이체는 더하기·빼기 누적 보정과 메모로 반영할 수 있습니다. 과거 기록 수정·삭제도 예상 잔액에 영향을 줍니다.
- 기간별 매출과 통장 장부 조회를 분리하여 한쪽 실패로 다른 쪽 금액을 0원 처리하지 않습니다. 읽기에는 기존 페이지네이션을 사용합니다. 임시 실제 컴포넌트 미리보기에서 320/390/768/1440px 및 기준 설정·보정·재설정 흐름을 검증합니다. 운영 계정 메타데이터 저장은 자격 증명이 없는 로컬 환경에서 실행하지 않았습니다.

### 2026-10-02 날짜별 통장 잔액 전망 및 접기·펼치기
- 통장 잔액 카드 전체를 제목 버튼으로 접고 펼칠 수 있습니다. 접힌 상태는 제목과 오늘 기준 날짜만 보이며, 내부 DOM을 유지하여 선택 날짜와 잔액 설정 입력값이 보존됩니다. 조회 실패 카드도 같은 접기 동작을 제공합니다.
- 날짜별 전망의 기본 날짜는 7일 후이며 오늘 마감/7일 후/30일 후 버튼과 날짜 선택을 제공합니다. 선택일 마감 잔액은 오늘 예상 잔액에 오늘부터 선택일 마감까지의 예정 입금과 미래 원가·등록 지출을 반영한 값입니다. 지난 잔액은 현재 상태만으로 복원할 수 없어 오늘 이후 날짜만 허용합니다. 기준 잔액 미설정/빈 날짜/잘못된 날짜에는 임의 금액을 표시하지 않습니다.
- 입금확인/촬영완료/노쇼 금액은 오늘 잔액에 이미 포함되어 전망 입금에 다시 더하지 않습니다. 미입금 일정확정 예약은 촬영일까지 입금된다고 가정하고 `charged_amount ?? estimated_amount`를 사용하며 명시적 0원을 유지합니다. 이미 지난 미입금 촬영은 입금 시점이 없어 제외하고 건수를 표시합니다.
- 오늘 원가·지출은 오늘 잔액에 반영되어 다시 차감하지 않습니다. 이후 촬영 원가는 촬영일에, 기타/고정지출은 등록된 날짜에 차감합니다. 등록하지 않은 월별 반복 지출을 자동 생성하지 않습니다. 미확정 신청, 취소, 촬영일 없는 예약은 제외하고 예정 금액·원가 미입력은 선택 기간의 확인 항목으로 표시합니다.
- 서버는 기존 전체 장부 조회에 신청 예상 금액을 포함하고 개인 정보 없이 날짜별 합계를 전달합니다. 날짜 변경은 추가 저장/조회 없이 계산하며 월·연 매출 필터와 독립적입니다. DB/RPC/관리자 기준 잔액 저장 구조는 변경하지 않습니다.
- 계산 테스트 및 임시 실제 컴포넌트 화면에서 중복 입금 방지·KST/연도 경계·당일 포함·음수 잔액·빈/과거 날짜·접기 후 값 유지·키보드 조작과 320/390/768/1440px 가로 넘침을 검증합니다. 운영 접수/계정 저장은 실행하지 않습니다.

### 2026-10-02 통장 잔액 계산 오류 보정 — 위의 미래 입금 규칙을 대체
- 사용자 보고: 10월 8일 85,000원 예정 입금이 입금확인 상태라는 이유만으로 전망에서 빠짐. 입금일이 별도로 없는 현 구조에서는 예약 처리 상태와 관계없이 미래 확정 촬영의 금액을 촬영일에 반영하도록 통일합니다. 오늘 장부에는 오늘까지 촬영일이 있는 입금확인/완료/노쇼만 포함하며 미래 금액은 전망에 포함합니다. 실제 지불액이 없으면 신청 예상액을 사용하고 명시적 0원은 유지합니다. 월/연 실적은 기존 실제 지불액 집계를 유지합니다.
- 원가는 오늘 장부와 전망에서 동일하게 예약 상태와 무관한 등록 원가를 촬영일에 반영합니다. 취소/미확정 예약의 등록 원가가 날짜 경과 시 갑자기 차감되는 불일치를 수정했습니다. 예정 입금에서는 취소/미확정 및 연체 미입금을 제외합니다. 오늘 원가/지출과 오늘까지 반영한 입금은 전망에서 다시 계산하지 않습니다.
- 기존 관리자 설정 `bluenblue_bank_reference_v1`은 그대로 보존합니다. 기존 계산으로 얻는 오늘 잔액과 보정값을 유지하는 전환 기준을 별도 `bluenblue_bank_reference_conversion_v2`에 한 번 저장하고 재사용합니다. 새 수동 설정은 `bluenblue_bank_reference_v2`에 저장하며 항상 우선합니다. 전환 저장이 동시에 수행되는 새 수동 설정을 덮어쓰지 않습니다. 전환 실패 시 임의 잔액을 표시하지 않습니다. DB 스키마 변경은 없습니다.
- 유효하지 않은 지출일/기준일 거절, 촬영일 없는 입금 처리 건의 확인 표시, 연체 건수 안내, -0원 표시도 보완했습니다. 은행과의 연동이나 실제 입금일 추적은 없으며 선입금·별도 이체·환불 등 촬영일 기준과 다른 현금 흐름은 수기 보정해야 합니다.
- 전체 275개 테스트 통과. 85,000원 입금/19,800원 원가의 순변동 65,200원, 촬영일 경과 전후의 전망 동일성, 기존 잔액 전환/저장 실패/동시 저장, 월·연 합계 및 KST 경계를 검증했습니다. 실제 UI 컴포넌트 샘플로 320/390/768/1440px에서 100,000원 기준 잔액 + 85,000원 - 32,887원 = 152,113원, 날짜 경계, 빈 날짜, 접기 후 선택 유지, 가로 넘침 없음을 확인했습니다. 운영 DB와 관리자 계정 저장은 로컬에서 실행하지 않았습니다.

### 2026-10-03 구글 캘린더 상세 추가옵션 표시
- 캘린더 이벤트 생성·갱신 시 상세 설명에 추가옵션 항목을 항상 넣습니다. 선택한 옵션은 이름과 가격을 줄별로 표시하고, 선택이 없으면 `추가옵션: 없음`을 표시합니다. 추가옵션 이름의 문항은 무료 선택도 표시하며 다른 이름의 유료 선택 문항도 포함합니다.
- `reservation_answers`와 연결된 `custom_fields`를 서버 관리용 클라이언트로 조회합니다. 비활성 문항의 기존 답변도 포함하며 일반 성별 등의 답변은 섞지 않습니다. 옵션 조회 실패는 동기화 실패로 기록해 기존 일정 설명을 없음으로 덮어쓰지 않습니다.
- 옵션 이름/가격은 현재 문항 정의를 사용합니다(기존 이메일 추가옵션과 동일한 저장 구조). 삭제된 문항/과거 가격을 복원하는 스냅샷은 없습니다. 기존 일정은 관리자 설정의 구글 캘린더 소급 반영으로 갱신할 수 있습니다. 운영 캘린더 쓰기는 로컬에서 실행하지 않았습니다.
- 282개 테스트 통과: 유료/무료/복수/음수 가격, 일반 답변 제외, 기존 이벤트 갱신/새 이벤트 생성/선택 없음/옵션 조회 실패를 확인했습니다. DB 스키마 변경이나 콘솔 설정 변경은 필요 없습니다.

### 2026-10-05 예약 통계 개편 및 과거 기록 연결
- 새 `booking_events`에 목록/설명/희망 시간/신청서/내용 확인/접수 완료와 문항 펼침·유효/무효·검증 오류·제출 시도/실패를 저장합니다. 고객 답변·이름·연락처는 통계 이벤트에 저장하지 않습니다. 서버에서 공개 상품과 문항 소속을 확인하며 접수 성공은 브라우저 전송을 허용하지 않습니다. 로그인한 관리자 조회는 제외합니다. 익명 고객의 `AuthSessionMissingError`는 정상 방문으로 처리하고 인증 서버 장애는 기록하지 않습니다.
- 새 예약 RPC `create_reservation_with_analytics`는 기존 후보 접수 RPC를 호출한 뒤 예약 출처/신청 예상액/ref와 접수 완료 이벤트를 같은 트랜잭션에 저장합니다. 기존 RPC는 유지합니다. 관리자 수기 등록과 로그인 상태의 테스트 신청은 `booking_origin=admin`으로 새 고객 퍼널에서 제외합니다. 기존 예약은 `legacy`로 보존하며 임의로 고객·관리자를 추정하지 않습니다.
- 예전 `booking_list_views`/`product_views`/`apply_views`/예약 기록을 복사·삭제하지 않고 집계에서 새 이벤트와 연결합니다. 동일 예약의 접수 이벤트와 예약 행을 중복 세지 않습니다. 과거 상세/시간 선택 혼합 기록은 명확하게 구분하며 신규 기록부터 두 화면을 별도 수집합니다. 수집하지 않은 단계는 과거 0건으로 소급 생성하지 않습니다. 새 통계 수집 시작 시각은 최초 이벤트 때 settings.analytics_v2_started_at에 한 번 저장하여 리셋/로그 삭제 뒤에도 유지합니다.
- 방문 세션은 같은 브라우저의 30분 무활동 기준입니다. 상품별 시도 ID는 페이지 이동/새로고침에서 유지하고 접수 후 교체합니다. 저장소 쓰기 제한 시 메모리로 유지합니다. 유입경로/기기는 범위 내 최초 세션 기록으로 분류합니다. 반복 조회는 횟수로 보존하되 세션 전환율에는 중복 넣지 않습니다. 재시도는 이벤트 UUID로 중복 방지합니다. 이벤트는 짧게 배치 전송하고 페이지 이동 때 플러시하되 예약을 막지 않습니다. 네트워크 종료/차단 시 브라우저 진행 이벤트는 누락될 수 있습니다.
- 통계 상단에는 개편 이후 세션·시도·접수·신청서 완료율, 6단계 진행, 문항 버전별 펼침/마지막 유효 상태/검증 오류/30분 이상 미완료의 마지막 도달/평균 작성 시간, 채널·기기별 세션 전환 및 제출 실패를 표시합니다. 문항 답변에 의한 자동 이동은 추가하지 않습니다. 문항 제목 클릭과 Enter 모두 추적하고 Shift+Enter 줄바꿈/한글 조합/기존 검증은 유지합니다. 문항 명칭은 기록 시 서버 문항 정의를, 버전 키는 신청서의 문항 구성·순서·선택지 해시를 사용합니다.
- 하단에는 기존+신규 누적 횟수, 동향·시간대별 페이지 조회, 상품별/채널별 참고 비율과 상세 로그를 유지합니다. 기존 접속자 수 명칭을 페이지 조회로 수정했습니다. 과거 출처 미분류 예약은 누적 기록으로 별도 설명하며 새 세션 전환율에 넣지 않습니다. 로그 메모·삭제·통계 리셋·직전 확인 대비 변동 기능을 유지합니다. 예약 완전 삭제 시 연결된 새 접수 이벤트도 삭제됩니다. 조회는 전체 페이지를 읽고 실패 시 0건으로 표시하지 않습니다.
- 302개 테스트, 타입/린트/빌드 및 실제 컴포넌트의 320/390/768/1440px 화면을 검증합니다. 로컬 PostgreSQL(PGlite)에서 SQL 2회 실행, 기존 기록 보존, 접수/이벤트 원자성, 관리자 제외, 성공 이벤트 위조 차단, 중복 예약 롤백, 삭제 연동과 시작 시각 보존을 확인했습니다. 운영 DB 접수·계정 저장·메일·캘린더 쓰기는 실행하지 않았습니다.
- 적용 파일: `supabase/migrations/20261027000100_booking_analytics_v2.sql`. AGENTS.md 및 이 문서 12-3에 따라 작업 브랜치에만 푸시하고, 사장님의 SQL Editor 실행 확인 이후 master에 병합합니다. 새 테이블/컬럼/RPC를 사용하는 코드를 SQL보다 먼저 배포하지 않습니다.

- 2026-10-06 사장님이 SQL Editor 실행 완료를 확인했습니다. 운영 DB 적용 선행 조건을 충족하여 작업 브랜치를 master에 병합·푸시합니다. Vercel 배포 완료와 운영 통계 수집은 대시보드에서 확인해야 합니다.

### 2026-10-06 신청서 문항 항상 표시
- 고객 신청서의 문항별 박스와 입력란을 항상 표시합니다. 제목 클릭은 접기/펼치기 대신 해당 입력에 포커스를 이동합니다. 포커스된 문항의 강조·작성 중 표시와 완료 체크·필수 진행률·예상 금액은 유지합니다.
- 유효한 답변에서 Enter를 누르면 다음 입력으로 이동하고 마지막 문항에서는 신청 내용 확인 화면으로 이동합니다. 한글 조합 중 Enter, 장문형 Shift+Enter 줄바꿈, 필수 검증과 답변 변경만으로 이동하지 않는 동작을 유지합니다. 직접 클릭/Tab 이동도 활성 문항과 통계에 반영합니다. 통계 문항 분석의 펼침 명칭을 문항 진입으로 수정합니다. DB 변경은 없습니다.
- 302개 테스트와 린트, 빌드, 타입 검사 및 실제 신청서 320/390/1440px 브라우저 검증: 모든 입력 항상 표시, 제목 재클릭 후 표시 유지, 필수 검증, Enter 포커스 이동, 시간 경과만으로 이동하지 않음, Shift+Enter, 최종 확인, 가로 넘침 없음. 운영 접수/메일/캘린더 쓰기는 실행하지 않습니다.

### 2026-10-06 예약 이메일 발송 시점 편집 — SQL·스케줄러 확인 대기
- 촬영 전/후 예약 발송 규칙에서 `며칠 전/후 + 한국시간 HH:MM` 또는 `촬영 시작 몇 시간 전/후`를 선택합니다. 날짜 1~365일, 시간 1~8760시간의 정수를 서버에서도 검증합니다. 기존 규칙은 날짜 방식·19:00을 유지하며 즉시 발송 규칙은 변경하지 않습니다. 목록에도 실제 발송 기준을 표시합니다.
- `email_rules`의 timing_mode/send_time/hour_offset/scheduling_started_at을 추가합니다. 최초 적용이나 시간·상품 조건 변경 이전의 과거 예정 메일은 소급 발송하지 않습니다. 제목·본문만 수정하면 scheduling_started_at을 유지합니다. 기존 day_offset 제약과 호환되도록 시간 방식은 day_offset=1로 저장하되 계산에서는 hour_offset만 사용합니다.
- `/api/cron/reminders`는 매분 실행, 날짜 방식은 KST 달력 날짜, 시간 방식은 확정 촬영 시각에서 계산합니다. 확정 상태 예약 전체를 500개씩 읽으며 예약 예정 시각에 도달한 경우만 발송합니다. 지연/실패 시 최대 24시간 안에서 보완하고 사전 메일은 촬영 시작 이후 보내지 않습니다. 동일 규칙·예약·주소의 성공 기록은 재발송하지 않습니다. 발송 기록 조회 실패 시 발송을 중단합니다. SMTP 성공 직후 기록 저장이나 프로세스가 실패하면 중복 가능성이 남습니다(외부 SMTP와 DB는 하나의 트랜잭션이 아닙니다).
- 매분 중첩 실행은 DB의 service_role 전용 claim_reminder_cron/release_reminder_cron 토큰 잠금으로 방지하며 최대 300초 함수 실행/10분 잠금 만료를 사용합니다. 익명·로그인 사용자는 잠금 RPC를 실행할 수 없습니다. CRON_SECRET 누락 시도 차단합니다. 기존 SMS/알림톡은 19:00 이후에만 처리하고 이메일의 사용자 설정 시각에는 영향을 주지 않습니다.
- `vercel.json` Cron을 `* * * * *`로 설정했습니다. Vercel Hobby에서는 매분 Cron을 사용할 수 없으므로 Pro 여부 또는 외부 매분 스케줄러가 필요합니다. 요금제 확인 질문을 전달했으며 답변은 아직 없습니다. 현재 작업 브랜치만 푸시하고 SQL 적용 및 스케줄러 확인 전에는 master에 병합하지 않습니다.
- 적용 SQL: `supabase/migrations/20261028000100_email_rule_scheduling.sql`. 재실행 안전성, 기존 19:00/본문/시작 기준 보존, 잠금 중첩/다른 토큰 해제 차단/만료 복구, 함수 기본 실행 권한이 넓은 DB에서도 anon/authenticated 차단을 로컬 PostgreSQL로 검증했습니다. 317개 테스트, 린트/타입/빌드와 실제 규칙 수정 모달의 390/1440px 날짜·시각/시간 방식 전환, 활성 필드만 FormData에 포함, 즉시 발송 시 숨김, 가로 넘침 없음 확인. 운영 메일·문자·DB 쓰기는 하지 않았습니다.

### 2026-10-07 Hobby 매분 발송 스케줄러 — Supabase 설정 확인 대기
- 사용자 확인: Vercel Hobby, `20261028000100_email_rule_scheduling.sql` 실행 완료. Vercel Cron은 기존 하루 1회(KST 19:00)로 복원하여 Hobby 배포 제약을 피합니다.
- Supabase pg_cron + pg_net이 `/api/cron/scheduled-emails`를 매분 호출하도록 `docs/sql/supabase-minute-email-scheduler.sql`을 준비했습니다. 이 새 주소는 기존 운영 배포에는 없어 스케줄러를 먼저 등록해도 과거 날짜 발송 로직을 매분 실행하지 않습니다. 새 배포에서 기존 발송 처리/인증/잠금을 공유합니다.
- Supabase Vault에 `reservation_cron_secret`(Vercel CRON_SECRET과 동일), `reservation_site_url`(https 운영 주소)을 등록해야 합니다. 값은 채팅이나 SQL 파일에 넣지 않습니다. 두 확장 활성화·Secret 등록·스케줄러 SQL 실행 확인 이후 master 배포합니다. Supabase 스케줄러를 등록하지 않으면 지정 시각 발송은 하루 1회 점검으로 늦어질 수 있으므로 정확한 시각 기능 완료로 안내하지 않습니다.
- 스케줄러 등록 SQL은 같은 작업 이름으로 갱신하며 비밀값을 cron.job에 저장하지 않습니다. 함수는 anon/authenticated 실행을 명시적으로 차단하고 기존 DB 발송 잠금은 매분/하루 작업 중첩을 방지합니다. Supabase HTTP 요청은 비동기라 cron 성공만으로 메일 발송 성공을 보장하지 않으며 운영 점검 시 net._http_response/발송 로그를 함께 확인해야 합니다. 로컬에서 실제 스케줄러·메일·DB 쓰기를 실행하지 않습니다.

- 2026-10-07 사장님이 Supabase 스케줄러 설정 완료를 확인했습니다. 기존 발송 설정 SQL과 Hobby용 매분 스케줄러 선행 조건이 충족되어 master에 병합·푸시합니다. Vercel Ready 이후 새 발송 주소의 HTTP 응답과 이메일 발송 로그를 운영에서 확인해야 합니다. 운영 메일을 로컬에서 직접 발송하지 않습니다.

### 2026-10-07 고객DB 메일 편집 및 예약 변수 연결
- 고객DB 메일 발송 창에서 저장된 이메일을 선택해도 이메일 페이지와 같은 RichTextEditor로 제목·본문·최대 3개 버튼을 편집합니다. 변경은 이번 발송에만 적용하고 원본 규칙은 저장하지 않습니다. 메일 종류 변경 시 에디터 내용을 새 프리셋으로 교체합니다.
- 고객별 최근 신청 예약을 기본 연결하고 예약 선택/예약 연결 해제를 제공합니다. 상품·촬영일시·장소·예약번호·후보·예상 금액·선택 옵션·취소 사유를 DB에서 불러오며 계좌/공지는 설정값, 이름/연락처는 고객DB 값을 사용합니다. 모든 변수 삽입과 수신자별 변수 값 확인·직접 편집·원래 값 복원이 가능합니다. 결과물 URL/기존·변경 시각은 저장된 원본 정보가 없어 직접 입력해야 하며 없는 값을 임의로 추정하지 않습니다. 직접 추가한 수신자는 별도 공통 변수 값을 사용합니다.
- 서버는 발송 전 데이터를 재조회하고 선택한 예약의 고객 소속을 확인합니다. 고객·예약·옵션 조회 실패나 잘못된 변수 키/형식/버튼 URL은 발송 전에 중단합니다. 버튼 텍스트/URL에도 변수를 채웁니다. 추가 수신자만 있을 때도 발송할 수 있으며 이메일 없음 제외 건수가 음수가 되지 않도록 수정했습니다. 관리자 인증과 HTML 정화/변수 HTML 탈출을 유지합니다. DB 변경은 없습니다.
- 326개 테스트 통과, 타입/린트/빌드 및 실제 모달 390/1440px 검증: 프리셋 편집, 예약 자동 연결/교체, 고객별 변수 격리/초기화, 모든 변수 삽입 버튼, 결과물 URL/옵션 미리보기와 제출 FormData 일치, 가로 넘침 없음. 브라우저의 미리보기 Server Action 응답은 샘플 RSC로 대체했으며 DB 변수 로더는 별도 단위 테스트로 검증했습니다. 운영 발송/DB 쓰기는 실행하지 않았습니다.

### 2026-10-07 예약내역 수동 메일 및 고객DB 발송 기록
- 예약내역 각 행의 수동 메일은 고객DB와 같은 편집기를 사용하며 클릭한 예약 ID와 해당 예약의 이메일을 고정합니다. 서버에서 예약의 고객 소속과 일치하는 연결을 재확인합니다. 고객DB 생성 이전 예약도 예약 행으로 고객 정보를 보완하여 변수를 불러옵니다. 편집기는 버튼 클릭 때만 생성하고 닫으면 해제하여 목록의 모든 행에서 동시에 편집기를 만들지 않습니다.
- 고객DB 각 행에 메일 기록 버튼을 추가했습니다. 관리자 인증 후 전체 로그를 페이지 단위로 조회해 해당 고객 예약의 ID를 우선 연결하고, 예약 미연결 과거 기록은 고객DB/과거 예약/팀원 이메일 주소로 대조합니다. 날짜·수신자·성공/실패·오류·예약 연결 여부를 표시하며 열 때마다 다시 읽습니다. 이메일 서버 접수 성공이며 열람 여부는 아닙니다. 과거 로그에 제목/본문은 저장되어 있지 않아 내용은 복원하지 않습니다.
- 수동 메일의 새 로그에 기존 reservation_id를 저장하여 이메일 주소가 바뀌어도 예약 기반으로 연결합니다. 예약에 직접 추가한 수신자 로그도 같은 예약에 연결합니다. 로그 저장 오류를 알 수 있게 반환 오류를 확인하되 기존 알림 호출자의 catch를 유지해 메일 발송을 막지 않습니다. DB 변경은 없습니다.
- 327개 테스트와 타입/린트/빌드 검증, 실제 수동 발송/기록 모달 390/1440px: 클릭한 이전 예약 고정/폼 ID 일치, 예약 선택 변경 차단, 닫을 때 편집기 해제, 발송 실패/오류/예약 기록 표시, 가로 넘침 없음. 고객별 기록 연결은 별도 테스트로 검증했고 브라우저 Server Action 응답은 샘플로 대체했습니다. 실제 운영 메일은 발송하지 않았습니다.

### 2026-10-07 수동 메일 위치 및 고객별 기록 수정
- 예약 목록의 수동 메일 버튼을 제거하고 선택한 예약의 상세 패널에서 기록표 생성 옆에 배치합니다. 촬영일 미확정 예약도 수동 메일은 사용할 수 있습니다.
- 고객DB 메일 기록은 연락처로 고객을 구분하고 고객 본인의 현재·과거 이메일 수신 기록만 포함합니다. 예약 연결만으로 사장님 알림을 포함하지 않고 팀원 이메일도 제외합니다. 다른 연락처의 예약에 연결된 기록은 제외합니다.
- 예약 연결이 없는 과거 로그에는 연락처가 저장되지 않아 본인 이메일로 매칭합니다. 같은 이메일을 여러 고객이 공유한 과거 미연결 로그는 구분할 수 없습니다.
- 실제 상세 패널 임시 화면에서 390/1440px 버튼 나란히 배치를 확인했습니다. 임시 페이지는 삭제했습니다.

### 2026-10-07 메일 버튼 통일 및 중복 버튼 제거
- 수동 메일 autoOpen 모드에서는 발송 창 실행 버튼을 조건부로 렌더링하지 않습니다. 공통 Button의 inline-flex와 hidden 클래스 충돌로 노출된 '메일 발송 (1)'을 제거했습니다. 숫자는 발송 횟수가 아니라 선택 수신자 수였습니다.
- 수동 메일 및 고객DB 메일 기록은 기록표 생성과 동일한 공통 Button ghost 스타일·호버·클릭 애니메이션을 사용합니다.
- 임시 화면에서 390/1440px 공통 클래스 일치 및 발송 창을 연 뒤 중복 실행 버튼이 DOM에 없는 것을 확인했습니다. 서버 응답은 모킹했고 실제 메일은 발송하지 않았습니다. 임시 화면은 삭제했습니다.

### 2026-10-07 예약 전체 수정 — SQL 실행 확인 및 배포 반영
- 상세 패널(예약내역/예약관리 공통)에 `예약 수정` 버튼과 다른 관리자 편집 화면과 같은 모달을 추가했습니다. 고객 인적사항, 상품·상태·예약번호·접수일·유입경로, 확정 촬영 시작/종료·희망 시간 1~3지망·확정 후보 순위, 팀원 이메일, 신청서 전체 답변, 예상/실제 금액·구성·원가와 메모, 촬영 장소·손님 요청·관리자 메모·취소 사유, 결과물 전송/리마인드 기록 일시를 편집합니다. 내부 ID·캘린더 이벤트 ID·자동 갱신 시각은 운영 입력값이 아니므로 편집하지 않습니다.
- 상품 변경 시 저장된 과거 답변은 유지하고 새 상품/공통 활성 문항도 편집합니다. 실제 금액 구성은 일반 입력 행으로 편집하고 합계를 검증합니다. 예상 금액은 관리자가 확인해서 수정합니다. 운영상 과거/누락 예약을 보정해야 하므로 현재 신청서 필수 조건을 과거 예약 전체에 소급 강제하지 않습니다.
- `admin_edit_reservation` RPC가 예약·답변·후보·해당 연락처 고객 인적사항을 원자적으로 저장합니다. SQL 파일: `supabase/migrations/20261029000100_admin_edit_reservation.sql`. 인증 계정만 실행 가능하며 원본 updated_at으로 동시 편집을 감지합니다. 날짜 정합성, 확정 상태의 일정, 취소 사유, DB 이중예약 제약, 상품별 정리 시간을 적용합니다. 예약 수정은 이 예약에만 적용합니다(동일 연락처의 다른 예약 자체를 일괄 수정하지 않음).
- 저장 성공 후 관리자 예약/고객/매출/통계와 고객 조회를 갱신하고 기존 시트/캘린더 동기화를 호출합니다. 고객 안내 메일은 자동 발송하지 않습니다. 변경하지 않은 접수/촬영/발송 기록 일시의 초 단위 값은 보존합니다. 실패 시 모달과 입력값을 유지합니다.
- 341개 테스트 및 타입·린트 검사 통과. PGlite의 실제 PostgreSQL에서 SQL 실행/관리자 인증/답변·후보 실패 시 전체 rollback/정리 시간/캘린더 ID 보존/고객 동기화/동시 수정/이중예약을 검증했습니다. 운영 DB 접속은 하지 않았습니다. 임시 미리보기에서 390/1440px 표시·KST·답변/금액 불러오기·수정/저장 오류 유지·가로 넘침을 검증했고 임시 페이지는 삭제했습니다. 미리보기 서버 응답은 모킹했습니다.
- 사용자가 SQL 실행 완료를 확인했고 work를 master에 병합·푸시했습니다(예약 전체 수정 반영 커밋 03135af). Vercel Ready 상태는 직접 확인하지 못했습니다.

### 2026-10-07 모바일 예약 디자인 및 상품별 문구 — Preview 전용
- `preview/mobile-booking-copy` 브랜치에서 상품설명 → 희망 시간 → 신청서 묶음 → 최종 확인 → 접수 완료 화면을 통일했습니다. 모바일 좌우 26px, 흰 배경, #044AAD 주요 버튼, 가격과 신청 절차를 한 카드 안에서 연결하고 하단 CTA 공간을 확보했습니다. 기존 상품 상세 서식·전달 안내·문항·유료 옵션·계좌/공지 기능을 유지합니다.
- 상품수정 화면 하단 `예약 페이지 문구`에서 단계별 제목/설명, 가격 안내, 신청 절차, 접수 이후 안내를 수정합니다. 문항별 묶음(배우/연락/요청/동의)과 입력 예시를 지정할 수 있습니다. 문항 제목·설명·선택지·필수 여부는 기존 문항 편집기를 사용합니다. 상품명/가격/시간은 상품값, 예약번호/상태/검증/중요 안내 및 주요 버튼은 고정입니다.
- 저장 위치는 기존 settings.booking_style.productCopies[productId] JSON입니다. 새 SQL은 필요 없습니다. 디자인 설정 저장 시 다른 상품 문구를 보존하고 JSON compare-and-swap으로 동시 수정 손실을 방지합니다.
- 신청서 문항은 묶음별로 항상 펼쳐집니다. Enter로 다음 문항 또는 묶음으로 이동하고 Shift+Enter는 장문 줄바꿈, IME 조합 Enter는 이동하지 않습니다. 답변/희망 시간은 탭 메모리에 유지하고 실제 접수 성공 후 답변 초안을 제거합니다. 시간 경과 자동 이동은 없습니다.
- 임시 실제 컴포넌트 화면에서 390px 가로 넘침, Enter 이동, 그룹별 필수 검증, 70,000원+15,000원 옵션=85,000원, 확인 화면 전체 답변 및 되돌아가기 입력 유지를 검증했습니다. 실제 DB 접수/메일 발송은 수행하지 않았습니다. 임시 경로는 검증 후 삭제했습니다.
- 운영 master는 변경하지 않습니다. 로컬 build는 환경의 Google Fonts 접근 실패로 중단됩니다. GitHub 배포 상태 API 접근도 환경 네트워크 제한으로 차단됩니다. Preview Ready 여부는 별도 확인이 필요합니다.

### 2026-10-07 Preview 예약 화면 설정 누락 오류
- 사용자가 Vercel 로그에서 `NEXT_PUBLIC_SUPABASE_URL` 누락을 확인했습니다. Production 변수 등록만으로 Preview 환경에 적용되지 않으므로 기존 Supabase URL/공개 키/서버 비밀 키의 적용 환경에 Preview를 추가하고 재배포해야 합니다. 키 값은 채팅에 요청하지 않습니다.
- 예약 레이아웃/상품 목록/상세/일정/신청서와 상세 메타데이터에 누락 설정 검사를 추가했습니다. 연결 설정이 없으면 일반 서버 오류 대신 누락 변수명과 Preview 적용·Redeploy 안내를 표시합니다. 설정 안내는 연결을 대체하지 않으므로 Vercel 설정 보완은 별도로 필요합니다.
- 누락 환경에서 DB 연결을 시도하지 않고 안내를 반환하는 회귀 테스트를 추가했습니다. 운영 master에는 반영하지 않고 기존 Preview 브랜치에만 푸시합니다.

### 2026-10-08 예약 문구 수정 및 예약금 전체 토글 — Preview 전용
- 요청한 01~08 화면 문구를 반영하고 동의/최종 확인 설명은 기본 숨김 처리했습니다. 기존 편집 항목은 유지합니다. 상품 소개·신청 절차 01~03·완료 후 안내 및 새 nextNote를 상품별로 편집할 수 있습니다. 가격 안내/예약번호 안내 위 간격은 12px에서 4.8px(40%)로 줄였습니다. 예전 기본 문구만 새 기본값으로 변환하고 개별 저장 문구는 보존합니다.
- 관리자 설정에 스튜디오 전체 예약금 ON/OFF를 추가했습니다. 새 신청 INSERT 시 DB 트리거가 모드를 저장하고 이후 UPDATE에서도 기존 값을 유지합니다. 기존 예약은 ON입니다. OFF 예약은 일정확정으로 예약확정, 완료/노쇼로 전환하고 되돌리면 일정확정으로 돌아갑니다. 실제 결제금액/매출/잔고 기록과 계산은 보존합니다.
- OFF 고객 화면·예약조회·자동/예약/수동메일 렌더에서 예약금/입금/계좌 안내를 제외합니다. 저장된 원본 메일 규칙은 유지하며 ON 예약에는 기존 안내를 사용합니다. 예약별 모드 조회 실패 시 잘못된 안내를 발송하지 않도록 중단합니다.
- 새 SQL: supabase/migrations/20261030000100_deposit_mode.sql. 운영 DB에는 실행하지 않았습니다. 실행 전 토글 저장은 오류 안내로 막습니다. 사용자 SQL 실행 확인 전 master 병합 금지, preview/mobile-booking-copy에만 반영합니다.
- 타입 검사, 352개 테스트, 린트 통과(기존 경고 6개). PGlite에서 SQL 재실행/기존 ON·금액 보존/새 ON·OFF/클라이언트 조작 방지/모드 불변/코드 조회를 확인했습니다. 실제 컴포넌트의 390px 모바일 8개 화면 및 관리자 토글을 렌더링했고 가로 넘침은 없습니다. 임시 화면은 삭제했습니다. 실제 예약 접수·메일 발송은 하지 않았습니다.
- Preview 배포 원격 확인은 네트워크 제한으로 불가하며 운영 Supabase 환경변수도 이 작업 환경에 없습니다. 로컬 전체 build는 Google Fonts 접근 제한으로 검증하지 못합니다. 리뷰용 HTML/이미지는 /workspace/.reviews/current-settings-mock에 있습니다.

### 2026-10-08 모바일 예약 및 예약금 토글 프로덕션 반영
- 사용자가 20261030000100_deposit_mode.sql 실행 완료를 확인했습니다. preview/mobile-booking-copy의 검증된 변경을 master에 병합합니다. 예약금 전체 설정은 새 신청부터 적용하며 기존 예약의 ON 모드와 결제/매출 기록을 보존합니다.
- 목업의 기존 ON/새 OFF 비교 예시 버튼은 실제 관리자 화면에 포함되지 않습니다. 타입·352개 테스트·린트 및 로컬 SQL 검증 결과는 위 기록과 같습니다. 병합 트리는 검증된 Preview 코드와 동일하며 문서만 추가합니다.
- master 푸시는 Vercel 프로덕션 배포를 시작합니다. 이 환경의 네트워크 제한으로 Vercel Ready 상태는 직접 확인하지 못합니다.

### 2026-10-08 예약내역 기본 정렬
- 임박한 촬영부터 확인하려는 요청에 따라 기본 정렬을 촬영일 빠른 순(shoot_asc)으로 변경했습니다. 날짜 미정 예약은 마지막에 표시하고 사용자가 다른 정렬을 선택할 수 있습니다. 기존 비교 로직과 필터는 유지합니다.

### 2026-10-08 Pretendard 및 상세 내용 카드 — 프로덕션 반영
- 서식 편집기에 Pretendard 선택을 추가하고 v1.3.9 dynamic-subset 웹폰트를 사이트/메일 미리보기에 연결했습니다. 기본 본고딕은 유지합니다. 저장 허용 목록은 FONT_FAMILIES에서 자동 반영됩니다. 메일 앱의 실제 웹폰트 지원은 앱마다 다릅니다.
- 상품 상세 내용에 가격·절차 카드와 같은 흰 배경/15px 모서리/테두리/음영을 적용했습니다. 모바일 20px, PC 24px 내부 여백입니다. 기존 본문과 저장된 서식은 수정하지 않습니다.
- 사용자가 렌더를 확인하고 푸시를 승인했습니다. master에 반영합니다. /workspace/.reviews/detail-card에 PC·모바일 렌더가 있습니다. 예시 본문은 사용자 이미지 기준으로 구성했습니다. 브라우저 CDN 직접 접근은 인증서 신뢰 문제로 불가하여 같은 버전의 Pretendard 파일을 내려받아 임시 로컬 경로로 실제 렌더와 한글 폰트 로딩을 검증했습니다. 임시 페이지·폰트·빌드 설정은 제거/복원했습니다. 모바일 가로 넘침 없음, 타입 검사 및 352개 테스트·린트 통과.

### 2026-10-08 가격 간격 및 Pretendard 저장 수정
- 상품 상세 가격 영역의 줄 사이 여백을 기존의 35%로 조정했습니다(12→4.2px, 22→7.7px, 6→2.1px, 안내 4.8→1.68px). 글자 자체의 줄높이를 35%로 줄여 겹치게 하지 않고 줄 사이 여백만 축소합니다. 할인 태그는 정가 오른쪽으로 옮겼으며 할인 없는 상품에는 표시하지 않습니다.
- 브라우저가 Pretendard의 작은따옴표를 제거하여 저장 허용 정규식과 달라져 font-family가 삭제되는 오류를 수정했습니다. 등록된 글꼴 스택만 따옴표/공백/대소문자 변형을 허용하며 메뉴 표시도 동일하게 정규화합니다. 기존 필터에서 삭제된 서식은 글꼴을 다시 선택하고 저장해야 합니다.
- 실제 Tiptap에서 선택/저장 필터/재마운트 후 font-family 보존을 확인했습니다. 가격 영역 PC·390px 렌더는 /workspace/.reviews/font-save에 있습니다. 임시 경로 삭제, 설정 복원 완료. 353개 테스트 및 타입/린트 통과(기존 경고 6개). 운영 DB 직접 수정은 수행하지 않았습니다.

### 2026-10-08 예약 첫 화면 문의 버튼
- 상품 목록 우측 하단에 3안의 흰색 플로팅 문의 버튼을 추가했습니다. 사용자 제공 오픈채팅 https://open.kakao.com/o/sfRpIEKi 로 새 창 연결합니다. 관리자 설정의 예약 첫 화면·문의하기에서 HTTPS 링크를 변경하고 빈 값 저장으로 숨길 수 있습니다. 기존 booking_style.inquiryUrl JSON을 CAS로 저장하므로 SQL은 필요 없습니다. 미설정은 제공 링크를 기본 사용하고 명시적 빈 값은 숨깁니다.
- 문의 버튼은 상품 목록에만 표시하며 날짜 선택/신청서의 고정 CTA와 겹치지 않습니다. 하단 공간과 safe-area를 확보했습니다. 임시 실제 컴포넌트 렌더에서 390px 가로 넘침 없음, 최하단 예약조회와 겹침 없음, 링크/새 창 설정을 확인했습니다. 임시 경로 삭제 및 설정 복원 완료. 타입·353개 테스트·린트 통과(기존 경고 6개).
- 이어지는 달력 클릭 기반 화면 이동 요청은 방안 제시 단계입니다. 문의 기능 푸시 후 레퍼런스/이론을 검토하며, 달력 이동은 아직 구현하지 않습니다.

### 2026-10-08 달력 클릭 기반 단계 안내 스크롤
- 사용자가 방안을 승인하여 날짜 클릭 시 시간 선택 영역, 세 번째 후보 추가 클릭 시 예약 요약으로 이동합니다. 1/2개 선택·삭제·초안 복원은 자동 이동하지 않습니다. 다음 단계는 계속 명시적인 버튼 클릭으로 진행합니다.
- lib/booking/click-scroll.ts는 클릭 핸들러에서만 호출하며 DOM 갱신 후 다음 프레임에 목표 좌표를 계산합니다. 이미 충분히 보이면 생략하고 스크롤 최대값을 넘지 않습니다. 280~450ms 감속 이동, 모션 감소 시 즉시 이동, 휠/터치/포인터/키 입력·언마운트·다음 클릭 시 취소합니다. 늦은 시간 조회 응답으로 다시 이동하지 않습니다. 시간 영역의 최소 높이와 24px 상단 여백을 확보합니다.
- 실제 컴포넌트의 390x844 화면을 녹화했습니다. 날짜 후 scrollY736, 1/2개 선택 동일736, 3개 후793, 삭제 후793 유지 및 다음 버튼 활성화/모션 감소 이동을 확인했습니다. 시연은 예시 슬롯이며 실제 접수하지 않았습니다. /workspace/.reviews/calendar-motion/index.html 및 demo.mp4로 확인합니다. 임시 페이지 제거 및 설정 복원 완료. 타입/353개 테스트/린트 통과(기존 경고 6개).

### 2026-10-08 달력의 핵심 행동 대상 중앙 정렬
- 상단 제목 기준 이동을 핵심 요소 중심 정렬로 변경했습니다. 날짜 클릭은 시간 버튼 묶음, 첫/두 번째 시간 추가는 같은 버튼 묶음 중심 유지, 세 번째 추가는 희망 시간 3개 목록 중심으로 이동합니다. 클릭 트리거/삭제 시 위치 유지/모션 감소/수동 중단/다음 버튼 명시적 클릭은 유지합니다.
- 로딩과 버튼 영역을 190px 최소 높이로 안정화하고 버튼 묶음을 수직 중앙 정렬합니다. 화면 중앙은 visualViewport의 높이/offsetTop 기준이며 목록 끝에서 필요한 하단 공간만 추가해 스크롤 최대값 때문에 중앙 정렬이 막히지 않게 했습니다. 예약 요약은 고정 위치와 중앙 스크롤의 충돌을 피하도록 일반 문서 흐름에 둡니다.
- 실제 390x844 렌더에서 시간 버튼 중심421.75px, 선택 목록 중심421.5px(화면 중심422px)을 확인했습니다. 첫/두 번째 선택 scrollY469 유지, 세 번째854로 이동, 삭제854 유지 및 모션 감소 이동 확인. 녹화 /workspace/.reviews/calendar-centered/index.html·demo.mp4. 임시 경로 제거/설정 복원, 타입·353개 테스트·린트 통과(기존 경고 6개).

### 2026-10-08 — 유효한 다음 행동 버튼에 내부 물결 강조
- `BookingCTA`는 현재 단계 입력이 유효할 때만 1.3초 내부 물결을 반복합니다. 필수 답변과 입력한 선택 답변의 도메인·브라우저 유효성을 함께 확인합니다.
- 일정 후보 3개 완료 후 중앙 이동이 안정되면 신청서 작성 버튼을 강조합니다. 후보 삭제, 입력 오류, 처리 중에는 멈춥니다.
- 신청서 모든 그룹의 다음/확인 버튼 및 최종 신청 버튼에 적용했습니다. Enter 이동과 직접 클릭 제출을 유지하며 자동 진행은 추가하지 않았습니다.
- 모션 감소 설정에서는 물결 대신 정적인 테두리를 사용합니다. 실제 모바일 컴포넌트에서 일정 중앙 정렬·선택/삭제·각 그룹 완료·잘못된 이메일·최종 확인을 검증했습니다.

### 2026-10-08 — 배우 정보 한 화면 배치와 생년월일 슬롯 입력
- 생년월일은 실제 native input의 8자리 값을 FormData로 유지하면서 Code Slots 스타일 숫자 애니메이션을 표시합니다. 연·월·일 사이의 점은 아래 정렬입니다. 숫자 붙여넣기·자리 수정·Enter 이동·나이 정보는 유지됩니다.
- 배우 정보 그룹(0)의 성별 클릭은 생년월일 입력으로 초점을 이동합니다. 이름·성별·생년월일이 모두 채워지고 그룹의 다른 문항도 유효할 때만 다음 그룹으로 자동 이동합니다. 다른 그룹과 최종 제출은 기존 방식입니다. 조합 중인 한글 입력에서는 이동하지 않습니다.
- 자동 이동 이후 뒤로 돌아와 유효한 값을 수정할 때 재차 강제로 넘기지 않습니다. 항목이 다시 미완성/무효가 된 뒤 완성되면 자동 이동이 다시 가능합니다. 초기 복원 자체는 자동 이동하지 않습니다.
- 배우 정보 그룹이 정확히 이름·성별·생년월일 3개이면 모바일에서 375×812 기준 한 화면 배치합니다. 관리자 추가 문항·설명은 보존하며 긴 내용/작은 화면에서는 필요한 스크롤을 허용합니다.
- 실제 컴포넌트에서 한 화면 배치, 성별 초점, 잘못된 날짜/미완성 유지, 자동 이동, FormData 보존, 뒤로가기 및 자리 수정/붙여넣기, 연락처 Enter 이동을 확인했습니다. DB 변경 없음.

### 2026-10-08 — 모바일 키보드가 신청서 입력을 가리는 문제 수정
- `useBookingKeyboard`는 `visualViewport`의 실제 높이/offsetTop과 축소 이전 높이를 사용합니다. 모바일 키보드가 열린 동안 하단 금액·다음 버튼을 숨기고, 충분한 아래 공간을 확보해 활성 입력(생년월일은 슬롯 행)을 보이는 화면 중앙에 둡니다. 닫히면 고정 버튼을 복원합니다. 줌은 키보드로 취급하지 않습니다.
- 성별 라디오 클릭의 capture 단계에서 생년월일 native input에 동기적으로 focus합니다. 다음 프레임의 focus는 iOS 키패드 사용자 동작 조건을 잃을 수 있어 제거했습니다. inputMode=numeric 유지.
- 브라우저에서 viewport 축소/offset을 모사해 이름·생년월일·연락처·이메일 중앙 정렬, 고정 버튼 숨김/복원, 클릭 중 동기 focus, 입력 보존 및 Enter 이동을 확인했습니다. 실제 iOS 키패드 개방은 실기기 미검증입니다.

### 2026-10-08 — 연락 정보 라벨형 입력 / 전체 신청서 공통 동작 확인

- `BookingContactInput`으로 전화번호·이메일 입력 테두리와 라벨을 통일. 휴대폰 숫자 입력은 최대 11자리, `010-1234-5678` 자동 표시. 하이픈 위치에서 삭제할 때 인접 숫자까지 삭제해 커서가 갇히지 않게 처리. 붙여넣기·자동완성·기존 FormData/검증 흐름 유지.
- 모든 상품의 `ReservationForm`에서 공통 적용. 배우 → 연락 → 요청 → 동의 순, 항상 열린 문항, 배우 정보 완료만 자동 이동, 다른 그룹은 Enter/버튼, 최종 확인은 직접 제출 유지.
- 실제 공통 컴포넌트 모바일375px에서 4개 그룹 검증: 성별 클릭 생년월일 초점, 배우 유효 답변 자동 이동, 잘못된 전화·이메일 이동 차단, 하이픈 입력/삭제/붙여넣기, Enter 다음 문항/그룹, Shift+Enter 줄바꿈, 확인 화면까지 접수 없이 이동. VisualViewport 키보드 모의 축소에서 전화·이메일·장문 입력 노출 및 하단 액션 숨김/복원 확인. 실제 iPhone 키패드는 직접 검증하지 못함.

### 2026-10-08 — 연락 정보 자동 이동 보완
- 연락 정보 그룹(1)에 자동 이동 연결. 전화번호는 유효한 11자리 완료 시 다음 문항에 동기 초점. 이메일과 기타 연락 문항은 blur로 입력 완료를 판단해 유효하면 다음 문항/그룹으로 이동. 이메일 타이핑 중 `.co`에서 `.com`을 잘라버리는 조기 이동 방지. Enter 이동 유지, 자동 이동용 지연 타이머 없음.
- 선택 이메일 빈칸은 자동 생략하지 않으며 Enter/다음 버튼으로 생략. 자동 통과 문항 ID를 ref에 기록해 뒤로 돌아온 유효 문항에 초점만 주었을 때 강제로 다시 이동하지 않음; 수정하면 재검증.
- 실제 모바일 공통 컴포넌트 검증: 전화 11자리 → 이메일 자동 초점, 유효 이메일 blur → 요청 페이지 자동 이동, 잘못된/입력 중 이메일 이동 안 함, 전체 주소 보존, 뒤로 돌아가 편집 가능.

### 2026-10-08 — 촬영 요청 페이지 진입 위치
- `nextGroup()`에서 촬영 요청(group2) 진입 시 `revealField()` 자동 초점을 생략. 이전 입력을 blur해 키패드를 닫고 다음 렌더에서 페이지 최상단으로 즉시 이동. 문항을 직접 누른 뒤의 키패드 대응과 Enter 문항 이동은 유지.
- 실제 모바일 공통 컴포넌트에서 연락 정보 자동 완료 → 촬영 요청 페이지 진입 후 scrollY=0, 첫 입력 자동 초점 없음, 클릭 초점 정상 확인.

### 2026-10-08 — 요청 페이지 키패드 종료 후 스크롤 재보정
- group2 진입 뒤 visualViewport resize/scroll과 window resize에 최상단을 다시 맞춰, 키패드가 늦게 닫히며 이전 스크롤 위치로 복원되는 상황 대응. 사용자가 pointer/touch/wheel/key로 조작하면 보정 중단, 입력에 초점이 있으면 보정 생략. 다른 그룹 진입/언마운트 때 리스너 정리.
- 실제 공통 컴포넌트 모바일 전환 녹화 + 뒤늦은 viewport resize/pan 모의 검증: 연락 완료 → 요청 페이지 scrollY=0, 직접 문항 클릭 초점 유지. 영상은 `/workspace/.reviews/contact-design/page-2-to-3.mp4`/GIF. 실제 iPhone 키패드 동작은 여전히 직접 검증하지 못함.

### 2026-10-08 — 새로고침 신청서 복원
- 메모리 answerDrafts에 더해 productId별 sessionStorage `booking-draft:v1:*`에 답변과 현재 그룹을 입력마다 저장. hydration 후 한 번 복원하고 문항 영역을 remount해 native defaultValue, Code Slots, 체크/라디오를 동기화. 완료 시 메모리/세션 제거, 24시간 지난 draft 삭제. 저장소 접근 불가 시 메모리 방식 유지.
- 전체 신청서 동일 적용, 문항ID 기준 복원하며 삭제 문항은 제외. 같은 탭 새로고침을 위한 저장이고 장기 localStorage 저장은 하지 않음.
- 실제 모바일 컴포넌트 reload 테스트: 이름/성별/생년월일/하이픈 연락처/이메일/여러 줄 요청/동의/현재 그룹 복원, 만료 시 초기화 통과.

### 2026-10-08 — 승인된 문항/페이지 전환 애니메이션
- 다음 문항으로 이동할 때 smooth scroll + 활성 문항 테두리/배경/그림자 280ms transition. 키패드가 닫힌 경우 viewport 위치 보정도 smooth; 키패드가 열린 경우 입력 가림 방지를 위한 즉시 보정 유지.
- 그룹/확인 페이지 전환에 DOM 교체 없이 Web Animations 280ms fade + translateY(12px→0). 입력값 remount 없이 유지, 요청 페이지 최상단 진입 보정 유지. reduced-motion에서 이동/강조 애니메이션 생략.
- 사용자 승인 영상 `/workspace/.reviews/question-motion/demo.mp4`를 기준으로 반영. 실제 모바일 컴포넌트 영상 검증에서 연락처→이메일→요청 페이지 이동 및 데이터 보존 확인.

### 2026-10-08 — iPhone 첨부 영상 기준 이동·여백 수정
- 사용자 실기기 영상(연락처→이메일) 확인: 문항 scrollIntoView와 키패드 hook 보정이 중복되어 위치 변경이 여러 번 발생. 모든 문항 이동은 focus-driven 키패드 hook 하나가 담당. focus 이동은 smooth, viewport resize는 실제 가림 때만 즉시 보정; focusout/resize마다 350ms 뒤 반복 보정하던 타이머 제거. 작은 문항은 박스 전체 기준, 큰 문항은 실제 입력 기준으로 위치 계산.
- 모든 그룹/최종 확인/뒤로 이동에서 자동 입력 focus를 없애고 헤더부터 시작. viewport 종료 후 최상단 재보정 공통 적용. 전환을 발생시킨 Enter/click이 새 페이지 보정을 중단시키지 않도록 조작 취소 리스너를 다음 frame에 설치.
- 기존 input :not 선택자의 specificity가 새 contact outline보다 높아 좌우 padding 0과 사각 테두리가 남았음. 우선순위 수정, 실제 text/tel/email/textarea 내부 padding 14px 균등화. 생년월일의 투명 overlay는 padding 0 유지.
- 실제375px 공통 컴포넌트 검증: 모든 그룹과 확인 페이지 scrollY=0, 페이지 진입 자동 focus 없음, 키패드 영역 입력 노출, 연락처 자동 focus, 이메일 상하/좌우14px·radius9px, 이전 이동 최상단. 실기기 동작의 수정 후 직접 검증은 못 했고 키패드는 모의 검증. 영상 `/workspace/.reviews/mobile-transition-fix/fixed.mp4`.
