"use client";
export default function AnalyticsError({ reset }: { reset: () => void }) {
  return (
    <section className="border-border bg-surface rounded-xl border p-6">
      <h1 className="text-xl font-bold">통계를 불러오지 못했습니다</h1>
      <p role="alert" className="text-muted mt-3 text-sm">
        일부 기록의 조회에 실패해 집계를 표시하지 않았습니다. 잠시 후 다시
        시도해 주세요.
      </p>
      <button
        type="button"
        onClick={reset}
        className="bg-brand text-brand-foreground mt-4 rounded-lg px-4 py-3"
      >
        다시 불러오기
      </button>
    </section>
  );
}
