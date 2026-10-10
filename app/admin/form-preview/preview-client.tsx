"use client";
import { useEffect, useState } from "react";
import { ReservationForm } from "@/components/reservation-form";
import { PendingOverlayProvider } from "@/components/pending-overlay";
import type { CustomField } from "@/lib/booking/custom-fields-shared";
import type { BookingCopy } from "@/lib/booking/copy";
import type { BookingDetailProduct } from "@/components/booking-detail";
import "@/app/booking/booking.css";
export type FormPreviewData = {
  product: BookingDetailProduct & { id: string };
  fields: CustomField[];
  copy: BookingCopy;
  group: number;
  depositRequired: boolean;
};
export function FormPreviewClient() {
  const [data, setData] = useState<FormPreviewData | null>(null);
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data?.type !== "booking-form-preview"
      )
        return;
      const value = event.data.payload;
      if (
        !value?.product?.id ||
        !Array.isArray(value.fields) ||
        !value.copy ||
        !Number.isInteger(value.group)
      )
        return;
      setData(value);
    }
    window.addEventListener("message", receive);
    window.parent.postMessage(
      { type: "booking-form-preview-ready" },
      window.location.origin,
    );
    return () => window.removeEventListener("message", receive);
  }, []);
  if (!data)
    return (
      <p className="p-5 text-sm text-slate-500">
        미리보기를 준비하고 있습니다.
      </p>
    );
  return (
    <PendingOverlayProvider>
      <div className="booking-workspace booking-page">
        <ReservationForm
          key={JSON.stringify([data.copy, data.fields, data.group])}
          previewOnly
          initialGroup={data.group}
          productId={`editor-preview-${data.product.id}`}
          productName={data.product.name}
          durationMin={data.product.duration_min}
          bufferAfterMin={0}
          basePrice={data.product.sale_price ?? data.product.price}
          candidates={[
            { date: "2026-12-01", time: "10:00" },
            { date: "2026-12-02", time: "11:00" },
            { date: "2026-12-03", time: "12:00" },
          ]}
          backHref="#"
          bankAccount={null}
          notice={null}
          successHeading={data.copy.successTitle}
          successMessage={data.copy.successIntro}
          customFields={data.fields}
          copy={data.copy}
          depositRequired={data.depositRequired}
        />
        <p className="p-4 text-center text-xs text-slate-500">
          예시 일정입니다. 실제 예약은 접수되지 않습니다.
        </p>
      </div>
    </PendingOverlayProvider>
  );
}
