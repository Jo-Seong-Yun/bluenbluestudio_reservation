"use client";

import { deleteEmailRule } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";

/** 규칙 삭제. 지우면 그 트리거에서 이 규칙으로 나가던 이메일이 더 이상 나가지 않는다. */
export function DeleteRuleButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteEmailRule}
      onSubmit={(event) => {
        if (
          !confirm(
            `"${name}" 규칙을 삭제하시겠습니까? 삭제하면 이 규칙으로 나가던 이메일이 더 이상 나가지 않으며 되돌릴 수 없습니다.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="ghost" className="text-xs">
        삭제
      </SubmitButton>
    </form>
  );
}
