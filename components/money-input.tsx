"use client";

import { useLayoutEffect, useRef, useState } from "react";

const currency = new Intl.NumberFormat("ko-KR");

function formatDigits(digits: string): string {
  return digits ? currency.format(Number(digits)) : "";
}

/** 포맷된 문자열에서 "숫자 몇 번째 앞에 커서가 있어야 하는가"를
 * 실제 커서 위치(콤마 포함)로 바꾼다. 콤마가 새로 끼어들거나
 * 빠지면서 커서가 엉뚱한 자리로 밀리는 걸 막는 핵심 로직이다. */
function caretForDigitIndex(formatted: string, digitsBefore: number): number {
  if (digitsBefore <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/[0-9]/.test(formatted[i])) {
      seen++;
      if (seen === digitsBefore) return i + 1;
    }
  }
  return formatted.length;
}

/**
 * 사이트 안 모든 금액 입력칸이 공통으로 쓰는 서식 — 타이핑하는 동안
 * 실시간으로 "₩50,000"처럼 ₩ 접두사와 천단위 콤마를 붙여 보여준다.
 * 콤마를 문자열 중간에 끼워 넣으면 브라우저가 커서를 맨 끝으로
 * 튕겨버리는 게 일반적인 함정이라, 매 입력마다 "커서 앞에 숫자가
 * 몇 개였는지"를 세어 포맷된 문자열에서 그 위치를 다시 찾아 복원한다
 * (caretForDigitIndex). 실제 폼에 실리는 값은 name이 붙은 숨은 칸의
 * 숫자만 남긴 문자열이라, 서버 쪽 파싱은 그대로 두면 된다.
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
  const current = isControlled ? (value ?? "") : internalValue;

  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);

  // 값이 바뀐 뒤(=포맷된 문자열이 화면에 실제로 다시 그려진 뒤) 커서를
  // 계산해둔 자리로 되돌린다. onChange 안에서 바로 하면 아직 React가
  // 새 value를 DOM에 반영하기 전이라 타이밍이 어긋난다.
  useLayoutEffect(() => {
    if (pendingCaret.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(
        pendingCaret.current,
        pendingCaret.current,
      );
      pendingCaret.current = null;
    }
  }, [current]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const cursorPos = e.target.selectionStart ?? raw.length;
    const digitsBeforeCursor = raw
      .slice(0, cursorPos)
      .replace(/[^0-9]/g, "").length;
    const digits = raw.replace(/[^0-9]/g, "");

    pendingCaret.current = caretForDigitIndex(
      formatDigits(digits),
      digitsBeforeCursor,
    );

    if (isControlled) onChange?.(digits);
    else setInternalValue(digits);
  }

  return (
    <div
      className={`border-border bg-surface focus-within:border-brand focus-within:ring-brand/30 flex items-center gap-1 rounded-lg border pl-3 focus-within:ring-2 ${className}`}
    >
      <span className="text-muted shrink-0">₩</span>
      {/* 화면에 보이는 칸은 "50,000"처럼 콤마가 들어가 서버에서
          Number()로 읽으면 NaN이 된다 — 폼에는 숫자만 담은 숨은 칸을 싣는다. */}
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        required={required}
        placeholder={placeholder}
        value={formatDigits(current)}
        onChange={handleChange}
        className="w-full bg-transparent py-2 pr-3 text-base outline-none"
      />
    </div>
  );
}
