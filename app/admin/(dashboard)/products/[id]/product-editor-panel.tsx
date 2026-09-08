"use client";

import { useState } from "react";
import { ProductForm, type ProductFormValues } from "../product-form";
import { DescriptionEditor } from "./description-editor";

/**
 * 상품 정보 폼 + 상세 설명 에디터.
 *
 * 평소엔 폼 하나만 화면 가운데에 좁게 떠 있다. "상세 설명 편집하기"를
 * 누르면 그때 에디터가 폼 오른쪽에서 슬라이딩으로 나타나면서 화면이
 * 2단으로 넓어진다 — 폼은 그 자리에 그대로 있고 에디터가 옆에 더해지는
 * 방식이다. 두 상태를 다른 트리로 바꿔치기하지 않고 한 flex 행 안에서
 * 에디터 칸의 max-width를 0↔큰 값으로 트랜지션해 부드럽게 열고 닫는다.
 */
export function ProductEditorPanel({
  initial,
  description,
}: {
  initial: ProductFormValues;
  description: string;
}) {
  const [editing, setEditing] = useState(false);
  const canEdit = Boolean(initial.id);

  return (
    <div className={`flex gap-6 ${editing && canEdit ? "" : "justify-center"}`}>
      <div className="w-full max-w-2xl shrink-0">
        <ProductForm
          initial={initial}
          onEditDescription={canEdit ? () => setEditing(true) : undefined}
        />
      </div>

      <div
        className={`min-w-0 overflow-hidden transition-[max-width,opacity] duration-300 ease-out ${
          editing && canEdit
            ? "max-w-[2000px] flex-1 opacity-100"
            : "max-w-0 flex-none opacity-0"
        }`}
      >
        {canEdit ? (
          <DescriptionEditor
            productId={initial.id!}
            initial={description}
            onClose={() => setEditing(false)}
          />
        ) : null}
      </div>
    </div>
  );
}
