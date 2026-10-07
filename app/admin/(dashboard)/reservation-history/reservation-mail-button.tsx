"use client";
import { useState } from "react";
import { SendCustomerEmailButton } from "../customers/send-customer-email-button";
import type { EmailRule } from "@/lib/notifications/email-rules-shared";
/** 행마다 편집기를 만들지 않고 클릭한 예약의 발송 창만 엽니다. */
export function ReservationMailButton({
  reservationId,
  phone,
  name,
  email,
  rules,
  siteVariables,
}: {
  reservationId: string;
  phone: string;
  name: string;
  email: string | null;
  rules: EmailRule[];
  siteVariables: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="border-border rounded-md border px-3 py-2 text-xs"
        onClick={() => setOpen(true)}
      >
        수동 메일
      </button>
      {open ? (
        <SendCustomerEmailButton
          customers={[{ phone, name, email }]}
          rules={rules}
          siteVariables={siteVariables}
          reservationId={reservationId}
          autoOpen
          onClosed={() => setOpen(false)}
          onSent={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
