/**
 * 화면(헤더 제외)을 어둡게 덮는 스피너. 페이지 이동으로 인한 대기
 * (app/admin/(dashboard)/loading.tsx)와 같은 화면에서의 처리 중 대기
 * (components/pending-overlay.tsx)가 똑같은 모습을 쓰도록 분리해 둔다.
 * `relative`가 걸린 부모(admin 레이아웃의 main) 안에 놓으면 그 영역만
 * 정확히 덮는다.
 */
export function LoadingOverlay() {
  return (
    <div
      role="status"
      aria-label="처리 중"
      className="bg-background/70 absolute inset-0 z-40 flex items-center justify-center backdrop-blur-[1px]"
    >
      <div className="border-border border-t-brand h-10 w-10 animate-spin rounded-full border-4" />
    </div>
  );
}
