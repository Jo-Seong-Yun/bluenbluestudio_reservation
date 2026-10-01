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
| 규모        | 커밋 약 540개(2026-09-03 ~ 2026-10-01), 마이그레이션 66개, 유닛 테스트 194개                                                                                         |

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
      layout.tsx           헤더(로고+메뉴 AdminNav), requireAdmin, 처리 중 오버레이
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
  reservation-form.tsx     신청서(상품별 문항 렌더링, 예상 금액 하단 바)
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
  - 공개 상품 카드: 태그색 왼쪽 띠, 썸네일(설정), 요약 2줄, 정가/할인가/할인율, "예약하기 →"
  - 하단 "이미 예약하셨습니까? 예약 조회 →" (/booking/lookup)
  - 디자인은 settings.booking_style(강조색/세일색/글자색·크기/모서리/카드크기)
  ▼
② /booking/[slug]  상품 상세 + 희망 시간 선택 (logProductView)
  - 넓은 화면(2xl): 왼쪽 박스 = 상품명·예약가능기간·가격·최대인원 + "상세 내용"(description)
                    오른쪽 = BookingFlow(달력 | 시간 선택 + 신청 버튼)
  - 좁은 화면: 상품명 → 상세 내용 → 달력 → 시간 순서로 쌓임
  - 달력: 가능일만 활성(loadAvailableDates), 월 이동은 가능 범위 안에서만(?month=YYYY-MM)
  - 날짜 클릭 → loadSlotsForDate(서버 액션)로 시간 버튼 표시
  - 희망 시간 **정확히 3개** 선택(토글, 3개 차면 나머지 비활성)
  - 버튼: "희망 시간을 3개 모두 선택해 주십시오"(비활성) → "이 3개 시간으로 신청하기"
  - 이동: /booking/[slug]/apply?slots=YYYY-MM-DD_HH-MM,...
  ▼
③ /booking/[slug]/apply  신청서 (logApplyView)
  - 서버가 후보 3개를 다시 검증(지났거나 그사이 찬 시간) → 하나라도 무효면 "다시 고르기" 화면
  - 상품별 문항(custom_fields)만 순서대로 렌더(이름/연락처도 문항 중 하나)
  - 연락처 하이픈 자동, 생년월일 입력 시 만나이/한국나이/미성년자 즉시 표시
  - 한 줄 입력에서 Enter = 다음 문항으로 이동(제출 아님)
  - 유료 옵션이 있으면 하단 고정 "예상 금액" 바
  ▼
④ createReservation (lib/booking/actions.ts)
  1. 후보 3개 스키마 검증(reservationSchema) → 문항 추출/필수 검증(extractReservationFormData)
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
- 결과는 완료/확정/취소 칸으로 구분 표시
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

- 월 선택(촬영일 `shoot_start` 기준). 대상 예약 상태: `payment_confirmed`, `completed`, `no_show`(입금된 예약)
- 매출 = 예약별 **실제 지불액(`charged_amount`)** 합. 지불액 미입력 예약 수를 따로 알려준다(예상 금액으로 대체하지 않음)
- 상품별: 건수, 매출, 원가(`cost`), 순이익, 수익률(= 순이익 ÷ 원가 × 100, "지출 대비")
- 지출: 기타지출(`kind=other`) / 고정지출(`kind=fixed`) — 일자·항목·금액·비고 추가/삭제
- 순이익 = 매출 − 원가 − 기타지출 − 고정지출

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

| 경로                            | 기능                      |
| ------------------------------- | ------------------------- |
| `/`                             | 홈                        |
| `/ig`                           | 광고 랜딩                 |
| `/booking`                      | 상품 목록                 |
| `/booking/[slug]`               | 상품 상세 + 희망 시간 3개 |
| `/booking/[slug]/apply?slots=…` | 신청서 → 완료 카드        |
| `/booking/lookup`               | 예약 조회/취소            |
| `/map`                          | 주소(미사용)              |

### 8-2. 관리자 메뉴 (`components/admin-nav.tsx` 순서)

상품관리 · 예약관리 · 예약내역 · 고객DB · 매출관리 · 통계 · 스케줄관리 · 디자인 · 이메일 · 설정 (`/admin` → `/admin/products`)

### 8-3. 예약관리 (`/admin/reservations`) — 달력 중심

- 월 달력(상태 색 점, 상품 태그색 칩, 날짜 칸 전체 클릭) + 오른쪽 **상세 패널**(`DetailPanel`)
- 확정 대기(후보만) 목록, 휴지통(취소 예약), 수기 예약 등록, 예약정보 시트 업로드
- URL: `?month=YYYY-MM&date=YYYY-MM-DD&id=<예약id>`

### 8-4. 예약내역 (`/admin/reservation-history`) — 표 중심

- 검색(이름/연락처/예약번호), 상태 필터, 정렬(예약시점/촬영일 빠른·느린 순), 건수 배지
- 열(고정 비율, 가로 스크롤 없음): **상태 배지(짧은 라벨) · 촬영일시 · 상품(태그색 배지) · 예약자 · 연락처 · 결제금액 · 접수일 · 상태 변경**
- **행 전체 클릭 → `?id=` 상세 패널**(`<tr onClick>` + 버튼/링크 클릭은 제외하는 `isInteractiveTarget`)
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
- 고객 플로우: [진입] → ① 상품 선택 → ② 상품 상세(+설명) + 희망 시간 3개 → ③ 신청서 → ④ 제출 → ⑤ 접수 완료.
- 표현: '팀원', 'N번째', ~합니다체.

---

## 11. 알려진 이슈 · 기술부채 · 남은 일

### 11-1. 즉시 정리하면 좋은 것

1. **`app/dev-preview-history4/` 가 프로덕션에 배포되어 있다**(임시 미리보기 페이지, 예시 데이터만). 삭제 권장.
2. **`.env.example` 누락**: `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`, `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_CALENDAR_ID`, `NEXT_PUBLIC_CLARITY_PROJECT_ID`, `SOLAPI_KAKAO_TEMPLATE_CUSTOMER_RESCHEDULED`.
3. **README / ROADMAP이 오래됨**: README의 이중예약 설명(`requested/confirmed`), 진행상황 등이 현재와 다르다. 현재 기준은 이 문서.
4. 예약내역 상태 변경 열의 안내 문구 "후보 확정 대기 — **예약번호를 눌러** 확정" → 예약번호 열이 없어졌으므로 "행을 눌러 확정"으로 고쳐야 함(`reservation-action-cell.tsx`).
5. 미사용 의존성 `docxtemplater`, `pizzip` 제거 후보. 레거시 테이블 `email_templates`, 미사용 컬럼 `products.gallery`(데이터 보존 중), `products.page_summary`(있다면) 정리 여부는 **사장님 확인 후**.
6. 기존 린트 에러 1건: `manual-reservation-button.tsx`의 useEffect 안 동기 setState(`react-hooks/set-state-in-effect`). 경고 5건(`_prev` 미사용).

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
npm test             # vitest run (194 tests)
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
