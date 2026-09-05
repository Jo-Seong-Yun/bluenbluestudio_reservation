"use client";

import { useState } from "react";
import { ProductForm, type ProductFormValues } from "../product-form";
import { DescriptionEditor } from "./description-editor";

/**
 * 상품 정보 폼 + 상세 설명 에디터를 한 화면에서 오간다.
 *
 * "상세 설명 편집하기"를 누르면 페이지를 이동하는 대신, 왼쪽 폼이
 * 좁아지며 옆으로 붙고 오른쪽에서 에디터가 미끄러져 나온다. 폭이
 * 처음부터 고정돼 있진 않고 열고 닫을 때만 바뀐다 — 여기선 그 자체가
 * 요청받은 동작이라, 예약 화면에서와 달리 폭 변화를 없앨 이유가 없다.
 */
export function ProductEditorPanel({
  initial,
  description,
}: {
  initial: ProductFormValues;
  description: string;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-6 overflow-hidden lg:flex-row lg:items-start">
      <div
        className={`min-w-0 transition-all duration-300 ease-out ${
          editing ? "lg:w-[26rem] lg:shrink-0" : "w-full"
        }`}
      >
        <ProductForm
          initial={initial}
          onEditDescription={() => setEditing(true)}
        />
      </div>

      <div
        className={`min-w-0 overflow-hidden transition-all duration-300 ease-out ${
          editing ? "flex-1 opacity-100" : "w-0 flex-none opacity-0"
        }`}
      >
        {editing && initial.id ? (
          <DescriptionEditor
            productId={initial.id}
            initial={description}
            onClose={() => setEditing(false)}
          />
        ) : null}
      </div>
    </div>
  );
}
