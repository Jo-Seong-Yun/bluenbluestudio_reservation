"use client";

import { useState } from "react";
import { ProductForm, type ProductFormValues } from "../product-form";
import { DescriptionEditor } from "./description-editor";

/**
 * 상품 정보 폼 + 상세 설명 에디터.
 *
 * 평소엔 폼 하나만 화면 가운데에 좁게 떠 있다. "상세 설명 편집하기"를
 * 누르면 그때 에디터가 폼 오른쪽에 나타나면서 화면이 2단으로 넓어진다
 * — 예전처럼 폼이 화면 밖으로 밀려나 사라지는 게 아니라, 폼은 그
 * 자리에 그대로 있고 에디터가 옆에 더해지는 방식이다.
 */
export function ProductEditorPanel({
  initial,
  description,
}: {
  initial: ProductFormValues;
  description: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing && initial.id) {
    return (
      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <ProductForm initial={initial} />
        <DescriptionEditor
          productId={initial.id}
          initial={description}
          onClose={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ProductForm
        initial={initial}
        onEditDescription={initial.id ? () => setEditing(true) : undefined}
      />
    </div>
  );
}
