"use client";

import { useRef, useState } from "react";
import { addCustomField, updateCustomField } from "@/app/admin/actions";
import { Button, inputClass } from "@/components/ui";
import type { CustomField } from "@/lib/booking/custom-fields";

const TYPE_LABELS: Record<string, string> = {
  short_text: "단답형",
  long_text: "장문형",
  single_choice: "객관식 (하나 선택)",
  multi_choice: "체크박스 (여러 개 선택)",
  checkbox: "단일 체크박스 (동의/확인용)",
};

const NEEDS_OPTIONS = new Set(["single_choice", "multi_choice"]);

/**
 * 문항 추가/수정 모달. "되는시간" 같은 예약 서비스의 문항 편집기를
 * 참고했다 — 추가와 수정을 같은 모달로 처리하고, 답변 종류를 고를 때만
 * 보기 입력칸이 나타난다.
 */
export function FieldModal({ field }: { field?: CustomField }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<string>(field?.type ?? "short_text");
  const isEdit = Boolean(field);

  function open() {
    setType(field?.type ?? "short_text");
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      {isEdit ? (
        <button
          type="button"
          onClick={open}
          aria-label="문항 수정"
          className="border-border hover:bg-surface-subtle flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm"
        >
          ✎
        </button>
      ) : (
        <Button type="button" onClick={open}>
          질문 추가
        </Button>
      )}

      <dialog
        ref={dialogRef}
        className="border-border bg-surface text-foreground w-[calc(100%-2rem)] max-w-md rounded-xl border p-0 backdrop:bg-black/50"
      >
        <div className="flex items-center justify-between border-b border-inherit px-5 py-4">
          <p className="font-bold">{isEdit ? "질문 수정" : "질문 추가"}</p>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="text-muted hover:text-foreground text-lg leading-none"
          >
            ×
          </button>
        </div>

        <form
          action={isEdit ? updateCustomField : addCustomField}
          onSubmit={close}
          className="space-y-4 p-5"
        >
          {isEdit && field ? (
            <input type="hidden" name="id" value={field.id} />
          ) : null}

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="label">
              질문 <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <textarea
              id="label"
              name="label"
              required
              rows={2}
              maxLength={100}
              defaultValue={field?.label ?? ""}
              className={inputClass}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <span className="relative inline-block h-6 w-11 shrink-0">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={field?.active ?? true}
                  className="peer sr-only"
                />
                <span className="bg-surface-subtle border-border peer-checked:bg-brand peer-checked:border-brand absolute inset-0 rounded-full border transition-colors" />
                <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
              </span>
              <span className="text-sm">활성화</span>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="required"
                defaultChecked={field?.required ?? false}
                className="h-4 w-4"
              />
              답변 필수
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="type">
              답변 종류{" "}
              <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <select
              id="type"
              name="type"
              required
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={inputClass}
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {NEEDS_OPTIONS.has(type) ? (
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="options"
              >
                보기{" "}
                <span className="text-muted font-normal">(한 줄에 하나씩)</span>
              </label>
              <textarea
                id="options"
                name="options"
                rows={3}
                placeholder={"실내\n야외\n실내+야외"}
                defaultValue={(field?.options ?? []).join("\n")}
                className={inputClass}
              />
            </div>
          ) : null}

          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="description"
            >
              상세 설명{" "}
              <span className="text-muted font-normal">
                (질문 아래 작게 보여줘요)
              </span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              maxLength={200}
              defaultValue={field?.description ?? ""}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={close}>
              취소
            </Button>
            <Button type="submit">확인</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
