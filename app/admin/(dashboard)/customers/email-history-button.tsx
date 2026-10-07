"use client";
import { useRef, useState } from "react";
import { customerEmailHistory } from "@/app/admin/actions";
import type { CustomerEmailLog } from "@/lib/notifications/customer-email-history";
export function EmailHistoryButton({
  phone,
  name,
}: {
  phone: string;
  name: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<CustomerEmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function open() {
    setRows([]);
    setError(null);
    setLoading(true);
    dialog.current?.showModal();
    try {
      const result = await customerEmailHistory(phone);
      setRows(result.rows);
      setError(result.error);
    } catch {
      setError("기록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={open}
        className="border-border rounded-md border px-3 py-2 text-xs whitespace-nowrap"
      >
        메일 기록
      </button>
      <dialog
        ref={dialog}
        className="bg-surface text-foreground m-auto w-[calc(100%-2rem)] max-w-3xl rounded-xl border p-5 backdrop:bg-black/50"
      >
        <div className="flex justify-between gap-3">
          <h2 className="font-bold">{name}님 메일 발송 기록</h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <p className="text-muted mt-2 text-xs">
          예약 연결 기록과 현재·과거 예약의 이메일 주소를 기준으로 표시합니다.
          성공은 메일 서버 접수 기준이며 열람 여부는 확인하지 않습니다.
        </p>
        <div className="mt-4 max-h-[65vh] space-y-3 overflow-auto">
          {loading ? (
            <p role="status">불러오는 중…</p>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : !rows.length ? (
            <p>발송 기록이 없습니다.</p>
          ) : (
            rows.map((r) => (
              <article
                key={r.id}
                className="border-border rounded-lg border p-3 text-sm"
              >
                <div className="flex justify-between gap-2">
                  <time>
                    {new Date(r.created_at).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                  </time>
                  <strong
                    className={r.success ? "text-green-700" : "text-red-600"}
                  >
                    {r.success ? "발송 성공" : "발송 실패"}
                  </strong>
                </div>
                <p className="mt-1 break-all">{r.recipient}</p>
                <p className="text-muted text-xs">
                  {r.purpose.startsWith("customer-email:")
                    ? "수동 메일"
                    : r.purpose.startsWith("rule:")
                      ? "자동 규칙 메일"
                      : r.purpose}
                </p>
                {r.reservation_id ? (
                  <p className="text-muted text-xs">예약 연결 기록</p>
                ) : null}
                {r.error ? (
                  <p className="mt-2 break-words text-red-600">{r.error}</p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </dialog>
    </>
  );
}
