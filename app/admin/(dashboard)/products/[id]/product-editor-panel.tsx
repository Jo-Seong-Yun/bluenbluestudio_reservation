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
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold">{initial.name}</h1>
        <Button type="submit" form={FORM_ID} disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="min-w-0">
          <ProductForm
            initial={initial}
            formId={FORM_ID}
            action={action}
            pending={pending}
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
