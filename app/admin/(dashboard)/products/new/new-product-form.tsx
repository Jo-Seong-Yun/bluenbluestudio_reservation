"use client";

import { useActionState } from "react";
import { saveProduct, type ActionState } from "@/app/admin/actions";
import { ProductForm, type ProductFormValues } from "../product-form";

const FORM_ID = "product-form";

/**
 * ProductForm은 폼 상태(useActionState)를 프롭으로 받는다 — 상품 수정
 * 화면에서는 타이틀 옆 저장 버튼도 같은 상태를 봐야 해서 그 상태를
 * 상위(ProductEditorPanel)로 옮겼다. 이 화면(새 상품 추가)은 그런 버튼이
 * 없어 이 얇은 클라이언트 래퍼가 그 상태를 대신 들고 있는다.
 */
export function NewProductForm({ initial }: { initial: ProductFormValues }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveProduct,
    null,
  );

  return (
    <ProductForm
      initial={initial}
      formId={FORM_ID}
      action={action}
      pending={pending}
      state={state}
    />
  );
}
