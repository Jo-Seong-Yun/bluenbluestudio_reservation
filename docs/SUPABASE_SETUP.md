# Supabase 연결하기

이 문서대로 하면 사이트가 실제 데이터베이스에 연결된다. 코드는 이미 준비되어 있다.

## 1. 프로젝트 만들기

1. [supabase.com](https://supabase.com) 접속 → GitHub 계정으로 로그인
2. **New project**
   - Region: **Northeast Asia (Seoul)**
   - Database Password: 눈에 잘 띄는 곳에 따로 저장해둘 것 (분실 시 재설정 필요)
3. 생성까지 1~2분 소요

## 2. 키 값 가져오기

Supabase 대시보드가 개편되면서 **`Project Settings → API` 메뉴는 없어졌다.**
아래 세 가지 방법 중 하나로 찾는다.

### 가장 쉬운 방법 — Connect 버튼

프로젝트 상단의 **Connect** 버튼을 누르고 프레임워크에서 **Next.js**를 고르면,
`.env`에 그대로 붙여넣을 수 있는 형태로 URL과 공개 키가 함께 나온다.

### 메뉴로 찾기

- **Settings → API Keys** — 키 두 개
- **Settings → API Settings** — 프로젝트 URL

### 주소로 바로 가기

```
https://supabase.com/dashboard/project/<프로젝트ID>/settings/api
```

### 채워야 할 값

Supabase는 2026년 말까지 기존 `anon` / `service_role` 키를 없애고
새 키 체계로 넘어가는 중이다. 새로 만든 프로젝트라면 새 키가 나온다.
둘 중 어느 쪽이 보이든 아래 표대로 넣으면 된다 — **값은 그대로 호환되고
코드는 고칠 필요가 없다.**

| 화면에 보이는 것                       | 옛 이름      | `.env.local` 변수명                    |
| -------------------------------------- | ------------ | -------------------------------------- |
| Project URL                            | 동일         | `NEXT_PUBLIC_SUPABASE_URL`             |
| Publishable key (`sb_publishable_...`) | anon public  | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Secret key (`sb_secret_...`)           | service_role | `SUPABASE_SECRET_KEY`                  |

키 화면에 **Publishable and secret API keys** 탭과 **Legacy API keys** 탭이
따로 있을 수 있다. 새 프로젝트라면 앞쪽 탭을 쓰면 된다.

```bash
cp .env.example .env.local
# .env.local 을 열어 위 세 값을 채운다
```

**Secret key는 절대 남에게 보여주거나 커밋하면 안 된다.**
이 키를 가진 사람은 RLS를 무시하고 모든 데이터에 접근할 수 있다.
Publishable key는 브라우저에 노출돼도 괜찮다 — 그쪽은 RLS가 막아준다.

## 3. 이메일 회원가입 끄기 — 반드시 할 것

이 사이트는 "로그인한 사람 = 관리자"로 취급한다.
회원가입이 열려 있으면 누구나 가입해서 관리자 권한을 가질 수 있다.

**Authentication → Sign In / Providers → Email** 에서
**"Allow new users to sign up"을 끈다.**

## 4. 스키마 적용

`supabase/migrations/`에 SQL 파일 6개가 준비되어 있다. 두 방법 중 편한 쪽으로 적용한다.

### 방법 A — 대시보드에 붙여넣기 (가장 쉬움)

**SQL Editor**에서 `supabase/migrations/` 안의 파일을 **파일명 순서대로**(`20260903000100` → `...000600`) 하나씩 열어 전체 내용을 붙여넣고 실행한다.

### 방법 B — CLI (터미널 사용 가능하면 더 편함)

```bash
npx supabase login
npx supabase link --project-ref <프로젝트 URL의 xxxxx 부분>
npx supabase db push
```

## 5. 관리자 계정 만들기

**Authentication → Users → Add user → Create new user**
이메일과 비밀번호를 직접 입력해서 만든다. (가입 폼이 아니라 이 화면에서 직접 만드는 것이다)

이 계정이 `/admin`에 로그인할 유일한 계정이다. (로그인 화면은 Phase 4에서 만든다)

## 6. 확인

```bash
npm run typecheck
```

이후 `npm run dev`로 로컬에서 확인할 수 있다. (지금은 화면에서 아직 DB를 쓰지 않으므로 에러가 나지 않는 게 정상이다 — Phase 3부터 실제로 연결된다)

## 나중에: 타입 다시 생성하기

`lib/supabase/database.types.ts`는 지금은 손으로 맞춰 쓴 것이다.
CLI로 연결한 뒤에는 실제 스키마에서 다시 뽑아 정확하게 맞춘다.

```bash
npm run db:types
```
