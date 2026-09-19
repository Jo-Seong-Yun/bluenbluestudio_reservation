"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createManualReservation,
  getProductCustomFields,
  type ManualReservationState,
} from "@/app/admin/actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";
import { useReportPending } from "@/components/pending-overlay";
import {
  fieldFormName,
  selectedLabelsFromAnswers,
  selectedPricedOptions,
  type CustomField,
} from "@/lib/booking/custom-fields-shared";

const initialState: ManualReservationState = { status: "idle" };

/**
 * 전화·DM으로 받은 예약을 관리자가 직접 넣는 버튼 + 다이얼로그.
 *
 * 시간은 슬롯 버튼이 아니라 직접 입력받는다 — 전화로 이미 몇 시인지
 * 정해진 상태로 여기 들어오는 것이라, 손님 화면처럼 빈 시간을 눈으로
 * 골라야 할 이유가 없다. 대신 서버에서 그 시간이 실제로 열려 있는지
 * 다시 계산해 확인하고, 아니면 에러로 알려준다.
 */
export function ManualReservationButton({
  products,
}: {
  products: { id: string; name: string; price: number; sale_price: number | null }[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [instance, setInstance] = useState(0);

  function open() {
    setInstance((n) => n + 1);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <>
      <Button type="button" variant="ghost" onClick={open}>
        수기 예약 등록
      </Button>

      <dialog
        ref={dialogRef}
        className="border-border bg-surface text-foreground w-[calc(100%-2rem)] max-w-md rounded-xl border p-5 backdrop:bg-black/50"
      >
        <ManualReservationDialogContent
          key={instance}
          products={products}
          onClose={close}
        />
      </dialog>
    </>
  );
}

function ManualReservationDialogContent({
  products,
  onClose,
}: {
  products: { id: string; name: string; price: number; sale_price: number | null }[];
  onClose: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    createManualReservation,
    initialState,
  );
  useReportPending(pending);

  const [selectedProductId, setSelectedProductId] = useState(
    products[0]?.id ?? "",
  );
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  // multi_choice 답변은 체크 상태를 state로 관리해야 price 계산이 가능하다.
  const [multiChoiceAnswers, setMultiChoiceAnswers] = useState<
    Record<string, string[]>
  >({});
  const [singleChoiceAnswers, setSingleChoiceAnswers] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!selectedProductId) {
      setCustomFields([]);
      return;
    }
    getProductCustomFields(selectedProductId).then((fields) => {
      setCustomFields(fields);
      setMultiChoiceAnswers({});
      setSingleChoiceAnswers({});
    });
  }, [selectedProductId]);

  function close() {
    formRef.current?.reset();
    onClose();
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const basePrice = selectedProduct
    ? (selectedProduct.sale_price ?? selectedProduct.price)
    : 0;

  // 현재 선택된 답변으로 예상금액 계산
  const allAnswers = [
    ...Object.entries(multiChoiceAnswers).map(([fieldId, vals]) => ({
      fieldId,
      value: JSON.stringify(vals),
    })),
    ...Object.entries(singleChoiceAnswers).map(([fieldId, val]) => ({
      fieldId,
      value: val,
    })),
  ];
  const selectedLabels = selectedLabelsFromAnswers(customFields, allAnswers);
  const pricedItems = selectedPricedOptions(customFields, selectedLabels);
  const estimatedTotal =
    basePrice + pricedItems.reduce((sum, item) => sum + item.price, 0);

  // custom_fields 중 name/phone은 이미 고정 필드로 입력받으니 뺀다.
  const visibleFields = customFields.filter(
    (f) => f.type !== "name" && f.type !== "phone",
  );

  if (state.status === "success") {
    return (
      <div>
        <p className="font-bold">등록되었습니다</p>
        <p className="text-muted mt-2 text-sm">
          예약번호 <span className="font-mono">{state.code}</span>
        </p>
        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={close}>
            닫기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <p className="font-bold">수기 예약 등록</p>

      <Field label="상품">
        <select
          name="productId"
          required
          className={inputClass}
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
        >
          <option value="">선택해 주십시오</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="날짜">
            <input type="date" name="date" required className={inputClass} />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="시간">
            <input type="time" name="time" required className={inputClass} />
          </Field>
        </div>
      </div>

      <Field label="이름">
        <input
          name="customerName"
          required
          maxLength={50}
          className={inputClass}
        />
      </Field>

      <Field label="연락처" hint="숫자만, 010으로 시작">
        <input
          name="customerPhone"
          type="tel"
          inputMode="numeric"
          placeholder="01012345678"
          required
          className={inputClass}
        />
      </Field>

      <Field label="인원 (선택)">
        <input
          name="peopleCount"
          type="number"
          min={1}
          className={inputClass}
        />
      </Field>

      <Field label="메모 (선택)">
        <textarea name="memo" rows={2} className={inputClass} />
      </Field>

      {visibleFields.length > 0 && (
        <div className="border-border space-y-3 rounded-lg border p-3">
          <p className="text-muted text-xs font-medium">추가 문항</p>
          {visibleFields.map((field) => (
            <CustomFieldInput
              key={field.id}
              field={field}
              multiChoiceValue={multiChoiceAnswers[field.id] ?? []}
              singleChoiceValue={singleChoiceAnswers[field.id] ?? ""}
              onMultiChange={(vals) =>
                setMultiChoiceAnswers((prev) => ({ ...prev, [field.id]: vals }))
              }
              onSingleChange={(val) =>
                setSingleChoiceAnswers((prev) => ({ ...prev, [field.id]: val }))
              }
            />
          ))}
        </div>
      )}

      {selectedProduct && (
        <div className="border-border rounded-lg border p-3 text-sm">
          <p className="text-muted mb-1 text-xs">예상금액</p>
          <p className="font-medium">기본촬영 ₩{basePrice.toLocaleString()}</p>
          {pricedItems.map((item, i) => (
            <p key={i} className="text-muted">
              + {item.label} ₩{item.price.toLocaleString()}
            </p>
          ))}
          <p className="mt-1 font-bold">합계 ₩{estimatedTotal.toLocaleString()}</p>
        </div>
      )}

      <ErrorText>{state.status === "error" ? state.error : null}</ErrorText>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={close}>
          취소
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "등록 중…" : "등록"}
        </Button>
      </div>
    </form>
  );
}

function CustomFieldInput({
  field,
  multiChoiceValue,
  singleChoiceValue,
  onMultiChange,
  onSingleChange,
}: {
  field: CustomField;
  multiChoiceValue: string[];
  singleChoiceValue: string;
  onMultiChange: (vals: string[]) => void;
  onSingleChange: (val: string) => void;
}) {
  const fname = fieldFormName(field.id);
  const label = (
    <span className="text-xs font-medium">
      {field.label}
      {field.required && <span className="ml-0.5 text-red-500">*</span>}
    </span>
  );

  if (field.type === "multi_choice") {
    return (
      <div>
        {label}
        <div className="mt-1 space-y-1">
          {(field.options ?? []).map((opt, i) => {
            const price = field.option_prices?.[i] ?? 0;
            const checked = multiChoiceValue.includes(opt);
            return (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={fname}
                  value={opt}
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onMultiChange([...multiChoiceValue, opt]);
                    } else {
                      onMultiChange(multiChoiceValue.filter((v) => v !== opt));
                    }
                  }}
                />
                {opt}
                {price > 0 && (
                  <span className="text-muted text-xs">
                    +₩{price.toLocaleString()}
                  </span>
                )}
              </label>
            );
          })}
          {/* 서버 액션이 formData.getAll(fname)으로 읽으므로 체크된 값들이
              실제 FormData에 포함되도록 hidden input을 쓴다. controlled
              checkbox도 name이 있으면 자동으로 FormData에 들어가지만,
              체크 해제시에는 포함되지 않으므로 state 관리로 충분하다. */}
        </div>
      </div>
    );
  }

  if (field.type === "single_choice") {
    return (
      <div>
        {label}
        <div className="mt-1 space-y-1">
          {(field.options ?? []).map((opt, i) => {
            const price = field.option_prices?.[i] ?? 0;
            return (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={fname}
                  value={opt}
                  checked={singleChoiceValue === opt}
                  onChange={() => onSingleChange(opt)}
                />
                {opt}
                {price > 0 && (
                  <span className="text-muted text-xs">
                    +₩{price.toLocaleString()}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "gender") {
    return (
      <div>
        {label}
        <select name={fname} className={`${inputClass} mt-1`}>
          <option value="">선택</option>
          <option value="male">남</option>
          <option value="female">여</option>
        </select>
      </div>
    );
  }

  if (field.type === "birth_date") {
    return (
      <div>
        {label}
        <input
          type="text"
          name={fname}
          placeholder="YYYYMMDD"
          maxLength={8}
          className={`${inputClass} mt-1`}
        />
      </div>
    );
  }

  if (field.type === "email") {
    return (
      <div>
        {label}
        <input type="email" name={fname} className={`${inputClass} mt-1`} />
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name={fname} />
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </label>
    );
  }

  if (field.type === "long_text") {
    return (
      <div>
        {label}
        <textarea name={fname} rows={2} className={`${inputClass} mt-1`} />
      </div>
    );
  }

  // short_text and any other types
  return (
    <div>
      {label}
      <input type="text" name={fname} className={`${inputClass} mt-1`} />
    </div>
  );
}
