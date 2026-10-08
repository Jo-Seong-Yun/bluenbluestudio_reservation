"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

/** Code Slots style, with one native input preserving paste, editing and FormData. */
export function BirthDateSlots({
  name,
  label,
  required,
  initialValue,
  onValueChange,
}: {
  name: string;
  label: string;
  required: boolean;
  initialValue: string;
  onValueChange: (value: string) => void;
}) {
  const [value, setValue] = useState(
    initialValue.replace(/\D/g, "").slice(0, 8),
  );
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  return (
    <div className="booking-birth-slots" ref={row}>
      <input
        name={name}
        aria-label={label}
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        enterKeyHint="next"
        required={required}
        pattern="[0-9]{8}"
        value={value}
        onChange={(event) => {
          const clean = event.target.value.replace(/\D/g, "").slice(0, 8);
          event.target.value = clean;
          setValue(clean);
          onValueChange(clean);
          setActive(Math.min(event.target.selectionStart ?? clean.length, 7));
        }}
        onSelect={(event) =>
          setActive(
            Math.min(event.currentTarget.selectionStart ?? value.length, 7),
          )
        }
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPointerDown={(event) => {
          const slots =
            row.current?.querySelectorAll<HTMLElement>("[data-birth-slot]");
          if (!slots) return;
          const nearest = Array.from(slots).reduce(
            (best, slot, index) => {
              const rect = slot.getBoundingClientRect();
              const distance = Math.abs(
                event.clientX - rect.left - rect.width / 2,
              );
              return distance < best.distance ? { index, distance } : best;
            },
            { index: 0, distance: Infinity },
          ).index;
          const index = Math.min(nearest, value.length);
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
          event.currentTarget.setSelectionRange(
            index,
            Math.min(index + 1, value.length),
          );
          setActive(Math.min(index, 7));
        }}
      />
      {Array.from({ length: 8 }, (_, index) => (
        <span key={index} className="booking-birth-part">
          {index === 4 || index === 6 ? (
            <span className="booking-birth-separator" aria-hidden="true">
              .
            </span>
          ) : null}
          <span
            data-birth-slot
            className={["booking-birth-slot", value[index] ? "is-filled" : "", focused && active === index ? "is-active" : ""].filter(Boolean).join(" ")}
            aria-hidden="true"
          >
            {value[index] ? (
              <motion.span
                key={value[index]}
                initial={reduce ? false : { opacity: 0, y: 8, scale: 0.75 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
              >
                {value[index]}
              </motion.span>
            ) : null}
          </span>
        </span>
      ))}
    </div>
  );
}
