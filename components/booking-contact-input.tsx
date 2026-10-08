"use client";

import type { InputHTMLAttributes } from "react";

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** One native input preserves autofill, FormData, delegated validation and Enter navigation. */
export function BookingContactInput({
  label,
  type,
  defaultValue,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  type: "tel" | "email";
}) {
  const phone = type === "tel";
  return (
    <span className="booking-contact-outline">
      <span className="booking-contact-label" aria-hidden="true">
        {label}
      </span>
      <input
        {...props}
        aria-label={label}
        type={type}
        inputMode={phone ? "numeric" : "email"}
        autoComplete={phone ? "tel" : "email"}
        autoCapitalize="none"
        spellCheck={false}
        defaultValue={
          phone ? formatPhone(String(defaultValue ?? "")) : defaultValue
        }
        onInput={
          phone
            ? (event) => {
                const input = event.currentTarget;
                const before = input.value
                  .slice(0, input.selectionStart ?? input.value.length)
                  .replace(/\D/g, "").length;
                input.value = formatPhone(input.value);
                const position =
                  before + (before > 3 ? 1 : 0) + (before > 7 ? 1 : 0);
                input.setSelectionRange(position, position);
              }
            : undefined
        }
        onKeyDown={
          phone
            ? (event) => {
                const input = event.currentTarget;
                const start = input.selectionStart;
                if (start == null || start !== input.selectionEnd) return;
                // Delete the neighboring digit with the separator; never trap Backspace on a hyphen.
                if (event.key === "Backspace" && input.value[start - 1] === "-")
                  input.setSelectionRange(start - 2, start);
                if (event.key === "Delete" && input.value[start] === "-")
                  input.setSelectionRange(start, start + 2);
              }
            : undefined
        }
      />
    </span>
  );
}
