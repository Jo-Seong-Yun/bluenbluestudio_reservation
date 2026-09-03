# 푸르른 스튜디오 예약 사이트 개발 로드맵

사진/영상 촬영 스튜디오 '푸르른 스튜디오'의 예약을 받는 웹사이트를 만든다.
'되는시간'처럼 **손님이 비어 있는 시간을 보고 직접 예약을 잡는** 흐름이 핵심이다.

---

## 0. 프로젝트 개요

### 목표
손님이 카카오톡/DM으로 "언제 되나요?"를 물어보지 않아도 되게 만든다.
사이트에 들어오면 → 촬영 상품을 고르고 → 예약 가능한 시간을 보고 → 신청까지 끝낸다.

### 범위 결정 (확정)

| 항목 | 결정 |
|---|---|
| 예약 대상 | 사진/영상 촬영 (상품별 소요시간·가격 상이) |
| 개발 방식 | 처음부터 실서비스용 스택 (Next.js + Supabase) |
| 온라인 결제 | **MVP 제외.** 사이트는 예약 신청까지, 입금·결제는 계좌이체/현장결제 |
| 운영자 | 1인 (사장님 = 관리자 1명 가정, 작가 여러 명은 확장 항목) |

### 비목표 (지금은 안 만든다)
- 온라인 결제 / 환불 자동화
- 회원가입 기반 마이페이지 (예약 조회는 예약번호 + 연락처로)
- 후기/평점, 포트폴리오 CMS, 다국어

---

## 1. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | **Next.js (App Router) + TypeScript** | 서버 컴포넌트로 예약 가능 시간을 서버에서 계산해 내려줄 수 있음. Vercel 배포가 무료·즉시 |
| 스타일 | **Tailwind CSS + shadcn/ui** | 예약 UI에 필요한 캘린더·다이얼로그·폼을 직접 안 만들어도 됨 |
| DB / 인증 | **Supabase (Postgres + Auth)** | 무료 티어로 시작 가능. 아래 '이중예약 방지'에 필요한 Postgres 기능을 그대로 씀 |
| 폼 검증 | react-hook-form + zod | 클라이언트·서버 양쪽에서 같은 스키마 재사용 |
| 날짜 처리 | date-fns + date-fns-tz | 한국 시간(Asia/Seoul) 고정 처리 |
| 알림 | 솔라피(SMS/알림톡) 또는 Resend(이메일) | 3단계에서 상세 결정 |
| 배포 | Vercel | main 브랜치 푸시 = 배포 |
| 테스트 | Vitest | 시간 계산 로직 전용. UI 테스트는 후순위 |

### 저장소 구조 (목표)
```
/app
  /(site)          손님용 페이지 — 랜딩, 상품, 예약, 예약조회
  /admin           관리자 백오피스
  /api             예약 생성/취소 등 라우트 핸들러
/components        UI 컴포넌트
/lib
  /availability    ★ 예약 가능 시간 계산 엔진 (순수 함수, 테스트 대상)
  /supabase        DB 클라이언트
  /validation      zod 스키마
/supabase
  /migrations      SQL 마이그레이션
/docs              문서 (이 파일 포함)
```

---

## 2. 핵심 도메인 모델

예약 사이트의 난이도는 화면이 아니라 **"언제가 비어 있는가"를 정확히 계산하는 것**에 있다.
먼저 개념을 정리한다.

- **상품(product)** — "프로필 촬영 60분", "제품 촬영 2시간" 등. 소요시간·가격·설명·최대인원을 가짐
- **룸(room)** — 촬영 공간. 하나면 단순하지만, 처음부터 여러 개를 가정하고 설계해두면 나중에 편함
- **영업시간(business_hours)** — 요일별 오픈/마감
- **휴무(closed_day)** — 공휴일, 임시휴무, 사장님 개인 일정
- **버퍼(buffer)** — 촬영 전 세팅 / 후 정리 시간. 예약과 예약 사이에 반드시 확보
- **예약(reservation)** — 상품 + 룸 + 시작~종료 시각 + 손님 정보 + 상태
- **예약 상태** — `requested`(신청됨) → `confirmed`(확정) → `completed`(완료) / `cancelled`(취소) / `no_show`

### 스키마 스케치

```sql
create type reservation_status as enum
  ('requested','confirmed','completed','cancelled','no_show');

create table products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  duration_min  int  not null,           -- 촬영 소요시간
  buffer_before_min int not null default 0,
  buffer_after_min  int not null default 30,
  price         int  not null,
  is_active     boolean not null default true,
  sort_order    int  not null default 0
);

create table rooms (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  is_active boolean not null default true
);

create table business_hours (
  id          uuid primary key default gen_random_uuid(),
  weekday     int  not null check (weekday between 0 and 6),  -- 0=일
  open_time   time not null,
  close_time  time not null
);

create table closed_days (
  id        uuid primary key default gen_random_uuid(),
  period    tstzrange not null,   -- 하루 종일이면 그날 00:00~24:00
  reason    text
);

create table reservations (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,    -- 손님에게 알려줄 예약번호
  product_id    uuid not null references products(id),
  room_id       uuid not null references rooms(id),
  period        tstzrange not null,      -- 버퍼까지 포함한 점유 구간
  shoot_start   timestamptz not null,    -- 실제 촬영 시작 (손님에게 보여줄 시각)
  status        reservation_status not null default 'requested',
  customer_name text not null,
  customer_phone text not null,
  memo          text,
  created_at    timestamptz not null default now()
);
```

### ★ 이중예약 방지 — 이것만은 앱 코드로 막지 말 것

"조회해서 비었으면 INSERT" 방식은 두 명이 동시에 누르면 뚫린다.
DB 제약으로 막는다. Postgres의 배제 제약(EXCLUDE)을 쓴다.

```sql
create extension if not exists btree_gist;

alter table reservations add constraint no_overlap_per_room
  exclude using gist (
    room_id with =,
    period  with &&
  ) where (status in ('requested','confirmed'));
```

같은 룸에서 시간 구간이 겹치는 예약은 DB가 거절한다.
앱은 이 에러를 잡아서 "방금 다른 분이 예약했어요" 메시지를 보여주면 된다.

### 시간대 처리 원칙
- DB에는 전부 `timestamptz`로 저장 (UTC 기준 저장)
- 계산·표시는 항상 `Asia/Seoul`로 변환
- 절대 `new Date("2026-09-03 14:00")` 같은 문자열 파싱에 로컬 타임존을 맡기지 않는다

---

## 3. 예약 가능 시간 계산 엔진

프로젝트에서 가장 중요한 함수. 순수 함수로 분리하고 단위 테스트를 붙인다.

```
getAvailableSlots({ date, product, room }) →

1. 그날의 영업시간을 가져온다            (예: 10:00 ~ 20:00)
2. 슬롯 간격(30분)으로 후보 시각을 만든다  (10:00, 10:30, 11:00 ...)
3. 각 후보에 대해:
     점유구간 = [시작 - buffer_before, 시작 + duration + buffer_after]
     - 점유구간이 영업시간을 벗어나면          → 제외
     - 휴무(closed_days)와 겹치면              → 제외
     - 기존 예약(requested/confirmed)과 겹치면 → 제외
     - 지금부터 최소 리드타임(예: 24시간) 이내면 → 제외
     - 오늘부터 예약 가능 기간(예: 60일) 밖이면 → 제외
4. 남은 후보들을 반환
```

**결정해야 할 운영 규칙** (Phase 0에서 사장님이 확정)
- 슬롯 간격: 30분 / 1시간
- 촬영 전후 버퍼: 몇 분?
- 최소 리드타임: 당일 예약 받을 것인가, 최소 하루 전인가
- 예약 가능 기간: 몇 개월 앞까지 열어둘 것인가
- 취소 가능 기한: 촬영 며칠 전까지 손님이 스스로 취소 가능한가

---

## 4. 단계별 로드맵

파트타임 기준 예상 기간. 순서가 중요하지 기간은 유동적이다.

### Phase 0 — 기획·준비 (약 1주, 코딩 없음)
사장님만 할 수 있는 일. 이게 안 정해지면 뒤에서 계속 막힌다.

- [ ] 촬영 상품 목록 확정 — 이름 / 소요시간 / 가격 / 인원 / 설명
- [ ] 위 '운영 규칙' 5가지 확정 (버퍼, 리드타임, 예약가능기간, 취소기한, 슬롯간격)
- [ ] 영업시간·정기휴무 확정
- [ ] 손님에게 받아야 할 정보 확정 (이름, 연락처, 촬영 목적, 인원, 요청사항 …)
- [ ] 스튜디오 사진·소개 문구·로고 준비
- [ ] 도메인 구매 여부 결정

**완료 기준**: 위 내용이 문서 한 장에 정리되어 있다.

### Phase 1 — 프로젝트 기반 (약 1주)
- [ ] Next.js + TypeScript + Tailwind 프로젝트 생성
- [ ] shadcn/ui 설치, 기본 색/폰트 토큰 설정 (스튜디오 톤에 맞게)
- [ ] Supabase 프로젝트 생성, 로컬 개발 연결
- [ ] Vercel 연결 — main 푸시 시 자동 배포
- [ ] 환경변수 정리 (`.env.local`, Vercel 환경변수). **키는 절대 커밋하지 않는다**
- [ ] ESLint/Prettier, Vitest 세팅

**완료 기준**: "안녕하세요 푸르른 스튜디오입니다" 한 줄짜리 페이지가 실제 URL로 열린다.

### Phase 2 — 데이터 모델 (약 1주)
- [ ] 위 스키마를 마이그레이션 SQL로 작성
- [ ] `btree_gist` + EXCLUDE 제약 적용
- [ ] RLS 정책: 손님은 예약 생성만, 조회는 예약번호+연락처 일치 시. 관리자만 전체 조회/수정
- [ ] 시드 데이터 — 실제 상품·영업시간 입력
- [ ] 타입 생성 (`supabase gen types typescript`)

**완료 기준**: SQL 콘솔에서 겹치는 예약을 두 번 INSERT 하면 두 번째가 에러로 거절된다.

### Phase 3 — 가용 슬롯 엔진 (약 1~2주) ★ 최대 난관
- [ ] `lib/availability` 순수 함수 구현
- [ ] 단위 테스트 작성 — 이 케이스들은 반드시 포함
  - 영업시간 경계에 걸치는 촬영
  - 버퍼 때문에 붙여 잡을 수 없는 경우
  - 휴무일 / 부분 휴무
  - 리드타임 이내 슬롯 제외
  - 자정 넘김, 서머타임 없는 KST 확인
- [ ] 서버에서 특정 날짜의 슬롯을 반환하는 엔드포인트

**완료 기준**: UI 없이 테스트만으로 "이 날 예약 가능 시간" 이 정확히 나온다.

### Phase 4 — 손님 예약 플로우 (약 2주)
- [ ] 랜딩 페이지 — 스튜디오 소개, 사진, 위치, 예약 버튼
- [ ] 상품 선택 페이지
- [ ] 날짜 선택 캘린더 — 예약 가능한 날짜만 활성화
- [ ] 시간 선택 — 해당 날짜 슬롯 표시
- [ ] 정보 입력 폼 + **개인정보 수집·이용 동의 체크박스 (필수)**
- [ ] 예약 완료 화면 — 예약번호, 입금 계좌 안내, 유의사항
- [ ] 예약 조회/취소 — 예약번호 + 연락처로 확인
- [ ] 동시 예약 충돌 시 안내 처리
- [ ] 모바일 우선 반응형 (손님 대부분 모바일)

**완료 기준**: 사장님이 아닌 사람이 안내 없이 예약을 끝까지 완료할 수 있다.

### Phase 5 — 관리자 백오피스 (약 2주)
- [ ] Supabase Auth 로그인 (관리자 계정)
- [ ] 예약 목록 — 상태·기간 필터
- [ ] 주간/월간 캘린더 뷰
- [ ] 예약 확정 / 취소 / 완료 처리
- [ ] 수기 예약 등록 (전화로 들어온 예약)
- [ ] 휴무·개인일정 차단 등록
- [ ] 영업시간·상품 관리

**완료 기준**: 사장님이 DB를 직접 열지 않고 하루 운영이 가능하다.

### Phase 6 — 알림 (약 1주)
- [ ] 손님: 예약 신청 접수 / 확정 / 취소 알림
- [ ] 사장님: 새 예약 신청 알림
- [ ] 촬영 전날 리마인드 (Vercel Cron)
- [ ] 발송 실패 로깅 및 재시도

**참고**: 카카오 알림톡은 사업자등록 + 템플릿 심사가 필요하다.
심사 기간을 감안해 **이메일(Resend) 또는 SMS로 먼저 출시**하고 알림톡은 뒤에 붙이는 편이 낫다.

### Phase 7 — 출시 준비 (약 1주)
- [ ] 개인정보처리방침 / 이용약관 페이지 (연락처 수집 시 법적 필수)
- [ ] SEO — 메타태그, OG 이미지, sitemap, 네이버·구글 서치 등록
- [ ] 이미지 최적화 (`next/image`), Lighthouse 점검
- [ ] 접근성 — 키보드 조작, 대비, 폼 라벨
- [ ] Supabase 자동 백업 확인
- [ ] 에러 모니터링 (Sentry 무료 티어)
- [ ] 실제 손님 3~5명 대상 베타 테스트

**완료 기준**: 도메인으로 접속해 실제 예약이 들어온다.

### Phase 8 — 확장 (출시 이후, 선택)
- 온라인 결제 — 토스페이먼츠/포트원 연동, 예약금, 환불 규정 자동화
- 구글 캘린더 양방향 동기화
- 작가 여러 명 배정 / 라운드로빈
- 촬영 결과물 전달 (갤러리 링크, 만료 기한)
- 재방문 고객 관리, 예약 통계 대시보드

---

## 5. 마일스톤 요약

| # | 마일스톤 | 판단 기준 |
|---|---|---|
| M1 | 배포 파이프라인 완성 | 실제 URL이 열린다 |
| M2 | 이중예약이 DB에서 막힌다 | 중복 INSERT가 거절된다 |
| M3 | 가용 시간이 정확히 계산된다 | 엣지 케이스 테스트 통과 |
| M4 | **MVP — 예약이 들어온다** | 외부인이 예약을 완료한다 |
| M5 | 사장님이 사이트로 운영한다 | DB 직접 조작이 필요 없다 |
| M6 | 정식 오픈 | 알림 + 약관 + SEO 완료 |

가장 중요한 건 **M4**다. M5·M6 없이도 사이트는 장사를 시작할 수 있다.
백오피스가 없으면 초반엔 Supabase 대시보드로 버티면 된다.

---

## 6. 리스크와 주의점

| 리스크 | 대응 |
|---|---|
| 시간 계산 버그로 이중예약 발생 | DB 제약(EXCLUDE)으로 최종 방어. 앱 로직만 믿지 않는다 |
| 타임존 실수 | 전부 `timestamptz` 저장, 표시만 KST 변환. 테스트에 명시 |
| 개인정보 (이름·연락처) | 처리방침·동의 필수. 필요 최소한만 수집, 보관기간 정하기 |
| Supabase anon 키 노출 | RLS를 반드시 켠다. service_role 키는 서버에서만 사용 |
| 알림톡 심사 지연 | 이메일/SMS로 먼저 출시 |
| 범위 확장 유혹 | 결제·후기·포트폴리오는 M4 이후로 미룬다 |

---

## 7. 다음에 할 일

1. **Phase 0 체크리스트를 채운다** — 상품 목록과 운영 규칙 5가지
2. 정해지면 Phase 1 프로젝트 세팅부터 코드 작업 시작

Phase 0 답이 나오면 그 값으로 시드 데이터와 슬롯 엔진 기본값을 바로 세팅할 수 있다.
