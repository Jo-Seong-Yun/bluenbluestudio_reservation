"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createReservation,
  type ReservationActionState,
} from "@/lib/booking/actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";
import { calculateAge, parseBirthDate8 } from "@/lib/age";
import {
  fieldFormName,
  type CustomField,
} from "@/lib/booking/custom-fields-shared";

const initialState: ReservationActionState = { status: "idle" };

/**
 * 신청서 작성 페이지 본문. 날짜·시간은 이미 정해진 채로 이 페이지에
 * 들어오므로(URL에 박혀 있다), 여기서는 문항들만 받는다.
 *
 * 예전엔 이름·연락처·이메일·성별·생년월일·인원·요청사항이 이 컴포넌트에
 * 하드코딩돼 항상 나갔는데, 이제는 그런 "기본 문항" 없이 상품별
 * customFields 목록만 순서대로 그린다 — 이름/연락처 등도 문항편집에서
 * 만든 문항 중 하나(타입이 name/phone/... 인 것)일 뿐이라 다른 상품엔
 * 없을 수도 있다(app/admin/actions.ts의 DEFAULT_CUSTOM_FIELDS가 새
 * 상품에 기본으로 5개를 만들어 둔다).
 */
export function ReservationForm({
  productId,
  productName,
  durationMin,
  bufferAfterMin,
  date,
  time,
  dateLabel,
  backHref,
  bankAccount,
  notice,
  customFields,
}: {
  productId: string;
  productName: string;
  durationMin: number;
  bufferAfterMin: number;
  date: string;
  time: string;
  dateLabel: string;
  backHref: string;
  bankAccount: string | null;
  notice: string | null;
  customFields: CustomField[];
}) {
  const boundAction = createReservation.bind(
    null,
    productId,
    productName,
    durationMin,
    bufferAfterMin,
    bankAccount,
    notice,
  );
  const [state, action, pending] = useActionState(boundAction, initialState);

  if (state.status === "success") {
    return (
      <div className="border-border bg-surface mt-8 rounded-xl border p-6">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          예약 신청이 접수되었습니다
        </p>
        <p className="mt-3 text-2xl font-bold tracking-wide">{state.code}</p>
        <p className="text-muted mt-1 text-sm">
          예약 내역은 입력하신 연락처로 조회할 수 있으며, 아래 계좌로 예약금을
          입금하시면 예약이 최종 확정됩니다.
        </p>

        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted w-16 shrink-0">상품</dt>
            <dd>{productName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted w-16 shrink-0">일시</dt>
            <dd>
              {state.dateLabel} {state.timeLabel}
            </dd>
          </div>
        </dl>

        {bankAccount ? (
          <div className="border-border bg-surface-subtle mt-4 rounded-lg border p-3 text-sm">
            <p className="font-medium">입금 계좌</p>
            <p className="text-muted mt-0.5">{bankAccount}</p>
          </div>
        ) : null}

        {notice ? <p className="text-muted mt-4 text-sm">{notice}</p> : null}

        <Link href="/booking" className="mt-6 block">
          <Button type="button" className="w-full">
            확인
          </Button>
        </Link>

        <Link
          href="/booking/lookup"
          className="text-brand mt-3 inline-block text-sm hover:underline"
        >
          예약 조회하러 가기 →
        </Link>
      </div>
    );
  }

  return (
    <div className="border-border bg-surface mt-8 rounded-xl border p-5">
      <Link href={backHref} className="text-muted text-sm hover:underline">
        ← 날짜·시간 다시 고르기
      </Link>

      <h1 className="mt-2 text-xl font-bold">신청 내용 작성</h1>
      <p className="text-muted mt-1 text-sm">
        {productName} · {dateLabel} {time}
      </p>

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="time" value={time} />

        {customFields.map((field) => (
          <ReservationFieldInput key={field.id} field={field} />
        ))}

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="agreePrivacy"
            required
            className="mt-0.5 h-4 w-4"
          />
          <span>
            <span className="text-red-600 dark:text-red-400">* </span>
            예약 확인을 위해 위 정보를 수집합니다. 촬영일로부터 1년간 보관 후
            삭제하며, 예약 외 다른 목적으로 쓰지 않습니다.
            <br />
            <span className="font-medium">동의합니다.</span>
          </span>
        </label>

        <ErrorText>{state.status === "error" ? state.error : null}</ErrorText>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "접수 중…" : "예약 신청"}
        </Button>
      </form>
    </div>
  );
}

/** 문항 하나를 타입에 맞는 입력으로 그린다. */
function ReservationFieldInput({ field }: { field: CustomField }) {
  const name = fieldFormName(field.id);
  const options = field.options ?? [];

  if (field.type === "name") {
    return (
      <Field
        label={field.label}
        required={field.required}
        hint={field.description ?? undefined}
      >
        <input
          name={name}
          required={field.required}
          maxLength={50}
          className={inputClass}
        />
      </Field>
    );
  }

  if (field.type === "phone") {
    return (
      <Field
        label={field.label}
        required={field.required}
        hint={
          field.description ??
          "예약 조회할 때 필요해요. '-' 없이/있이 상관없어요."
        }
      >
        <input
          name={name}
          type="tel"
          inputMode="numeric"
          placeholder="01012345678"
          required={field.required}
          className={inputClass}
        />
      </Field>
    );
  }

  if (field.type === "email") {
    return (
      <Field
        label={field.label}
        required={field.required}
        hint={
          field.description ?? "입력하시면 문자와 함께 이메일로도 안내해드려요."
        }
      >
        <input
          name={name}
          type="email"
          placeholder="you@example.com"
          required={field.required}
          className={inputClass}
        />
      </Field>
    );
  }

  if (field.type === "gender") {
    return (
      <Field
        label={field.label}
        required={field.required}
        hint={field.description ?? undefined}
      >
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name={name}
              value="male"
              required={field.required}
            />
            남성
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name={name}
              value="female"
              required={field.required}
            />
            여성
          </label>
        </div>
      </Field>
    );
  }

  if (field.type === "birth_date") {
    return <BirthDateInput field={field} name={name} />;
  }

  if (field.type === "long_text") {
    return (
      <Field
        label={field.label}
        required={field.required}
        hint={field.description ?? undefined}
      >
        <textarea
          name={name}
          rows={3}
          maxLength={1000}
          required={field.required}
          className={inputClass}
        />
      </Field>
    );
  }

  if (field.type === "single_choice") {
    return (
      <Field
        label={field.label}
        required={field.required}
        hint={field.description ?? undefined}
      >
        <div className="space-y-1.5">
          {options.map((option) => (
            <label key={option} className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name={name}
                value={option}
                required={field.required}
              />
              {option}
            </label>
          ))}
        </div>
      </Field>
    );
  }

  if (field.type === "multi_choice") {
    return (
      <Field
        label={field.label}
        required={field.required}
        hint={field.description ?? undefined}
      >
        <div className="space-y-1.5">
          {options.map((option) => (
            <label key={option} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name={name} value={option} />
              {option}
            </label>
          ))}
        </div>
      </Field>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name={name}
          required={field.required}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          {field.label}
          {field.required ? (
            <span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
          ) : null}
          {field.description ? (
            <span className="text-muted mt-1 block text-xs">
              {field.description}
            </span>
          ) : null}
        </span>
      </label>
    );
  }

  // short_text
  return (
    <Field
      label={field.label}
      required={field.required}
      hint={field.description ?? undefined}
    >
      <input
        name={name}
        type="text"
        maxLength={200}
        required={field.required}
        className={inputClass}
      />
    </Field>
  );
}

/** 생년월일 입력. 8자리를 타이핑하는 대로 만나이/한국나이/미성년자를 보여준다. */
function BirthDateInput({ field, name }: { field: CustomField; name: string }) {
  const [value, setValue] = useState("");
  const parsedDate = parseBirthDate8(value);
  const ageInfo = parsedDate ? calculateAge(parsedDate) : null;

  return (
    <Field
      label={field.label}
      required={field.required}
      hint={field.description ?? "8자리 숫자로 입력해주세요. 예: 19990101"}
    >
      <input
        name={name}
        type="text"
        inputMode="numeric"
        placeholder="19990101"
        maxLength={8}
        required={field.required}
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
        className={inputClass}
      />
      {ageInfo ? (
        <p className="text-muted mt-1 text-xs">
          만 {ageInfo.manAge}세 (한국 나이 {ageInfo.koreanAge}세) ·{" "}
          <span
            className={
              ageInfo.isMinor
                ? "font-medium text-amber-600 dark:text-amber-400"
                : ""
            }
          >
            {ageInfo.isMinor ? "미성년자" : "성인"}
          </span>
        </p>
      ) : null}
    </Field>
  );
}
