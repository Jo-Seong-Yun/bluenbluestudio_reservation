"use client";

import { useActionState } from "react";
import { signIn, type ActionState } from "../actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    signIn,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <Field label="이메일">
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className={inputClass}
        />
      </Field>

      <Field label="비밀번호">
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </Field>

      <ErrorText>{state?.error}</ErrorText>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "확인 중…" : "로그인"}
      </Button>
    </form>
  );
}
