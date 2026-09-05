"use client";

import { useState } from "react";
import { ProductForm, type ProductFormValues } from "../product-form";
import { DescriptionEditor } from "./description-editor";

/**
 * 상품 정보 폼 + 상세 설명 에디터를 한 화면에서 오간다.
 *
 * "상세 설명 편집하기"를 누르면 페이지를 이동하는 대신, 폼 화면 전체가
 * 크기 변화 없이 왼쪽으로 밀려나고 에디터가 화면 오른쪽에서 같은 폭으로
 * 밀고 들어온다. 두 패널을 나란히 둔 트랙(가로 200%)을 통째로
 * translateX 시켜 구현한다.
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
    <div className="overflow-hidden">
      <div
        className={`flex w-[200%] transition-transform duration-300 ease-out ${
          editing ? "-translate-x-1/2" : "translate-x-0"
        }`}
      >
        <div className="w-1/2 shrink-0 pr-6">
          <ProductForm
            initial={initial}
            onEditDescription={() => setEditing(true)}
          />
        </div>

        <div className="w-1/2 shrink-0 pl-6">
          {initial.id ? (
            <DescriptionEditor
              productId={initial.id}
              initial={description}
              onClose={() => setEditing(false)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
