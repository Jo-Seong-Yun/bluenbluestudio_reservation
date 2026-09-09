"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { setProductTagColor } from "../../actions";
import { PRODUCT_TAG_COLORS, tagColorDotClass } from "@/lib/product-tag-colors";

/**
 * 상품 목록 카드에 붙는 태그 색 점. 눌러서 바로 색을 바꿀 수 있다 —
 * 수정 화면까지 들어갈 필요 없이, 목록에서 훑어보다가 바로 바꾸는 용도.
 * 수정 화면의 스와치 피커(product-form.tsx)는 그대로 남아 있고, 이건
 * 그 값을 밖에서도 건드릴 수 있게 해주는 지름길이다.
 */
export function ProductTagPicker({
  productId,
  tagColor,
}: {
  productId: string;
  tagColor: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(tagColor);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  function pick(key: string | null) {
    setOpen(false);
    setColor(key);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", productId);
      formData.set("tagColor", key ?? "");
      await setProductTagColor(formData);
    });
  }

  const dot = tagColorDotClass(color);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="태그 색상 선택"
        className="hover:ring-border flex h-5 w-5 items-center justify-center rounded-full hover:ring-2"
      >
        {dot ? (
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        ) : (
          <span className="border-border text-muted flex h-3 w-3 items-center justify-center rounded-full border text-[7px] leading-none">
            ✕
          </span>
        )}
      </button>

      {open ? (
        <div className="border-border bg-surface absolute top-6 left-0 z-10 flex w-36 flex-wrap gap-1.5 rounded-lg border p-2 shadow-lg">
          <button
            type="button"
            onClick={() => pick(null)}
            title="색상 없음"
            className="border-border text-muted hover:border-brand flex h-6 w-6 items-center justify-center rounded-full border text-xs"
          >
            ✕
          </button>
          {PRODUCT_TAG_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => pick(c.key)}
              title={c.label}
              className={`h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-(--color-surface) ${c.dot} ${
                color === c.key
                  ? "ring-(--color-brand)"
                  : "ring-transparent hover:ring-(--color-brand)/40"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
