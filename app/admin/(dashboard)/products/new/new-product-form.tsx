"use client";

import { useActionState } from "react";
import { saveProduct, type ActionState } from "@/app/admin/actions";
import { ProductForm, type ProductFormValues } from "../product-form";
import { Button } from "@/components/ui";

const FORM_ID = "product-form";

/**
 * ProductForm은 폼 상태(useActionState)와 제출 버튼·공개 여부 토글을
 * 갖지 않는 순수한 입력 폼이다 — 상품 수정 화면(ProductEditorPanel)이
 * 그것들을 타이틀 옆으로 옮겨서다. 이 화면(새 상품 추가)도 같은 모양을
 * 맞추려고 이 얇은 클라이언트 래퍼가 그 상태와 헤더를 대신 들고 있는다.
 */
export function NewProductForm({ initial }: { initial: ProductFormValues }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveProduct,
    null,
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">상품 추가</h1>

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

      <ProductForm
        initial={initial}
        formId={FORM_ID}
        action={action}
        state={state}
      />
    </div>
  );
}
