"use client";

import { useState } from "react";

const currency = new Intl.NumberFormat("ko-KR");

/**
 * 사이트 안 모든 금액 입력칸이 공통으로 쓰는 서식 — 타이핑 중엔
 * 숫자만, 포커스를 벗어나면 "₩50,000"처럼 ₩ 접두사와 천단위 콤마로
 * 다시 보여준다. 실제 폼에 실리는 값(DOM에 하나뿐인 <input>)은
 * 항상 숫자만 남긴 문자열이라, 서버 쪽 파싱은 그대로 두면 된다.
 *
 * 대부분의 폼(uncontrolled): defaultValue만 주면 내부에서 알아서
 * 상태를 들고 있는다.
 * 여러 칸이 부모 state와 같이 움직여야 하는 경우(controlled, 예:
 * 문항편집의 옵션별 가격): value/onChange를 넘기면 그걸 그대로 쓴다.
 */
export function MoneyInput({
  name,
  value,
  onChange,
  defaultValue,
  required,
  placeholder = "0",
  className = "",
  id,
}: {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: number | string | null;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(
    defaultValue != null && defaultValue !== "" ? String(defaultValue) : "",
  );
  const [isFocused, setIsFocused] = useState(false);

  const current = isControlled ? (value ?? "") : internalValue;

  function handleChange(next: string) {
    const digits = next.replace(/[^0-9]/g, "");
    if (isControlled) onChange?.(digits);
    else setInternalValue(digits);
  }

  return (
    <div
      className={`border-border bg-surface focus-within:border-brand focus-within:ring-brand/30 flex items-center gap-1 rounded-lg border pl-3 focus-within:ring-2 ${className}`}
    >
      <span className="text-muted shrink-0">₩</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        name={name}
        required={required}
        placeholder={placeholder}
        value={
          isFocused ? current : current ? currency.format(Number(current)) : ""
        }
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="w-full bg-transparent py-2 pr-3 text-base outline-none"
      />
    </div>
  );
}
