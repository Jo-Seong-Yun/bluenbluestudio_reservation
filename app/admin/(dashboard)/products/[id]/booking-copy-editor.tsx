"use client";
import { useActionState, useState } from "react";
import {
  COPY_SECTIONS,
  resolveCopy,
  fieldGroup,
  GROUP_COPY_KEYS,
  type BookingCopy,
} from "@/lib/booking/copy";
import { saveProductBookingCopy } from "@/app/admin/booking-copy-actions";
import { Button, Field, inputClass, ErrorText } from "@/components/ui";
import {
  BookingDetail,
  type BookingDetailProduct,
} from "@/components/booking-detail";
import "@/app/booking/booking.css";
import { ReservationFields } from "@/components/reservation-form";
import { ReservationSuccessCard } from "@/components/reservation-success-card";
import { BookingFlow } from "@/components/booking-flow";
import { kstToday, addDays } from "@/lib/time";
import type { CustomField } from "@/lib/booking/custom-fields-shared";
export function BookingCopyEditor({
  product,
  initial,
  fields = [],
}: {
  fields?: CustomField[];
  product: BookingDetailProduct & { id: string };
  initial: BookingCopy;
}) {
  const [copy, setCopy] = useState(() => resolveCopy(initial));
  const [state, action, pending] = useActionState(saveProductBookingCopy, null);
  const [preview, setPreview] = useState(0);
  const [previewGroup, setPreviewGroup] = useState(0);
  return (
    <section className="border-border mt-10 rounded-xl border bg-white p-6">
      <h2 className="text-xl font-bold">예약 페이지 문구</h2>
      <p className="text-muted mt-2 text-sm">
        상품별 문구를 편집합니다. 빈 칸은 기본 문구로 저장합니다. 문항
        제목·선택지·필수 여부는 위 신청서 문항에서 편집합니다.
      </p>
      <div className="mt-6 grid gap-8 xl:grid-cols-2">
        <form action={action}>
          <input type="hidden" name="productId" value={product.id} />
          {COPY_SECTIONS.map(([label, values]) => (
            <fieldset key={label} className="mb-7 space-y-3">
              <legend className="mb-3 font-bold">{label}</legend>
              {Object.entries(values).map(([key, defaultValue]) => (
                <Field key={key} label={defaultValue}>
                  <textarea
                    name={key}
                    maxLength={1000}
                    value={copy[key]}
                    onChange={(e) =>
                      setCopy({ ...copy, [key]: e.target.value })
                    }
                    className={inputClass}
                    rows={2}
                  />
                </Field>
              ))}
            </fieldset>
          ))}
          <fieldset className="mb-7 space-y-3">
            <legend className="mb-3 font-bold">문항 페이지 배치</legend>
            {fields.map((field) => (
              <div key={field.id}>
                <Field label={field.label}>
                  <select
                    name={`group:${field.id}`}
                    value={
                      copy[`group:${field.id}`] ?? String(fieldGroup(field))
                    }
                    onChange={(e) =>
                      setCopy({
                        ...copy,
                        [`group:${field.id}`]: e.target.value,
                      })
                    }
                    className={inputClass}
                  >
                    {["배우 정보", "연락 정보", "촬영 요청", "동의 확인"].map(
                      (label, i) => (
                        <option key={i} value={i}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
                {[
                  "name",
                  "phone",
                  "email",
                  "birth_date",
                  "short_text",
                  "long_text",
                ].includes(field.type) ? (
                  <Field label={`${field.label} 입력 예시`}>
                    <input
                      name={`placeholder:${field.id}`}
                      value={copy[`placeholder:${field.id}`] ?? ""}
                      onChange={(e) =>
                        setCopy({
                          ...copy,
                          [`placeholder:${field.id}`]: e.target.value,
                        })
                      }
                      maxLength={200}
                      placeholder="비우면 기본 입력 예시"
                      className={inputClass}
                    />
                  </Field>
                ) : null}
              </div>
            ))}
          </fieldset>
          <div className="sticky bottom-0 flex flex-wrap gap-3 bg-white py-4">
            <Button type="submit" disabled={pending}>
              {pending ? "저장 중…" : "예약 문구 저장"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setCopy({
                  ...resolveCopy(null),
                  ...Object.fromEntries(
                    Object.entries(copy).filter(([key]) =>
                      key.startsWith("group:"),
                    ),
                  ),
                })
              }
            >
              기본 문구 복원
            </Button>
          </div>
          <ErrorText>{state?.error}</ErrorText>
          {state?.success ? (
            <p role="status" className="text-sm text-green-700">
              예약 문구를 저장했습니다.
            </p>
          ) : null}
        </form>
        <div>
          <h3 className="mb-3 font-bold">모바일 미리보기</h3>
          <div className="mb-4 flex flex-wrap gap-2">
            {COPY_SECTIONS.map(([label], i) => (
              <Button
                key={label}
                type="button"
                variant="ghost"
                onClick={() => setPreview(i)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="booking-workspace booking-copy-preview max-h-[850px] max-w-[390px] overflow-auto rounded-xl border">
            {preview === 0 ? (
              <BookingDetail
                product={product}
                earliestBookable="예약 가능 시작일"
                latestBookable="예약 가능 종료일"
                copy={copy}
              />
            ) : preview === 1 ? (
              <div className="booking-page">
                <p className="booking-small-copy">
                  미리보기의 일정은 예시입니다.
                </p>
                <div className="pointer-events-none">
                  <BookingFlow
                    copy={copy}
                    productId={product.id}
                    productName={product.name}
                    basePrice={product.sale_price ?? product.price}
                    durationMin={product.duration_min}
                    month={kstToday().slice(0, 7)}
                    minMonth={kstToday().slice(0, 7)}
                    maxMonth={kstToday().slice(0, 7)}
                    availableDates={[addDays(kstToday(), 1)]}
                    basePath={`/booking/${product.slug}`}
                    loadSlots={async () => []}
                  />
                </div>
              </div>
            ) : preview === 2 ? (
              <div className="booking-page booking-modern-form">
                <div className="mb-4 flex flex-wrap gap-2">
                  {["배우 정보", "연락 정보", "촬영 요청", "동의 확인"].map(
                    (label, i) => (
                      <button
                        type="button"
                        className="text-xs"
                        key={label}
                        onClick={() => setPreviewGroup(i)}
                      >
                        {label}
                      </button>
                    ),
                  )}
                </div>
                <h1>{copy[GROUP_COPY_KEYS[previewGroup][0]]}</h1>
                <p className="booking-lead">
                  {copy[GROUP_COPY_KEYS[previewGroup][1]]}
                </p>
                <ReservationFields
                  fields={fields.filter(
                    (field) => fieldGroup(field, copy) === previewGroup,
                  )}
                  placeholders={copy}
                />
              </div>
            ) : preview === 3 ? (
              <div className="booking-page">
                <h1>{copy.reviewTitle}</h1>
                <p className="booking-lead">{copy.reviewIntro}</p>
                <div className="booking-unified-card">
                  <section className="booking-price-section">
                    <h2>{product.name}</h2>
                    <p className="booking-small-copy">
                      선택한 시간과 입력한 답변은 실제 확인 화면에 표시됩니다.
                    </p>
                    <p className="booking-large-price">
                      {(product.sale_price ?? product.price).toLocaleString()}
                      <small>원</small>
                    </p>
                  </section>
                </div>
              </div>
            ) : (
              <div className="booking-page">
                <ReservationSuccessCard
                  copy={copy}
                  successHeading={copy.successTitle}
                  successMessage={copy.successIntro}
                  code="DEMO2026"
                  productName={product.name}
                  candidates={[]}
                  bankAccount={null}
                  notice={null}
                  durationMin={product.duration_min}
                  estimatedTotal={product.sale_price ?? product.price}
                  interactive={false}
                  animate={false}
                />
              </div>
            )}
          </div>
          <p className="text-muted mt-3 text-xs">
            예시 미리보기입니다. 예약 상태·검증·필수 안내는 고정됩니다. 복원 후
            저장해야 반영됩니다.
          </p>
        </div>
      </div>
    </section>
  );
}
