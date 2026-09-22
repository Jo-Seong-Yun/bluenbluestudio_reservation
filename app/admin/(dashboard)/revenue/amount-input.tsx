"use client";

import { useState } from "react";

const currency = new Intl.NumberFormat("ko-KR");

/**
 * "기타지출" 추가 폼의 금액 입력칸. 숫자만 그대로 두면 "50000"처럼
 * 자릿수가 눈에 잘 안 들어와서, MoneyField(예약 상세의 지불액 입력)와
 * 같은 방식으로 포커스를 벗어나면 "₩50,000"으로 다시 보여준다.
 * 실제 폼에 실리는 값(name="amount")은 항상 숫자만 남긴 문자열이라
 * 서버 쪽 파싱은 그대로 둬도 된다.
 */
export function AmountInput() {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="border-border bg-surface focus-within:border-brand focus-within:ring-brand/30 flex items-center gap-1 rounded-lg border pl-3 focus-within:ring-2">
      <span className="text-muted shrink-0">₩</span>
      <input
        type="text"
        inputMode="numeric"
        name="amount"
        required
        placeholder="0"
        value={
          isFocused ? value : value ? currency.format(Number(value)) : ""
        }
        onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="w-full bg-transparent py-2 pr-3 text-base outline-none"
      />
    </div>
  );
}
