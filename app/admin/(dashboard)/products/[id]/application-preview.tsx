"use client";
import { useRef } from "react";
import { ReservationFields } from "@/components/reservation-form";
import {
  visibleBookingFields,
  type CustomField,
} from "@/lib/booking/custom-fields-shared";
import { Button } from "@/components/ui";
import "@/app/booking/booking.css";
export function ApplicationPreview({ fields }: { fields: CustomField[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const active = visibleBookingFields(fields);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => dialog.current?.showModal()}
      >
        신청서 미리보기 ({active.length})
      </Button>
      <dialog
        ref={dialog}
        className="border-border bg-surface text-foreground w-[calc(100%-2rem)] max-w-3xl rounded-xl border p-0 backdrop:bg-black/50"
        aria-label="상품 신청서 미리보기"
      >
        <header className="border-border flex items-center justify-between gap-3 border-b p-5">
          <div>
            <h3 className="font-bold">손님에게 표시되는 신청서</h3>
            <p className="text-muted mt-1 text-xs">
              저장된 활성 문항을 순서대로 표시합니다. 입력 내용은 저장되지
              않습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="미리보기 닫기"
            className="p-2 text-lg"
          >
            ×
          </button>
        </header>
        <div
          className="booking-workspace max-h-[70dvh] overflow-y-auto p-5"
          style={{ "--brand": "#173b67" } as React.CSSProperties}
        >
          <form onSubmit={(e) => e.preventDefault()}>
            {active.length ? (
              <ReservationFields fields={active} />
            ) : (
              <p className="text-muted text-sm">활성 문항이 없습니다.</p>
            )}
          </form>
        </div>
      </dialog>
    </>
  );
}
