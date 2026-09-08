import { ProductForm, type ProductFormValues } from "../product-form";
import { DescriptionEditor } from "./description-editor";

/**
 * 상품 정보 폼 + 상세 설명 에디터를 한 화면에 나란히 둔다.
 *
 * 예전엔 "상세 설명 편집하기"를 누르면 폼이 화면 밖으로 밀려나고
 * 에디터가 그 자리를 대신 차지하는 슬라이드 방식이었는데, 왼쪽에서
 * 기본 정보를 고치면서 오른쪽에서 바로 결과를 확인하고 싶을 때
 * 화면을 오갈 필요 없이 둘 다 항상 보이는 쪽이 낫다.
 */
export function ProductEditorPanel({
  initial,
  description,
}: {
  initial: ProductFormValues;
  description: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
      <ProductForm initial={initial} />

      {initial.id ? (
        <DescriptionEditor productId={initial.id} initial={description} />
      ) : (
        <div className="border-border bg-surface-subtle rounded-xl border p-5">
          <p className="text-muted text-sm">
            상품을 먼저 저장하면 상세 설명을 쓸 수 있어요.
          </p>
        </div>
      )}
    </div>
  );
}
