"use client";

import { useActionState } from "react";
import { saveProduct, type ActionState } from "@/app/admin/actions";
import { ProductForm, type ProductFormValues } from "../product-form";
import { DescriptionEditor } from "./description-editor";
import { Button } from "@/components/ui";

const FORM_ID = "product-form";

/**
 * 상품 수정 화면을 세로로 3등분해서, 기본 정보·상세 설명·신청서 문항을
 * 한 화면에서 같이 보면서 편집한다(예전처럼 상세 설명을 버튼으로 열고
 * 닫는 방식이 아니다).
 *
 * 기본 정보 폼의 저장 상태(useActionState)를 여기서 들고 있는 이유는
 * 타이틀 옆 저장 버튼이 폼 밖에 있기 때문이다 — `form={FORM_ID}` 속성으로
 * DOM만 분리된 채 같은 폼을 제출하고, pending 상태도 같이 본다.
 */
export function ProductEditorPanel({
  initial,
  description,
  children,
}: {
  initial: ProductFormValues;
  description: string;
  /** 세 번째 열에 놓을 신청서 추가 문항 관리 화면. */
  children: React.ReactNode;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveProduct,
    null,
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{initial.name}</h1>

        <div className="flex items-center gap-4">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <span className="relative inline-block h-6 w-11 shrink-0">
              <input
                type="checkbox"
                name="isPublished"
                form={FORM_ID}
                defaultChecked={initial.isPublished}
                className="peer sr-only"
              />
              <span className="bg-surface-subtle border-border peer-checked:bg-brand peer-checked:border-brand absolute inset-0 rounded-full border transition-colors" />
              <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </span>
            <span className="text-sm font-medium">손님에게 공개</span>
          </label>

          <Button type="submit" form={FORM_ID} disabled={pending}>
            {pending ? "저장 중…" : "저장"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0">
          <ProductForm
            initial={initial}
            formId={FORM_ID}
            action={action}
            state={state}
          />
        </div>

        <div className="min-w-0">
          <DescriptionEditor productId={initial.id!} initial={description} />
        </div>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
