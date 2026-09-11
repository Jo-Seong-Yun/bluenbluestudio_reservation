"use client";

import { useRef, useState } from "react";
import { addCustomField, updateCustomField } from "@/app/admin/actions";
import { Button, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import {
  FIELD_TYPE_LABELS,
  SPECIAL_FIELD_TYPES,
  type CustomField,
} from "@/lib/booking/custom-fields-shared";
import { FieldDescriptionEditor } from "./field-description-editor";

const NEEDS_OPTIONS = new Set(["single_choice", "multi_choice"]);
const IS_SPECIAL = new Set<string>(SPECIAL_FIELD_TYPES);

/**
 * 문항 추가/수정 모달. "되는시간" 같은 예약 서비스의 문항 편집기를
 * 참고했다 — 추가와 수정을 같은 모달로 처리하고, 답변 종류를 고를 때만
 * 보기 입력칸이 나타난다. 보기는 구글폼처럼 한 줄씩 늘어놓고 개별로
 * 추가/삭제한다.
 */
export function FieldModal({
  productId,
  field,
}: {
  productId: string;
  field?: CustomField;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<string>(field?.type ?? "short_text");
  const [options, setOptions] = useState<string[]>(
    field?.options && field.options.length > 0 ? field.options : [""],
  );
  // "질문 추가" 모달은 하나를 등록한 뒤 다이얼로그를 닫지 않고 그대로
  // 다시 열 수 있다 — 그때 상세설명 에디터(FieldDescriptionEditor)가
  // 이전에 타이핑한 내용을 그대로 들고 있지 않도록, 열 때마다 이
  // 값을 바꿔 key로 줘서 강제로 새로 마운트한다.
  const [editorEpoch, setEditorEpoch] = useState(0);
  const isEdit = Boolean(field);

  function open() {
    setType(field?.type ?? "short_text");
    setOptions(
      field?.options && field.options.length > 0 ? field.options : [""],
    );
    setEditorEpoch((n) => n + 1);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  }

  function addOption() {
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
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
          className="max-h-[75vh] space-y-4 overflow-y-auto p-5"
        >
          <input type="hidden" name="productId" value={productId} />
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

          {isEdit && field && IS_SPECIAL.has(field.type) ? (
            <div>
              <span className="mb-1.5 block text-sm font-medium">
                답변 종류
              </span>
              <p className="border-border bg-surface-subtle text-muted rounded-lg border px-3 py-2 text-sm">
                {FIELD_TYPE_LABELS[field.type] ?? field.type} (바꿀 수 없습니다)
              </p>
              <input type="hidden" name="type" value={field.type} />
            </div>
          ) : (
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="type"
              >
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
                {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {NEEDS_OPTIONS.has(type) ? (
            <div>
              <span className="mb-1.5 block text-sm font-medium">보기</span>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-muted shrink-0">
                      {type === "single_choice" ? "○" : "☐"}
                    </span>
                    <input
                      name="option"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`옵션 ${index + 1}`}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      aria-label="옵션 삭제"
                      disabled={options.length <= 1}
                      className="text-muted hover:text-foreground shrink-0 disabled:opacity-25"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addOption}
                className="text-brand mt-2 text-sm hover:underline"
              >
                + 옵션 추가
              </button>
            </div>
          ) : null}

          <div>
            <span className="mb-1.5 block text-sm font-medium">
              상세 설명{" "}
              <span className="text-muted font-normal">
                (질문 아래 작게 표시됩니다)
              </span>
            </span>
            <FieldDescriptionEditor
              key={editorEpoch}
              name="description"
              defaultValue={field?.description ?? ""}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={close}>
              취소
            </Button>
            <SubmitButton>확인</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
