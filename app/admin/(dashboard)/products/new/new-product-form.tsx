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
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold">상품 추가</h1>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isPublished"
            form={FORM_ID}
            defaultChecked={initial.isPublished}
            className="h-4 w-4"
          />
          <span className="text-sm font-medium">손님에게 공개</span>
        </label>

        <Button type="submit" form={FORM_ID} disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </Button>
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
