# 푸르른 스튜디오 예약 사이트 개발 로드맵

사진/영상 촬영 스튜디오 '푸르른 스튜디오'의 예약을 받는 웹사이트.
'되는시간'처럼 **손님이 비어 있는 시간을 보고 직접 예약을 잡는** 흐름이 핵심이다.

저장소: `Jo-Seong-Yun/bluenbluestudio_reservation`

---

## 0. 확정된 운영 규칙

| 항목           | 결정                                                                |
| -------------- | ------------------------------------------------------------------- |
| 슬롯 간격      | **1시간 단위, 정각 시작** (10:00, 11:00, 12:00 …)                   |
| 기본 촬영 시간 | **60분** (상품마다 다르게 지정 가능)                                |
| 최소 리드타임  | **당일 예약 불가. 내일부터 예약 가능**                              |
| 촬영 상품      | **관리자가 직접 추가·수정·삭제.** 설명도 자유 작성                  |
| 영업시간·휴무  | **관리자가 직접 설정.** 일정이 생기면 해당 슬롯을 막을 수 있어야 함 |
| 온라인 결제    | MVP 제외. 예약 신청까지만, 입금은 계좌이체/현장결제                 |

### 이 결정이 설계에 미치는 영향

**"내가 다 관리하겠다" = 관리자 기능이 MVP 필수다.**
원래 계획은 손님 화면을 먼저 만들고 관리자 화면을 나중에 붙이는 것이었지만,
상품도 영업시간도 코드에 하드코딩할 수 없으므로 **관리자 화면이 손님 화면보다 먼저** 나와야 한다.
관리자 화면이 없으면 손님 화면에 보여줄 데이터 자체가 없다.

그래서 아래 원칙을 따른다.

> **코드에 상수로 박히는 값을 최대한 줄인다.**
> 상품, 영업시간, 리드타임, 취소 기한, 계좌번호, 스튜디오 소개 문구까지
> 전부 DB에 두고 관리자 화면에서 바꾼다. 값을 바꾸려고 배포하는 일이 없어야 한다.

---

## 1. 기술 스택

| 영역       | 선택                                            | 이유                                                          |
| ---------- | ----------------------------------------------- | ------------------------------------------------------------- |
| 프레임워크 | **Next.js (App Router) + TypeScript**           | 서버에서 가용 시간을 계산해 내려줌. Vercel 배포 무료          |
| 스타일     | **Tailwind CSS + shadcn/ui**                    | 캘린더·다이얼로그·폼을 직접 안 만들어도 됨                    |
| DB / 인증  | **Supabase (Postgres + Auth)**                  | 무료로 시작. 이중예약 방지에 필요한 Postgres 기능을 그대로 씀 |
| 파일 저장  | **Supabase Storage**                            | 상품 사진 업로드용                                            |
| 설명 편집  | **마크다운 에디터** (`@uiw/react-md-editor` 등) | 상품 설명을 자유롭게 쓰기 위함                                |
| 폼 검증    | react-hook-form + zod                           | 클라이언트·서버 양쪽에서 같은 스키마 재사용                   |
| 날짜 처리  | date-fns + date-fns-tz                          | 한국 시간(Asia/Seoul) 고정                                    |
| 알림       | 솔라피(SMS) 또는 Resend(이메일)                 | Phase 8에서 확정                                              |
| 배포       | Vercel                                          | main 푸시 = 배포                                              |
| 테스트     | Vitest                                          | 시간 계산 로직 전용                                           |

### 저장소 구조 (목표)

```
/app
  /(site)              손님용 — 랜딩, 상품, 예약, 예약조회
  /admin               관리자 — 상품관리, 스케줄관리, 예약관리, 설정
  /api                 예약 생성/취소 라우트 핸들러
/components
/lib
  /availability        ★ 예약 가능 시간 계산 엔진 (순수 함수, 테스트 대상)
  /supabase
  /validation
/supabase/migrations   SQL 마이그레이션
/docs
```

---

## 2. 데이터 모델

### 2-1. 상품 — 자유롭게 추가하고 설명 쓰기

```sql
create table products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,              -- "프로필 촬영"
  slug          text unique not null,        -- URL용
  duration_min  int  not null default 60,    -- 촬영 시간 (기본 60분)
  buffer_after_min int not null default 0,   -- 촬영 후 정리 시간
  price         int  not null,
  summary       text,                        -- 목록에 보일 한 줄 소개
  description   text,                        -- ★ 마크다운. 자유롭게 작성
  cover_image   text,                        -- 대표 이미지 (Storage 경로)
  gallery       text[] default '{}',         -- 예시 사진들
  max_people    int,
  is_published  boolean not null default false,  -- 준비 중이면 비공개
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
```

**포인트**

- `description`은 마크다운으로 저장한다. 제목·목록·굵게·링크·이미지를 자유롭게 쓸 수 있다
- `is_published`가 있어서 **초안 상태로 만들어두고 나중에 공개**할 수 있다
- `duration_min`은 상품마다 다르게 — 60분이 기본이지만 "제품 촬영 2시간"도 가능
- 상품을 지우면 과거 예약 기록이 깨지므로, **삭제는 실제로는 `is_published = false` 처리**로 한다

### 2-2. 스케줄 — 학생 일정에 맞춘 3층 구조

일정이 그때그때 달라지는 상황에 맞추려면 한 가지 방식으로는 부족하다. 세 층으로 나눈다.

```
1층  weekly_hours    반복 운영시간   "학기 중 평일은 18시 이후, 주말은 종일"
       ↓ 덮어씀
2층  date_overrides  날짜별 예외     "10월 5일은 시험이라 종일 휴무"
       ↓ 덮어씀
3층  blocks          시간 구간 차단   "이번 주 목요일 14~16시 갑자기 약속 생김"
```

아래 층이 위 층을 이긴다. 즉 `blocks`가 최종 결정권을 가진다.

```sql
-- 1층: 요일별 기본 운영시간 (한 요일에 여러 구간 가능)
create table weekly_hours (
  id         uuid primary key default gen_random_uuid(),
  weekday    int  not null check (weekday between 0 and 6),  -- 0=일요일
  open_time  time not null,
  close_time time not null
);

-- 2층: 특정 날짜만 다르게
create table date_overrides (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  is_closed  boolean not null default false,  -- true면 그날 종일 휴무
  open_time  time,                            -- is_closed=false면 이 시간으로 대체
  close_time time,
  reason     text,
  unique(date)
);

-- 3층: 시간 구간 차단 (개인 일정)
create table blocks (
  id      uuid primary key default gen_random_uuid(),
  period  tstzrange not null,
  reason  text,          -- "수업", "시험", "개인 일정"
  created_at timestamptz not null default now()
);
```

**관리자 UX가 여기서 핵심이다.**
주간 캘린더에 1시간짜리 칸이 격자로 깔려 있고, **칸을 클릭하면 열림 ↔ 닫힘이 토글**된다.

- 평소 열려 있는 칸을 클릭 → `blocks`에 한 줄 추가 (막힘)
- 막아둔 칸을 다시 클릭 → 그 `blocks` 행 삭제 (다시 열림)
- 드래그로 여러 칸을 한 번에 막을 수 있으면 더 좋다

시간표가 바뀌는 학기 초에는 `weekly_hours`를 한 번 갈아엎고,
평소에는 캘린더에서 칸을 눌러 막는 식으로 운영한다.

### 2-3. 예약

```sql
create type reservation_status as enum
  ('requested','confirmed','completed','cancelled','no_show');

create table reservations (
  id             uuid primary key default gen_random_uuid(),
  code           text unique not null,        -- 손님용 예약번호
  product_id     uuid not null references products(id),
  period         tstzrange not null,          -- 버퍼 포함 점유 구간
  shoot_start    timestamptz not null,        -- 손님에게 보여줄 촬영 시작 시각
  status         reservation_status not null default 'requested',
  customer_name  text not null,
  customer_phone text not null,
  people_count   int,
  memo           text,                        -- 손님 요청사항
  admin_memo     text,                        -- 사장님 메모 (손님에게 안 보임)
  created_at     timestamptz not null default now()
);
```

### 2-4. 설정 — 배포 없이 바꾸는 값들

```sql
create table settings (
  id                   int primary key default 1 check (id = 1),  -- 항상 한 줄
  slot_interval_min    int  not null default 60,   -- 슬롯 간격
  min_lead_days        int  not null default 1,    -- 최소 며칠 전 (1 = 내일부터)
  max_advance_days     int  not null default 60,   -- 몇 일 뒤까지 열어둘지
  cancel_deadline_hours int not null default 48,   -- 손님 자가 취소 가능 기한
  bank_account         text,                       -- 입금 계좌 안내
  studio_intro         text,                       -- 랜딩 소개 문구 (마크다운)
  notice               text                        -- 예약 페이지 공지
);
```

### 2-5. ★ 이중예약 방지 — 앱 코드로 막지 말 것

"조회해서 비었으면 저장" 방식은 두 명이 동시에 누르면 뚫린다. DB 제약으로 막는다.

```sql
create extension if not exists btree_gist;

alter table reservations add constraint no_overlap
  exclude using gist (period with &&)
  where (status in ('requested','confirmed'));
```

시간이 겹치는 예약은 Postgres가 거절한다.
앱은 이 에러를 잡아 "방금 다른 분이 예약하셨어요"를 보여주면 된다.

> 룸이 하나라는 가정이다. 나중에 촬영 공간을 나눠 동시에 두 팀을 받게 되면
> `room_id`를 추가하고 제약을 `room_id with =, period with &&`로 바꾸면 된다.

### 2-6. 시간대 원칙

- DB에는 전부 `timestamptz` (UTC 저장)
- 계산·표시는 항상 `Asia/Seoul` 변환
- `new Date("2026-09-03 14:00")` 처럼 로컬 타임존에 맡기는 파싱 금지

---

## 3. 예약 가능 시간 계산 규칙

```
getAvailableSlots({ date, product }) →

1. 그날의 운영시간 결정
     date_overrides에 그날이 있으면 → 그 값 사용 (is_closed면 즉시 빈 배열)
     없으면 → weekly_hours의 해당 요일 값 사용
     그것도 없으면 → 휴무

2. 1시간 간격 정각 후보를 만든다   (10:00, 11:00, 12:00 …)

3. 각 후보에 대해:
     점유구간 = [시작, 시작 + duration_min + buffer_after_min]
     - 운영시간을 벗어나면              → 제외
     - blocks와 겹치면                  → 제외
     - 기존 예약(requested/confirmed)과 겹치면 → 제외
     - 날짜가 오늘 + min_lead_days 이전이면    → 제외   ← 당일 예약 차단
     - 날짜가 오늘 + max_advance_days 이후면   → 제외

4. 남은 후보 반환
```

### 리드타임 정의

`min_lead_days = 1`은 **날짜 기준**이다.
오늘이 9월 3일이면 가장 빠른 예약 가능일은 9월 4일이며, 9월 4일이면 시간과 무관하게 전부 예약 가능하다.
(대안인 "24시간 롤링" 방식은 9월 3일 저녁 8시에 예약하면 9월 4일 저녁 8시부터만 가능해져 손님이 혼란스럽다. 날짜 기준이 이해하기 쉽다.)

### 버퍼에 대한 주의

슬롯이 1시간 단위인데 버퍼를 30분으로 잡으면,
60분 촬영이 90분을 점유해서 **바로 다음 정각 슬롯까지 자동으로 막힌다.**

- 연달아 촬영을 받고 싶다 → 버퍼 0분
- 정리·세팅 시간이 꼭 필요하다 → 버퍼를 넣되 다음 칸이 닫히는 걸 감수

기본값은 0으로 두고 상품 관리 화면에서 조절할 수 있게 한다.

---

## 4. 단계별 로드맵

파트타임 기준 예상치. 순서가 중요하고 기간은 유동적이다.

### Phase 0 — 기획 ✅ 완료

운영 규칙 확정됨 (위 0번 표).
남은 미정 항목은 코드 기본값으로 두고 **나중에 관리자 화면에서 바꾼다**:
버퍼(0분), 예약 가능 기간(60일), 취소 기한(48시간).

### Phase 1 — 프로젝트 기반 (약 1주)

- [ ] Next.js + TypeScript + Tailwind 생성
- [ ] shadcn/ui 설치, 스튜디오 톤에 맞는 색·폰트 토큰
- [ ] Supabase 프로젝트 생성 및 연결
- [ ] Vercel 연결 — main 푸시 시 자동 배포
- [ ] 환경변수 정리. **키는 절대 커밋 금지** (`.gitignore` 확인)
- [ ] ESLint / Prettier / Vitest

**완료 기준**: 한 줄짜리 페이지가 실제 URL로 열린다.

### Phase 2 — 데이터 모델 ✅ 코드 완료 (실제 프로젝트 연결은 대기)

- [x] 위 스키마 전부를 마이그레이션 SQL로 작성 (`supabase/migrations/`)
- [x] `btree_gist` + EXCLUDE 제약 적용
- [x] Storage 버킷 생성 SQL (상품 이미지, `product-images`)
- [x] RLS 정책
  - 손님: 공개된 상품 조회, 예약 생성만. 예약 조회는 `lookup_reservation()` 함수로만
    (테이블 직접 조회는 막아둠 — 그래야 코드+연락처 없이 전체 예약이 새지 않는다)
  - 관리자: 로그인 여부로 판별. **Supabase Auth 이메일 회원가입을 꺼야 안전함**
    (`docs/SUPABASE_SETUP.md` 3번)
- [x] `settings` 기본 한 줄 삽입
- [x] 타입 작성 (`lib/supabase/database.types.ts`, 손으로 작성 — 연결 후 `npm run db:types`로 재생성)
- [x] 로컬 Postgres에 6개 마이그레이션 전부 적용해 통과 확인
- [x] 이중예약 방지 제약 실제 테스트 — 겹침 거절 / 정확 일치 거절 / 연속 시간 통과 / 취소건은 무시됨을 확인
- [ ] **실제 Supabase 프로젝트에 적용** — 사장님이 프로젝트를 만들고 `docs/SUPABASE_SETUP.md`대로 진행해야 함

**완료 기준**: SQL 콘솔에서 겹치는 예약을 두 번 넣으면 두 번째가 거절된다.
→ 로컬 Postgres에서 검증 완료. 실제 Supabase 프로젝트에서도 동일하게 동작한다
(마이그레이션 파일이 그대로 적용되는 SQL이므로).

### Phase 3 — 슬롯 계산 엔진 ✅ 완료 (라이브 DB 연동은 미검증)

- [x] `lib/availability/slots.ts` 순수 함수 구현
- [x] `lib/availability/range.ts` — Postgres tstzrange 파싱과 겹침 판정.
      `[시작, 끝)` 반열림 규칙을 DB의 EXCLUDE 제약과 똑같이 맞춰
      계산과 DB 판정이 어긋나지 않게 했다
- [x] 단위 테스트 60개 — 아래 경계 조건 포함
  - 운영시간 경계에 걸치는 촬영 (마감 30분 전 60분 촬영 → 불가)
  - `date_overrides`가 `weekly_hours`를 덮어쓰는지 (휴무 지정 / 시간 변경 /
    평소 쉬는 요일을 예외로 여는 경우)
  - `blocks`가 최종 우선인지 (걸치기만 해도 닫히는지)
  - 당일 예약이 확실히 차단되는지, 내일은 시각과 무관하게 열리는지
  - 버퍼로 다음 슬롯이 막히는지, 버퍼가 마감을 넘길 때 닫히는지
  - KST 변환 (자정 근처, 월말, 연말)
- [x] **변이 테스트로 테스트 자체를 검증** — 버퍼 계산·마감 검사·리드타임 검사·
      차단 검사를 각각 일부러 망가뜨려 테스트가 실제로 잡아내는지 확인했다.
      이 과정에서 엉뚱한 이유로 통과하던 `maxAdvanceDays` 테스트를 발견해 고쳤다
- [x] 특정 날짜의 슬롯을 반환하는 서버 함수 (`lib/availability/load.ts`)
- [ ] **라이브 Supabase에서 확인** — 실제 프로젝트 연결 후에나 가능하다.
      특히 `.overlaps()` 범위 조회와 tstzrange 반환 형식은 문서로만 확인했다

**완료 기준**: UI 없이 테스트만으로 가용 시간이 정확히 나온다. → 달성

### Phase 4 — 관리자 ①: 로그인 + 상품 관리 ✅ 코드 완료 (라이브 로그인 미검증)

- [x] Supabase Auth 로그인, `/admin` 보호
      로그인 화면은 `app/admin/login`(가드 밖), 나머지는 `app/admin/(dashboard)`
      안에 두어 "로그인 안 됨 → 로그인 화면 → 다시 확인" 무한 반복을 피했다
- [x] 서버 액션마다 `requireAdmin()` — 서버 액션은 화면을 거치지 않고 POST로
      직접 호출될 수 있어서, 화면 가드만으로는 부족하다
- [x] 상품 목록 — 공개/비공개 토글, 순서 변경
      드래그 대신 위/아래 버튼을 썼다. 모바일에서 확실히 동작하고 라이브러리도
      필요 없다. 순서를 바꿀 때 전체를 0부터 다시 매겨 값이 어긋난 채 남지 않게 했다
- [x] 상품 추가·수정 폼 — 이름/소요시간/가격/인원/버퍼, zod 검증
- [x] **마크다운 에디터 + 실시간 미리보기** — 관리자 미리보기와 손님 화면이
      같은 `<Markdown>` 컴포넌트를 쓴다. "쓸 때 본 모습"과 "손님이 보는 모습"이
      어긋나지 않는다
- [x] 이미지 업로드 (Supabase Storage) — 브라우저에서 직접 올린다.
      DB에는 공개 URL이 아니라 경로만 저장해 프로젝트가 바뀌어도 값이 살아 있다
- [x] 로그인 없이 `/admin/products` 접근 시 로그인 화면으로 보내는 것을 실제로 확인
- [ ] **실제 계정으로 로그인 확인** — 이 환경에는 Supabase 자격증명이 없어
      로그인 성공 경로를 밟아보지 못했다

**완료 기준**: 코드를 건드리지 않고 새 촬영 상품을 하나 만들어 공개할 수 있다.
→ 화면과 저장 경로는 만들었고, 실제 로그인 후 저장까지는 사장님 확인이 필요하다.

### Phase 5 — 관리자 ②: 스케줄 관리 ✅ (`/admin/schedule`)

- [x] 요일별 기본 운영시간 설정 화면
- [x] **주간 캘린더 — 1시간 칸 클릭으로 열림/닫힘 토글**
- [x] ~~여러 칸 한 번에 차단~~ — 처음엔 "시간 구간 한 번에 차단" 폼(날짜+
      시작시간+종료시간)으로 만들었는데, 써보니 상태(색)가 하나 더 늘어나고
      해제 경로도 둘로 갈라져 오히려 헷갈린다는 사장님 피드백을 받고
      들어냈다. 1시간 칸을 여러 번 클릭해도 충분하다.
- [x] ~~차단 사유 메모~~ — 위 폼과 함께 제거. 사유 없이 "막혀 있다/열려
      있다"만으로 충분했다.
- [x] 날짜 단위 휴무 등록 (시험기간 등 여러 날 한 번에 — 시작일~종료일 범위로 등록)
- [x] 손님에게 보이는 것과 동일한 가용 시간 미리보기 — `lib/availability/load.ts`의
      `loadAvailableSlots`를 그대로 호출해, 판정 로직이 손님 화면과 어긋날 수 없다.

**완료 기준**: "다음 주 화요일 3시에 일정 생김" → 30초 안에 해당 슬롯을 막을 수 있다.
(주간 캘린더에서 그 칸을 클릭 한 번으로 바로 막는다.)
(주간 캘린더에서 그 칸을 바로 클릭하거나, 시간 구간 폼으로 한 번에 등록)

### Phase 6 — 손님 예약 플로우 ✅ 코드 완료 (라이브 DB 연동 미검증) ★ MVP

Phase 5(관리자 스케줄 관리 화면)보다 먼저 만들었다. 스케줄 3개 테이블은
Supabase Table Editor에서 직접 입력해도 예약 엔진이 그대로 동작하므로,
화면이 없어도 손님 예약 플로우를 막을 이유가 없었다.

- [x] 랜딩 — "예약하기" 버튼이 실제로 `/booking`으로 연결됨
- [x] 상품 목록 (`/booking`) — 공개된 상품만, 대표 이미지·가격·소요시간
- [x] 상품 상세 (`/booking/[slug]`) — 마크다운 설명 렌더링 + 달력
- [x] 날짜 선택 — 서버 렌더링 달력. 자바스크립트 없이 링크만으로 동작해서
      새로고침해도, 링크를 복사해서 다른 사람에게 보내도 그대로 열린다.
      예약 가능한 날짜만 클릭 가능하게 표시
- [x] 시간 선택 (`/booking/[slug]/[date]`) — 그날의 슬롯을 버튼으로
- [x] 정보 입력 + 개인정보 수집·이용 동의 체크박스 (필수, 서버에서도 검증)
- [x] 예약 완료 — 예약번호, 입금 계좌 안내, 공지 문구 (모두 settings 테이블)
- [x] 예약 조회 / 취소 (`/booking/lookup`) — 예약번호 + 연락처.
      취소는 `cancel_reservation()` SQL 함수가 본인 확인과 취소 기한을
      DB 안에서 직접 확인한다 (RLS로 anon에게 UPDATE를 열어주지 않고도
      안전하게 자가 취소를 허용)
- [x] 동시 예약 충돌 안내 — 폼 제출 시 서버가 가용 시간을 한 번 더 계산해
      확인하고, 그래도 뚫리면 DB의 EXCLUDE 제약(23P01)을 잡아
      "방금 다른 분이 예약했어요"로 안내
- [x] 모바일 우선 반응형
- [ ] **실제 Supabase 프로젝트로 전체 플로우 확인** — 이 환경에는
      자격증명이 없어 예약 신청→접수→조회→취소까지 실제로 밟아보지 못했다

**새로 만든 SQL**: `cancel_reservation(code, phone)` — 로컬 Postgres에서
직접 실행해 5가지 경우(불일치/정상 취소/재취소/기한 초과/이미 취소됨)를
전부 검증했다.

**완료 기준**: 사장님이 아닌 사람이 안내 없이 예약을 끝까지 완료한다.
→ 코드는 완성했고, 실제 배포 환경에서의 확인이 남았다.

### Phase 7 — 관리자 ③: 예약 관리 (약 1주)

- [ ] 예약 목록 — 상태·기간 필터
- [ ] 주간/월간 캘린더에 예약 표시
- [ ] 확정 / 취소 / 완료 / 노쇼 처리
- [ ] 수기 예약 등록 (전화·DM으로 들어온 건)
- [ ] 사장님 메모
- [ ] 설정 화면 (리드타임, 예약가능기간, 취소기한, 계좌, 공지)

**완료 기준**: Supabase 대시보드를 열지 않고 하루 운영이 가능하다.

### Phase 8 — 알림 (약 1주)

- [ ] 손님: 예약 접수 / 확정 / 취소
- [ ] 사장님: 새 예약 신청 (즉시)
- [ ] 촬영 전날 리마인드 (Vercel Cron)
- [ ] 발송 실패 로깅

**참고**: 카카오 알림톡은 사업자등록 + 템플릿 심사가 필요하다.
심사를 기다리지 말고 **SMS나 이메일로 먼저 출시**하고 알림톡은 나중에 붙인다.

### Phase 9 — 출시 준비 (약 1주)

- [ ] 개인정보처리방침 / 이용약관 (연락처 수집 시 법적 필수)
- [ ] SEO — 메타태그, OG 이미지, sitemap, 네이버·구글 등록
- [ ] 이미지 최적화(`next/image`), Lighthouse 점검
- [ ] 접근성 — 키보드 조작, 색 대비, 폼 라벨
- [ ] Supabase 백업 확인
- [ ] 에러 모니터링 (Sentry 무료)
- [ ] 지인 3~5명 베타 테스트

### Phase 10 — 확장 (출시 이후)

- 온라인 결제 (토스페이먼츠/포트원), 예약금, 환불 자동화
- 구글 캘린더 양방향 동기화 — 학교 일정이 자동으로 차단되면 가장 편함
- 촬영 공간 분리 (`room_id`)
- 결과물 전달 갤러리
- 재방문 고객 관리, 예약 통계

---

## 5. 마일스톤

| #   | 마일스톤                  | 판단 기준                     |
| --- | ------------------------- | ----------------------------- |
| M1  | 배포 파이프라인           | 실제 URL이 열린다             |
| M2  | 이중예약 차단             | 중복 INSERT가 DB에서 거절된다 |
| M3  | 가용 시간 정확            | 엣지 케이스 테스트 통과       |
| M4  | **상품을 내가 만든다**    | 코드 수정 없이 상품 추가·공개 |
| M5  | **일정을 내가 막는다**    | 캘린더 클릭으로 슬롯 차단     |
| M6  | **MVP — 예약이 들어온다** | 외부인이 예약을 완료한다      |
| M7  | 정식 오픈                 | 알림 + 약관 + SEO 완료        |

M6이 가장 중요하다. M7 없이도 장사는 시작할 수 있다.

---

## 6. 리스크와 주의점

| 리스크                          | 대응                                                            |
| ------------------------------- | --------------------------------------------------------------- |
| 시간 계산 버그로 이중예약       | DB EXCLUDE 제약으로 최종 방어. 앱 로직만 믿지 않는다            |
| 3층 스케줄 구조의 우선순위 혼동 | blocks > date_overrides > weekly_hours 를 테스트로 고정         |
| 타임존 실수                     | 전부 `timestamptz`, 표시만 KST                                  |
| 개인정보(이름·연락처)           | 처리방침·동의 필수. 최소 수집, 보관기간 정하기                  |
| Supabase 키 노출                | RLS 필수. `service_role` 키는 서버에서만                        |
| 학업과 병행하는 개발 속도       | Phase 단위로 배포 가능한 상태를 유지. 중간에 멈춰도 손해가 없게 |
| 범위 확장 유혹                  | 결제·후기·포트폴리오는 M6 이후                                  |

---

## 7. 다음에 할 일

**Phase 1 시작 준비물** (사장님이 해야 할 것)

1. Supabase 계정 생성 → 새 프로젝트 (리전은 `Northeast Asia (Seoul)`)
2. Vercel 계정 생성 → GitHub 연결
3. 스튜디오 사진, 로고, 소개 문구, 입금 계좌 정보

준비되면 Phase 1의 프로젝트 뼈대부터 코드 작업을 시작한다.
Supabase 키가 없어도 Next.js 프로젝트 세팅과 UI 뼈대까지는 먼저 만들 수 있다.
