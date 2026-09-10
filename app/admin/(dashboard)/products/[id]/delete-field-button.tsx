"use client";

import { deleteCustomField } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";

/**
 * 문항 삭제. 지금까지 손님이 이 문항에 남긴 답변도 같이 사라진다.
 * locked면(이름·연락처) 아예 지울 수 없다 — 손님을 특정·연락할 방법이
 * 없어져 예약이 무의미해지기 때문. 삭제 버튼 대신 이유를 보여준다.
 * (실제 강제는 서버 액션 쪽에서 한다 — 이 버튼을 숨기는 건 안내일 뿐.)
 */
export function DeleteFieldButton({
  id,
  productId,
  label,
  locked,
}: {
  id: string;
  productId: string;
  label: string;
  locked?: boolean;
}) {
  if (locked) {
    return (
      <span
        title="이름·연락처는 예약을 받으려면 꼭 필요해서 지울 수 없어요."
        className="text-muted/60 cursor-default text-xs"
      >
        삭제 불가
      </span>
    );
  }

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
