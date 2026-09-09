"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Button } from "./ui";

/**
 * <form action={서버액션}> 안에서 쓰는 제출 버튼. useActionState 없이
 * 그냥 action={fn}만 쓰는 자리(토글·삭제·순서변경 같은 자리)는 서버
 * 왕복이 끝나기 전까지 버튼이 아무 반응도 안 보여서 "눌렀는데 안
 * 눌렸나?" 싶게 느껴진다 — 이 버튼은 제출 중이면 자동으로 흐려지고
 * 다시 눌리지 않는다. useFormStatus는 자신을 감싼 가장 가까운
 * <form>의 상태만 보므로, 이 컴포넌트는 항상 그 <form> 안에서 써야 한다.
 */
export function SubmitButton({
  className = "",
  disabled,
  ...props
}: ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button
      {...props}
      type="submit"
      disabled={pending || disabled}
      className={`${pending ? "opacity-60" : ""} ${className}`}
    />
  );
}

/**
 * 위와 같은 동작을, 공용 Button 컴포넌트를 쓰지 않는 자리(밑줄 텍스트
 * 버튼, 아이콘 버튼처럼 스타일을 직접 주는 곳)에서 쓰는 버전.
 */
export function PendingSubmit({
  className = "",
  disabled,
  ...props
}: ComponentProps<"button">) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      type="submit"
      disabled={pending || disabled}
      className={`${className} ${pending ? "opacity-50" : ""}`.trim()}
    />
  );
}
