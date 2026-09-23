"use client";

import { useActionState, useState } from "react";
import {
  saveBookingStyle,
  type BookingStyleActionState,
} from "@/app/admin/actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";
import { useReportPending } from "@/components/pending-overlay";
import {
  BOOKING_STYLE_TEMPLATES,
  CARD_RADIUS_OPTIONS,
  CARD_SIZE_OPTIONS,
  TEXT_SIZE_OPTIONS,
  type BookingStyle,
} from "@/lib/booking-style";
import { BookingStylePreview } from "./booking-style-preview";

const FORM_ID = "design-form";

export function DesignForm({ initial }: { initial: BookingStyle }) {
  const [state, action, pending] = useActionState<
    BookingStyleActionState,
    FormData
  >(saveBookingStyle, null);
  useReportPending(pending);

  const [style, setStyle] = useState(initial);

  function patch(next: Partial<BookingStyle>) {
    setStyle((prev) => ({ ...prev, ...next }));
  }

  return (
    <>
      <div className="bg-background border-border sticky top-16 z-10 -mx-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-b px-4 py-4 sm:-mx-[8.5%] sm:px-[8.5%]">
        <Button type="submit" form={FORM_ID} disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </Button>
        {state?.success ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            저장했습니다.
          </p>
        ) : null}
        <ErrorText>{state?.error ?? null}</ErrorText>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <form id={FORM_ID} action={action} className="max-w-xl space-y-8">
          <section className="space-y-3">
            <h2 className="font-bold">템플릿</h2>
            <p className="text-muted -mt-1 text-xs">
              눌러서 시작하고, 아래 낱개 항목으로 자유롭게 더 바꿀 수 있습니다.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BOOKING_STYLE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => patch(tpl.style)}
                  className="border-border hover:border-brand rounded-lg border p-2.5 text-left transition-colors"
                >
                  <div className="mb-1.5 flex gap-1">
                    <span
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: tpl.style.accentColor }}
                      aria-hidden
                    />
                    <span
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: tpl.style.saleColor }}
                      aria-hidden
                    />
                  </div>
                  <p className="text-xs font-bold">{tpl.label}</p>
                  <p className="text-muted text-[11px]">{tpl.description}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-bold">색상</h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="강조색" hint="예약하기 링크·예약 조회 버튼.">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="accentColor"
                    value={style.accentColor}
                    onChange={(e) => patch({ accentColor: e.target.value })}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded border p-0.5"
                  />
                  <input
                    type="text"
                    value={style.accentColor}
                    onChange={(e) => patch({ accentColor: e.target.value })}
                    className={`${inputClass} font-mono uppercase`}
                  />
                </div>
              </Field>

              <Field label="세일 배지 색" hint="할인율 배지.">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="saleColor"
                    value={style.saleColor}
                    onChange={(e) => patch({ saleColor: e.target.value })}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded border p-0.5"
                  />
                  <input
                    type="text"
                    value={style.saleColor}
                    onChange={(e) => patch({ saleColor: e.target.value })}
                    className={`${inputClass} font-mono uppercase`}
                  />
                </div>
              </Field>

              <Field label="텍스트 색" hint="상품명·가격.">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="textColor"
                    value={style.textColor}
                    onChange={(e) => patch({ textColor: e.target.value })}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded border p-0.5"
                  />
                  <input
                    type="text"
                    value={style.textColor}
                    onChange={(e) => patch({ textColor: e.target.value })}
                    className={`${inputClass} font-mono uppercase`}
                  />
                </div>
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-bold">글자·카드 모양</h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <span className="mb-1.5 block text-sm font-medium">텍스트 크기</span>
                <input type="hidden" name="textSize" value={style.textSize} />
                <div className="flex flex-wrap gap-1.5">
                  {TEXT_SIZE_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={style.textSize === opt.value ? "primary" : "ghost"}
                      aria-pressed={style.textSize === opt.value}
                      className="text-xs"
                      onClick={() => patch({ textSize: opt.value })}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium">박스 모서리</span>
                <input type="hidden" name="cardRadius" value={style.cardRadius} />
                <div className="flex flex-wrap gap-1.5">
                  {CARD_RADIUS_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={style.cardRadius === opt.value ? "primary" : "ghost"}
                      aria-pressed={style.cardRadius === opt.value}
                      className="text-xs"
                      onClick={() => patch({ cardRadius: opt.value })}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium">박스 크기</span>
                <input type="hidden" name="cardSize" value={style.cardSize} />
                <div className="flex flex-wrap gap-1.5">
                  {CARD_SIZE_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={style.cardSize === opt.value ? "primary" : "ghost"}
                      aria-pressed={style.cardSize === opt.value}
                      className="text-xs"
                      onClick={() => patch({ cardSize: opt.value })}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </form>

        <aside className="lg:sticky lg:top-36">
          <BookingStylePreview style={style} />
        </aside>
      </div>
    </>
  );
}
