"use client";

import { deleteCustomField } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";

/** 문항 삭제. 지금까지 손님이 이 문항에 남긴 답변도 같이 사라진다. */
export function DeleteFieldButton({
  id,
  productId,
  label,
}: {
  id: string;
  productId: string;
  label: string;
}) {
  return (
    <form
      action={deleteCustomField}
      onSubmit={(event) => {
        if (
          !confirm(
            `"${label}" 문항을 삭제할까요? 지금까지 이 문항에 남긴 손님 답변도 함께 사라지고 되돌릴 수 없어요.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="productId" value={productId} />
      <SubmitButton variant="ghost" className="text-xs">
        삭제
      </SubmitButton>
    </form>
  );
}
