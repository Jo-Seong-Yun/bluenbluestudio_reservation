/**
 * Supabase 설정이 안 됐을 때 보여주는 화면.
 *
 * 이게 없으면 화면에 "Internal Server Error" 한 줄만 남아서
 * 무엇이 잘못됐는지 알 길이 없다.
 */
export function ConfigNotice({ missing }: { missing: string[] }) {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <h1 className="text-2xl font-bold">설정이 아직 안 끝났어요</h1>
      <p className="text-muted mt-3 leading-relaxed">
        Supabase 연결에 필요한 값이 없어서 관리자 화면을 열 수 없습니다. 아래
        값을 배포 환경에 넣어주세요.
      </p>

      <ul className="border-border bg-surface mt-6 space-y-1 rounded-xl border px-4 py-3 font-mono text-sm">
        {missing.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>

      <div className="mt-8 space-y-4 text-sm leading-relaxed">
        <div>
          <p className="font-medium">Vercel에 배포한 경우</p>
          <p className="text-muted mt-1">
            프로젝트 → Settings → Environment Variables 에서 위 값을 추가한 뒤,
            <strong> Deployments 탭에서 최신 배포를 Redeploy</strong> 해야
            합니다. 값만 추가하고 다시 배포하지 않으면 반영되지 않아요.
          </p>
        </div>

        <div>
          <p className="font-medium">내 컴퓨터에서 실행 중인 경우</p>
          <p className="text-muted mt-1">
            <code>.env.local</code> 파일에 값을 넣고 개발 서버를 다시
            시작하세요.
          </p>
        </div>

        <p className="text-muted">
          값을 어디서 찾는지는 <code>docs/SUPABASE_SETUP.md</code> 2번에 있어요.
        </p>
      </div>
    </main>
  );
}
