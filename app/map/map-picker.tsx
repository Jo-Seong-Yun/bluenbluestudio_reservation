"use client";

import { useState } from "react";

const MAP_SERVICES = [
  {
    name: "네이버 지도",
    color: "#03C75A",
    url: (q: string) => `https://map.naver.com/v5/search/${encodeURIComponent(q)}`,
  },
  {
    name: "카카오맵",
    color: "#FEE500",
    textColor: "#181600",
    url: (q: string) => `https://map.kakao.com/?q=${encodeURIComponent(q)}`,
  },
  {
    name: "구글 지도",
    color: "#4285F4",
    url: (q: string) =>
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
  },
];

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
      // 클립보드 거부된 경우 텍스트 선택으로 폴백
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
      <div className="w-full max-w-sm space-y-6">
        <p className="text-muted text-center text-sm">촬영 장소</p>

        {/* 주소 */}
        <div className="bg-surface border-border rounded-xl border p-5 text-center">
          <p
            id="address-text"
            className="text-foreground select-all text-base font-medium leading-relaxed"
          >
            {address}
          </p>
        </div>

        {/* 복사 버튼 */}
        <button
          type="button"
          onClick={handleCopy}
          className="border-border bg-surface hover:bg-surface-subtle flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors"
        >
          {copied ? (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M3 8l3.5 3.5L13 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              복사됐습니다
            </>
          ) : copyError ? (
            <>위 주소를 직접 선택해 복사해 주세요</>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <rect
                  x="5"
                  y="5"
                  width="8"
                  height="9"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v7A1.5 1.5 0 0 0 3.5 12H5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              주소 복사
            </>
          )}
        </button>

        {/* 지도 앱 선택 */}
        <div className="space-y-2">
          <p className="text-muted text-center text-xs">지도 앱으로 열기</p>
          <div className="grid grid-cols-3 gap-2">
            {MAP_SERVICES.map((svc) => (
              <a
                key={svc.name}
                href={svc.url(address)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 rounded-xl py-3 text-xs font-semibold transition-opacity hover:opacity-85"
                style={{
                  backgroundColor: svc.color,
                  color: svc.textColor ?? "#fff",
                }}
              >
                {svc.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
