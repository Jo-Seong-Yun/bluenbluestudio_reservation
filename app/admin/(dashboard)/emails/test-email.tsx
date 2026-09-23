"use client";

import { useActionState, useEffect, useState } from "react";
import {
  saveTestEmail,
  sendRuleTest,
  type TestEmailActionState,
} from "@/app/admin/actions";
import { Button, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

/**
 * /admin/emails 상단의 "테스트 발송 주소" 저장란. 각 규칙의 "테스트
 * 발송" 버튼은 여기 저장된 주소로 예시 메일을 보낸다.
 */
export function TestEmailForm({ testEmail }: { testEmail: string }) {
  const [state, action, pending] = useActionState<TestEmailActionState, FormData>(
    saveTestEmail,
    null,
  );

  return (
    <div className="border-border bg-surface mb-4 rounded-xl border p-4">
      <label htmlFor="testEmail" className="block text-sm font-medium">
        테스트 발송 주소
      </label>
      <p className="text-muted mt-0.5 text-xs">
        규칙마다 있는 “테스트 발송”을 누르면, 예시 값이 채워진 메일이 이 주소로
        갑니다. 실제 손님에게는 나가지 않습니다.
      </p>
      <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
        <input
          id="testEmail"
          name="testEmail"
          type="email"
          defaultValue={testEmail}
          placeholder="test@example.com"
          className={`${inputClass} max-w-xs flex-1`}
        />
        <SubmitButton disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </SubmitButton>
      </form>
      {state?.error ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{state.error}</p>
      ) : state?.success ? (
        <p className="mt-2 text-xs text-green-700 dark:text-green-400">
          {state.success}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 규칙 하나를 테스트 주소로 보내는 버튼. 결과(성공/실패)는 버튼 옆에
 * 잠깐 보여줬다가 사라진다. 테스트 주소가 아직 없으면 저장 안내가 뜬다.
 */
export function TestSendButton({ ruleId }: { ruleId: string }) {
  const [state, action, pending] = useActionState<TestEmailActionState, FormData>(
    sendRuleTest,
    null,
  );
  const [flash, setFlash] = useState<TestEmailActionState>(null);

  useEffect(() => {
    if (!state) return;
    setFlash(state);
    const timer = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <div className="relative">
      <form action={action}>
        <input type="hidden" name="id" value={ruleId} />
        <Button type="submit" variant="ghost" className="text-xs" disabled={pending}>
          {pending ? "발송 중…" : "테스트 발송"}
        </Button>
      </form>
      {flash ? (
        <p
          className={`absolute top-full right-0 z-10 mt-1 w-56 rounded-md border px-2 py-1.5 text-xs shadow-sm ${
            flash.error
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              : "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
          }`}
        >
          {flash.error ?? flash.success}
        </p>
      ) : null}
    </div>
  );
}
