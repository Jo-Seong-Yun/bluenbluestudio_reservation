"use client";

import { useOptimistic, useTransition } from "react";
import { inputClass } from "@/components/ui";
import { moveCustomField } from "@/app/admin/actions";
import { FieldDescription } from "@/components/field-description";
import { DeleteFieldButton } from "./delete-field-button";
import { FieldModal } from "./field-modal";
import {
  FIELD_TYPE_LABELS,
  LOCKED_FIELD_TYPES,
  type CustomField,
} from "@/lib/booking/custom-fields-shared";

const LOCKED_TYPE_SET = new Set<string>(LOCKED_FIELD_TYPES);

type MoveTarget = { id: string; direction: "up" | "down" };

/**
 * 이 상품의 예약 폼 문항 전부를 여기서 관리한다. 이름·연락처·이메일·
 * 성별·생년월일도 더 이상 폼에 하드코딩된 "기본 항목"이 아니라, 상품을
 * 만들 때 기본으로 생겨나는 문항일 뿐이다(app/admin/actions.ts의
 * DEFAULT_CUSTOM_FIELDS) — 다른 문항처럼 라벨을 바꾸거나 지울 수 있다.
 *
 * 순서 변경은 서버 응답을 기다리지 않고 목록부터 먼저 바꾼다
 * (useOptimistic) — ▲▼를 여러 번 눌러 순서를 다듬을 때 한 번씩
 * 왕복을 기다리면 굉장히 굼뜨게 느껴진다.
 */
export function CustomFieldsSection({
  productId,
  fields,
}: {
  productId: string;
  fields: CustomField[];
}) {
  const [, startTransition] = useTransition();
  const [optimisticFields, applyMove] = useOptimistic(
    fields,
    (state: CustomField[], target: MoveTarget) => {
      const index = state.findIndex((f) => f.id === target.id);
      const swapWith = target.direction === "up" ? index - 1 : index + 1;
      if (index === -1 || swapWith < 0 || swapWith >= state.length) {
        return state;
      }
      const next = [...state];
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    },
  );

  function move(id: string, direction: "up" | "down") {
    startTransition(async () => {
      applyMove({ id, direction });
      const formData = new FormData();
      formData.set("id", id);
      formData.set("productId", productId);
      formData.set("direction", direction);
      await moveCustomField(formData);
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">신청서 문항</h2>
          <p className="text-muted mt-1 text-sm">
            이 상품 예약 폼에 나갈 질문을 순서대로 관리합니다. 다른 상품에는
            영향이 없습니다.
          </p>
        </div>
        <FieldModal productId={productId} />
      </div>

      <div className="border-border bg-surface rounded-xl border">
        {optimisticFields.length === 0 ? (
          <p className="text-muted p-6 text-center text-sm">
            아직 문항이 없습니다. &quot;질문 추가&quot;를 눌러 신청서에 넣을
            질문을 만들어 보시기 바랍니다.
          </p>
        ) : (
          <ul>
            {optimisticFields.map((field, index) => (
              <li
                key={field.id}
                className={`border-border flex flex-wrap items-start gap-3 border-b p-4 last:border-0 ${
                  field.active ? "" : "opacity-50"
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <MoveButton
                    direction="up"
                    disabled={index === 0}
                    label="위로"
                    onClick={() => move(field.id, "up")}
                  />
                  <MoveButton
                    direction="down"
                    disabled={index === optimisticFields.length - 1}
                    label="아래로"
                    onClick={() => move(field.id, "down")}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {field.label}
                      {field.required ? (
                        <span className="ml-0.5 text-red-600 dark:text-red-400">
                          *
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted text-xs">
                      {FIELD_TYPE_LABELS[field.type] ?? field.type}
                    </span>
                    {!field.active ? (
                      <span className="bg-surface-subtle text-muted rounded-full px-2 py-0.5 text-xs">
                        비활성
                      </span>
                    ) : null}
                  </div>

                  <FieldPreview field={field} />

                  {field.description ? (
                    <p className="text-muted mt-1 text-xs">
                      <FieldDescription html={field.description} />
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-start gap-2">
                  <FieldModal productId={productId} field={field} />
                  <DeleteFieldButton
                    id={field.id}
                    productId={productId}
                    label={field.label}
                    locked={LOCKED_TYPE_SET.has(field.type)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** 실제 손님 화면에 어떻게 보일지 미리 보여준다(입력은 안 되는 미리보기). */
function FieldPreview({ field }: { field: CustomField }) {
  const options = field.options ?? [];

  if (field.type === "long_text") {
    return (
      <textarea
        disabled
        rows={2}
        placeholder={field.label}
        className={`${inputClass} cursor-default`}
      />
    );
  }

  if (field.type === "single_choice" || field.type === "multi_choice") {
    return (
      <div className="space-y-1">
        {options.map((option) => (
          <label
            key={option}
            className="text-muted flex items-center gap-1.5 text-sm"
          >
            <input
              type={field.type === "single_choice" ? "radio" : "checkbox"}
              disabled
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="text-muted flex items-center gap-1.5 text-sm">
        <input type="checkbox" disabled />
        {field.label}
      </label>
    );
  }

  if (field.type === "gender") {
    return (
      <div className="flex gap-4">
        <label className="text-muted flex items-center gap-1.5 text-sm">
          <input type="radio" disabled />
          남성
        </label>
        <label className="text-muted flex items-center gap-1.5 text-sm">
          <input type="radio" disabled />
          여성
        </label>
      </div>
    );
  }

  return (
    <input
      disabled
      placeholder={field.label}
      className={`${inputClass} cursor-default`}
    />
  );
}

function MoveButton({
  direction,
  disabled,
  label,
  onClick,
}: {
  direction: "up" | "down";
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="text-muted hover:bg-surface-subtle hover:text-foreground flex h-5 w-6 items-center justify-center rounded text-xs disabled:opacity-25 disabled:hover:bg-transparent"
    >
      {direction === "up" ? "▲" : "▼"}
    </button>
  );
}
