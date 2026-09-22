"use client";

import { useState, useTransition } from "react";
import { saveActivityMemo } from "@/app/admin/actions";

/**
 * 상세 로그 한 줄에 붙는 메모. 평소엔 저장된 메모(있으면 그 내용, 없으면
 * "메모")를 누를 수 있는 글자로만 보여주다가, 누르면 그 자리가 입력칸+
 * 저장 버튼으로 바뀐다 — 로그가 최대 100줄까지 있어서 모든 줄에 입력칸을
 * 항상 펼쳐 두면 화면이 너무 무거워진다.
 */
export function ActivityMemo({
  kind,
  id,
  memo,
}: {
  kind: string;
  id: string;
  memo: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(memo ?? "");
  const [saved, setSaved] = useState(memo);
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-muted hover:text-foreground max-w-[14rem] shrink-0 truncate text-left text-xs underline decoration-dotted underline-offset-2"
        title={saved ?? "메모 추가"}
      >
        {saved || "메모"}
      </button>
    );
  }

  function handleSave() {
    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("id", id);
    formData.set("memo", value);
    startTransition(async () => {
      const result = await saveActivityMemo(formData);
      if (result?.error) {
        setError(true);
        return;
      }
      setError(false);
      setSaved(value.trim() || null);
      setEditing(false);
    });
  }

  return (
    <div className="flex shrink-0 flex-col gap-1">
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => {
            // 한글은 조합 중에 Enter를 눌러 글자를 확정하는 경우가 있어,
            // isComposing이면(아직 조합 중이면) 저장하지 않는다 — 그대로
            // 두면 마지막 글자를 채 넣기도 전에 저장돼 버린다.
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleSave();
            } else if (e.key === "Escape") {
              setValue(saved ?? "");
              setEditing(false);
              setError(false);
            }
          }}
          placeholder="메모 입력 (Enter로 저장)"
          className="border-border bg-surface w-40 rounded border px-2 py-1 text-xs outline-none sm:w-64"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="border-border bg-surface hover:bg-surface-subtle shrink-0 rounded border px-1.5 py-1 text-xs font-medium disabled:opacity-50"
        >
          {isPending ? "저장 중" : "저장"}
        </button>
      </div>
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400">
          저장하지 못했습니다. 다시 시도해 주십시오.
        </span>
      ) : null}
    </div>
  );
}
