"use client";
import { useActionState } from "react";
import { saveInquiryUrl } from "@/app/admin/inquiry-actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";
export function InquirySettings({ initial }: { initial: string }) {
  const [state, action, pending] = useActionState(saveInquiryUrl, null);
  return (
    <section className="border-border mt-6 rounded-xl border bg-white p-5">
      <h2 className="font-bold">예약 첫 화면 · 문의하기</h2>
      <p className="text-muted mt-2 text-sm">
        오른쪽 아래의 문의 버튼에서 새 창으로 연결합니다. 링크를 비우면 버튼을
        숨깁니다.
      </p>
      <form action={action} className="mt-4 space-y-3">
        <Field label="문의 링크">
          <input
            name="inquiryUrl"
            type="url"
            defaultValue={initial}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : "문의 링크 저장"}
        </Button>
        <ErrorText>{state?.error}</ErrorText>
        {state?.success ? (
          <p role="status" className="text-sm text-green-700">
            저장했습니다.
          </p>
        ) : null}
      </form>
    </section>
  );
}
