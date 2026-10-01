"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  createReservation,
  type ReservationActionState,
} from "@/lib/booking/actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";
import { useReportPending } from "@/components/pending-overlay";
import { calculateAge, parseBirthDate8 } from "@/lib/age";
import { FieldDescription } from "@/components/field-description";
import { BookingSteps } from "@/components/booking-shell";
import { ReservationSuccessCard } from "@/components/reservation-success-card";
import {
  fieldFormName,
  visibleBookingFields,
  bookingReviewAnswers,
  selectedPricedOptions,
  type CustomField,
} from "@/lib/booking/custom-fields-shared";
import { readRefCookie } from "@/lib/booking/ref-cookie";

/**
 * 신청서 라벨과 보조 설명은 읽기 쉽게 키우고, 문항 사이를 구분선으로
 * 나눠 긴 신청서에서도 문항을 건너뛰지 않게 한다.
 */
const FIELD_LABEL_CLASS = "text-base font-semibold";
const FIELD_HINT_CLASS = "text-sm";
// 라디오/체크박스는 라벨 전체(원·네모 + 글자)가 다 눌리긴 하지만, 기본
// 크기(13px 안팎)로는 선택 표시 자체가 잘 안 보여 손가락으로 짚기
// 애매하다 — py-2로 줄 높이도 같이 키워 터치 영역을 넉넉히 한다.
const OPTION_LABEL_CLASS = "flex items-center gap-2.5 py-2 text-base";
const OPTION_INPUT_CLASS = "h-5 w-5 shrink-0";
const FIELD_WRAPPER_CLASS = "booking-field";
// 기본 버튼 높이(36px)는 관리자 화면 기준이라 모바일에서 엄지로 누르기
// 빠듯하다 — 예약 흐름의 "신청하기" 버튼(booking-flow.tsx)과 같은
// 54px로 맞춘다.
const PRIMARY_CTA_CLASS = "h-[3.375rem] w-full text-base";

/** 문항 상세 설명이 있으면 서식 있는 렌더러로, 없으면 기본 힌트를 보여준다. */
function descriptionHint(
  field: CustomField,
  fallback?: React.ReactNode,
): React.ReactNode {
  return field.description ? (
    <FieldDescription html={field.description} />
  ) : (
    fallback
  );
}

const initialState: ReservationActionState = { status: "idle" };

/**
 * 신청서 작성 페이지 본문. 손님이 고른 희망 시간(정확히 3개, 우선순위 순)이
 * 이미 정해진 채로 이 페이지에 들어오므로(쿼리스트링에 담겨 있다),
 * 여기서는 문항들만 받는다.
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
  basePrice,
  candidates,
  backHref,
  bankAccount,
  notice,
  successHeading,
  successMessage,
  customFields,
}: {
  productId: string;
  productName: string;
  durationMin: number;
  bufferAfterMin: number;
  /** 상품 기본가(할인가가 있으면 할인가) — 예상 금액 계산의 출발점. */
  basePrice: number;
  /** 정확히 3개, 우선순위 순서대로. */
  candidates: { date: string; time: string }[];
  backHref: string;
  bankAccount: string | null;
  notice: string | null;
  /** 신청 완료 화면의 제목/설명(관리자 설정에서 고친다). */
  successHeading: string;
  successMessage: string;
  customFields: CustomField[];
}) {
  const fields = visibleBookingFields(customFields);
  const [reviewing, setReviewing] = useState(false);
  const [answers, setAnswers] = useState<
    { id: string; label: string; value: string }[]
  >([]);
  const boundAction = createReservation.bind(
    null,
    productId,
    productName,
    durationMin,
    bufferAfterMin,
    basePrice,
    bankAccount,
    notice,
  );
  const [state, action, pending] = useActionState(boundAction, initialState);
  useReportPending(pending);

  // 유료 옵션이 하나도 없는 상품(대부분)은 이 박스를 아예 안 보여준다
  // — 매번 기본가만 덩그러니 보여주는 건 정보가 아니라 잡음이다.
  const hasPricedFields = fields.some(
    (field) => field.option_prices && field.option_prices.length > 0,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [pricedItems, setPricedItems] = useState<
    { fieldId: string; label: string; price: number }[]
  >([]);

  // 신청서에 들어오기 전에 상품 목록/상세를 거치며 쿠키에 저장된
  // 유입경로 값 — 조회 기록과 같은 값으로 맞춰야 채널별 전환율을 비교할
  // 수 있다(lib/booking/ref-cookie.ts). 서버 렌더 시점엔 쿠키를 읽을 수
  // 없으니, state 대신 ref로 마운트 후 DOM에 직접 채워 넣는다 — 리렌더도
  // 없고 하이드레이션 시점의 서버/클라이언트 값 불일치도 없다.
  const refInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (refInputRef.current) {
      refInputRef.current.value = readRefCookie() ?? "";
    }
  }, []);

  // 체크박스/라디오를 전부 controlled로 바꾸는 건 이 화면 전체를 다시
  // 짜는 큰 변경이라, 대신 변경이 있을 때마다 DOM에서 지금 체크된 값을
  // 직접 읽어 다시 계산한다 — onChange 하나로 모든 옵션을 델리게이션해서
  // 듣는다(handleFieldKeyDown과 같은 방식).
  function recomputeEstimate() {
    if (!formRef.current || !hasPricedFields) return;
    const form = formRef.current;
    const selected = new Map<string, string[]>();
    for (const field of fields) {
      if (!field.option_prices) continue;
      const name = fieldFormName(field.id);
      const inputs = form.querySelectorAll<HTMLInputElement>(
        `input[name="${CSS.escape(name)}"]:checked`,
      );
      selected.set(
        field.id,
        Array.from(inputs).map((el) => el.value),
      );
    }
    setPricedItems(selectedPricedOptions(customFields, selected));
  }

  // 마운트 시점에도 한 번 계산한다 — 브라우저가 뒤로가기로 체크 상태를
  // 그대로 복원해 주는 경우(bfcache) 초기 렌더에는 아직 반영이 안 돼서다.
  useEffect(() => {
    recomputeEstimate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addonTotal = pricedItems.reduce((sum, item) => sum + item.price, 0);
  const estimatedTotal = basePrice + addonTotal;

  // 한 줄짜리 텍스트 입력(이름/연락처/이메일/생년월일/단답형)에서 Enter를
  // 치면, 기본 동작인 "폼 즉시 제출" 대신 바로 다음 문항 칸으로
  // 이동해서 커서를 놓는다 — 문항을 한 번에 하나씩 빠르게 채워나갈 수
  // 있게 하기 위해서다. 여러 개를 고를 수 있는 체크박스(multi_choice)는
  // Enter 한 번에 넘어가버리면 나머지를 못 고르니 손대지 않고, 서술형
  // (textarea)은 Enter가 줄바꿈이어야 하므로 애초에 대상에서 뺀다.
  function handleFieldKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (
      target.type !== "text" &&
      target.type !== "tel" &&
      target.type !== "email"
    )
      return;

    const currentBlock = target.closest("[data-field-block]");
    const nextBlock = currentBlock?.nextElementSibling;
    if (!(nextBlock instanceof HTMLElement)) return; // 마지막 문항이면 기본 제출 동작에 맡긴다.

    e.preventDefault();
    nextBlock.querySelector<HTMLElement>("input, textarea")?.focus();
    nextBlock.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function confirm() {
    const form = formRef.current;
    if (!form) return;
    // 여러 개 선택은 HTML required가 그룹 전체에 적용되지 않아 직접 검사한다.
    for (const field of fields.filter(
      (f) => f.type === "multi_choice" && f.required,
    )) {
      const inputs = [
        ...form.querySelectorAll<HTMLInputElement>(
          `input[name="${CSS.escape(fieldFormName(field.id))}"]`,
        ),
      ];
      inputs[0]?.setCustomValidity(
        inputs.some((i) => i.checked) ? "" : "하나 이상 선택해 주십시오.",
      );
    }
    if (!form.reportValidity()) return;
    setAnswers(bookingReviewAnswers(fields, new FormData(form)));
    setReviewing(true);
    requestAnimationFrame(() =>
      document.getElementById("booking-review-heading")?.focus(),
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (state.status === "success") {
    return (
      <div className="mx-auto max-w-3xl">
        <BookingSteps stage="success" />
        <ReservationSuccessCard
          successHeading={successHeading}
          successMessage={successMessage}
          code={state.code}
          productName={productName}
          candidates={state.candidates}
          bankAccount={bankAccount}
          notice={notice}
        />
      </div>
    );
  }
  return (
    <>
      <BookingSteps stage={reviewing ? "review" : "form"} />
      <form
        ref={formRef}
        action={action}
        onKeyDown={handleFieldKeyDown}
        onChange={() => {
          // 필수 다중선택 검증의 이전 오류를 값 수정 시 해제한다.
          formRef.current
            ?.querySelectorAll<HTMLInputElement>("input[type=checkbox]")
            .forEach((i) => i.setCustomValidity(""));
          recomputeEstimate();
        }}
        onSubmit={(event) => {
          if (!reviewing) {
            event.preventDefault();
            confirm();
          }
        }}
        className="booking-split"
      >
        {candidates.map((c, i) => (
          <div key={i} hidden>
            <input type="hidden" name="candidateDate" value={c.date} />
            <input type="hidden" name="candidateTime" value={c.time} />
          </div>
        ))}
        <input type="hidden" name="ref" ref={refInputRef} defaultValue="" />
        <section className="booking-card" hidden={reviewing}>
          <Link
            href={backHref}
            className="text-brand mb-5 inline-block text-sm"
          >
            ← 날짜·시간 다시 고르기
          </Link>
          <h1 className="text-2xl font-bold">신청 정보를 입력합니다</h1>
          <p className="text-muted mt-2 mb-6 text-sm">
            {productName} · 별표(*)는 필수 문항입니다.
          </p>
          <ReservationFields fields={fields} />
        </section>
        {reviewing ? (
          <section className="booking-card">
            <h1
              id="booking-review-heading"
              tabIndex={-1}
              className="text-2xl font-bold"
            >
              신청 내용을 확인합니다
            </h1>
            <p className="text-muted mt-2 text-sm">
              입력한 정보와 희망 시간을 확인한 후 신청해 주십시오.
            </p>
            <dl className="mt-5">
              {answers.map((a) => (
                <div key={a.id} className="booking-review-answer">
                  <dt>{a.label}</dt>
                  <dd>{a.value}</dd>
                </div>
              ))}
            </dl>
            <Button
              type="button"
              variant="ghost"
              className="mt-5"
              onClick={() => setReviewing(false)}
            >
              ← 신청 정보 수정하기
            </Button>
          </section>
        ) : null}
        <aside className="booking-card booking-summary" aria-label="예약 요약">
          <p className="text-brand text-xs font-bold">예약 요약</p>
          <h2>{productName}</h2>
          <p className="text-muted text-sm">촬영 {durationMin}분</p>
          <ul className="booking-summary-list">
            {candidates.map((c, i) => (
              <li key={i}>
                {i + 1}번째 · {c.date} {c.time}
              </li>
            ))}
          </ul>
          <Link href={backHref} className="text-brand text-sm underline">
            희망 시간 다시 선택하기
          </Link>
          <div className="booking-summary-total">
            <span>예상 금액</span>
            <strong>{estimatedTotal.toLocaleString()}원</strong>
          </div>
          {pricedItems.length > 0 ? (
            <ul className="text-muted mt-3 space-y-2 text-xs">
              <li className="flex justify-between gap-3">
                <span>기본 요금</span>
                <span>{basePrice.toLocaleString()}원</span>
              </li>
              {pricedItems.map((p, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{p.label}</span>
                  <span>+{p.price.toLocaleString()}원</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div role="alert" className="mt-4">
            <ErrorText>
              {state.status === "error" ? state.error : null}
            </ErrorText>
          </div>
          {reviewing ? (
            <Button
              key="submit-reservation"
              type="submit"
              disabled={pending}
              className={`${PRIMARY_CTA_CLASS} mt-4`}
            >
              {pending ? "접수 중…" : "예약 신청하기"}
            </Button>
          ) : (
            <Button
              key="confirm-reservation"
              type="button"
              onClick={(event) => {
                // 확인 버튼이 제출 버튼으로 바뀌는 클릭에서 바로 접수되지 않게 한다.
                event.preventDefault();
                confirm();
              }}
              className={`${PRIMARY_CTA_CLASS} mt-4`}
            >
              신청 내용 확인하기 →
            </Button>
          )}
          <p className="text-muted mt-4 text-xs leading-relaxed">
            신청 후 스튜디오에서 일정 확정 안내를 드립니다. 확정 안내 전에는
            입금하지 않습니다.
          </p>
        </aside>
      </form>
    </>
  );
}

/** 상품 문항 설정을 고객 신청서와 관리자 미리보기에서 똑같이 렌더링한다. */
export function ReservationFields({ fields }: { fields: CustomField[] }) {
  return (
    <div>
      {visibleBookingFields(fields).map((field) => (
        <div
          key={field.id}
          data-field-block
          data-field-id={field.id}
          className={FIELD_WRAPPER_CLASS}
        >
          <ReservationFieldInput field={field} />
        </div>
      ))}
    </div>
  );
}

/** 보기 여러 개를 하나의 label 안에 중첩하지 않고 접근 가능한 그룹으로 묶는다. */
function ChoiceField({
  label,
  required,
  hint,
  children,
  labelClassName,
  hintClassName,
}: React.ComponentProps<typeof Field>) {
  return (
    <fieldset className="min-w-0">
      <legend className={`${labelClassName} mb-1`}>
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </legend>
      {hint ? (
        <div className={`text-muted mb-2 ${hintClassName}`}>{hint}</div>
      ) : null}
      {children}
    </fieldset>
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
        hint={descriptionHint(field)}
        labelClassName={FIELD_LABEL_CLASS}
        hintClassName={FIELD_HINT_CLASS}
        hintPosition="before"
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
        hint={descriptionHint(field)}
        labelClassName={FIELD_LABEL_CLASS}
        hintClassName={FIELD_HINT_CLASS}
        hintPosition="before"
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
        hint={descriptionHint(
          field,
          "입력하시면 문자와 함께 이메일로도 안내해 드립니다.",
        )}
        labelClassName={FIELD_LABEL_CLASS}
        hintClassName={FIELD_HINT_CLASS}
        hintPosition="before"
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
      <ChoiceField
        label={field.label}
        required={field.required}
        hint={descriptionHint(field)}
        labelClassName={FIELD_LABEL_CLASS}
        hintClassName={FIELD_HINT_CLASS}
        hintPosition="before"
      >
        <div className="flex gap-4">
          <label className={OPTION_LABEL_CLASS}>
            <input
              type="radio"
              name={name}
              value="male"
              required={field.required}
              className={OPTION_INPUT_CLASS}
            />
            남성
          </label>
          <label className={OPTION_LABEL_CLASS}>
            <input
              type="radio"
              name={name}
              value="female"
              required={field.required}
              className={OPTION_INPUT_CLASS}
            />
            여성
          </label>
        </div>
      </ChoiceField>
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
        hint={descriptionHint(field)}
        labelClassName={FIELD_LABEL_CLASS}
        hintClassName={FIELD_HINT_CLASS}
        hintPosition="before"
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
      <ChoiceField
        label={field.label}
        required={field.required}
        hint={descriptionHint(field)}
        labelClassName={FIELD_LABEL_CLASS}
        hintClassName={FIELD_HINT_CLASS}
        hintPosition="before"
      >
        <div>
          {options.map((option, index) => {
            const price = field.option_prices?.[index];
            return (
              <label key={option} className={OPTION_LABEL_CLASS}>
                <input
                  type="radio"
                  name={name}
                  value={option}
                  required={field.required}
                  className={OPTION_INPUT_CLASS}
                />
                {option}
                {price ? (
                  <span className="text-brand text-sm font-medium">
                    (+{price.toLocaleString()}원)
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      </ChoiceField>
    );
  }

  if (field.type === "multi_choice") {
    return (
      <ChoiceField
        label={field.label}
        required={field.required}
        hint={descriptionHint(field)}
        labelClassName={FIELD_LABEL_CLASS}
        hintClassName={FIELD_HINT_CLASS}
        hintPosition="before"
      >
        <div>
          {options.map((option, index) => {
            const price = field.option_prices?.[index];
            return (
              <label key={option} className={OPTION_LABEL_CLASS}>
                <input
                  type="checkbox"
                  name={name}
                  value={option}
                  className={OPTION_INPUT_CLASS}
                />
                {option}
                {price ? (
                  <span className="text-brand text-sm font-medium">
                    (+{price.toLocaleString()}원)
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      </ChoiceField>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-start gap-2 text-base">
        <input
          type="checkbox"
          name={name}
          required={field.required}
          className="mt-0.5 h-5 w-5 shrink-0"
        />
        <span className="font-semibold">
          {field.label}
          {field.required ? (
            <span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
          ) : null}
          {field.description ? (
            <span className="text-muted mt-1 block text-sm font-normal">
              <FieldDescription html={field.description} />
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
      hint={descriptionHint(field)}
      labelClassName={FIELD_LABEL_CLASS}
      hintClassName={FIELD_HINT_CLASS}
      hintPosition="before"
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
      hint={descriptionHint(
        field,
        "8자리 숫자로 입력해 주십시오. 예: 19990101",
      )}
      labelClassName={FIELD_LABEL_CLASS}
      hintClassName={FIELD_HINT_CLASS}
      hintPosition="before"
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
