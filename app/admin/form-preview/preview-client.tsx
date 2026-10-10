"use client";
import { useEffect, useState } from "react";
import { BookingDetail } from "@/components/booking-detail";
import { BookingFlow } from "@/components/booking-flow";
import { ReservationSuccessCard } from "@/components/reservation-success-card";
import { BookingSteps } from "@/components/booking-shell";
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
  stage?: "detail" | "times" | "form" | "review" | "success";
  depositRequired: boolean;
  bankAccount?: string | null;
  notice?: string | null;
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
        !Number.isInteger(value.group) ||
        (value.stage !== undefined &&
          !["detail", "times", "form", "review", "success"].includes(
            value.stage,
          ))
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
      <div
        className="booking-workspace booking-page"
        onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest("a"))
            event.preventDefault();
        }}
      >
        {data.stage === "detail" ? (
          <BookingDetail
            product={data.product}
            earliestBookable="12월 1일"
            latestBookable="12월 31일"
            copy={data.copy}
            depositRequired={data.depositRequired}
          />
        ) : data.stage === "times" ? (
          <BookingFlow
            key={data.stage}
            previewOnly
            productId={`editor-preview-${data.product.id}`}
            productName={data.product.name}
            basePrice={data.product.sale_price ?? data.product.price}
            durationMin={data.product.duration_min}
            month="2026-12"
            availableDates={["2026-12-01", "2026-12-02", "2026-12-03"]}
            minMonth="2026-12"
            maxMonth="2026-12"
            basePath="#"
            loadSlots={async () => ["10:00", "11:00", "12:00"]}
            copy={data.copy}
            depositRequired={data.depositRequired}
          />
        ) : data.stage === "success" ? (
          <>
            <BookingSteps stage="success" />
            <ReservationSuccessCard
              successHeading={data.copy.successTitle}
              successMessage={data.copy.successIntro}
              code="PREVIEW1"
              productName={data.product.name}
              candidates={[
                { dateLabel: "12월 1일", timeLabel: "10:00" },
                { dateLabel: "12월 2일", timeLabel: "11:00" },
                { dateLabel: "12월 3일", timeLabel: "12:00" },
              ]}
              bankAccount={data.bankAccount ?? null}
              notice={data.notice ?? null}
              copy={data.copy}
              depositRequired={data.depositRequired}
              estimatedTotal={data.product.sale_price ?? data.product.price}
              durationMin={data.product.duration_min}
              interactive={false}
            />
          </>
        ) : (
          <ReservationForm
            key={JSON.stringify([
              data.copy,
              data.fields,
              data.group,
              data.stage,
            ])}
            previewOnly
            initialGroup={data.group}
            initialReview={data.stage === "review"}
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
            bankAccount={data.bankAccount ?? null}
            notice={data.notice ?? null}
            successHeading={data.copy.successTitle}
            successMessage={data.copy.successIntro}
            customFields={data.fields}
            copy={data.copy}
            depositRequired={data.depositRequired}
          />
        )}
        <p className="p-4 text-center text-xs text-slate-500">
          예시 일정입니다. 실제 예약은 접수되지 않습니다.
        </p>
      </div>
    </PendingOverlayProvider>
  );
}
