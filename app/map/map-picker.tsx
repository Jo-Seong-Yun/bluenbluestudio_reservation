"use client";

import { useState } from "react";

export function MapPicker({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError(true);
      const el = document.getElementById("address-text");
      if (el) {
        const range = document.createRange();
        range.selectNode(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-3">
        <p className="text-muted text-center text-sm">촬영 장소</p>

        <div className="bg-surface border-border flex items-center gap-3 rounded-xl border p-5">
          <p
            id="address-text"
            className="text-foreground flex-1 select-all text-base font-medium leading-relaxed"
          >
            {address}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? "복사됐습니다" : "주소 복사"}
            aria-label="주소 복사"
            className="text-muted hover:text-foreground shrink-0 transition-colors"
          >
            {copied ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path
                  d="M4 10l4.5 4.5L16 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <rect x="7" y="7" width="9" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-7A1.5 1.5 0 0 0 3 5.5v8A1.5 1.5 0 0 0 4.5 15H7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            )}
          </button>
        </div>

        {copyError && (
          <p className="text-muted text-center text-xs">위 주소를 직접 선택해 복사해 주세요</p>
        )}
      </div>
    </div>
  );
}
