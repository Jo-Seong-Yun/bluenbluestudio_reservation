"use client";

import { useActionState, useState } from "react";
import { saveSettings, type SettingsActionState } from "@/app/admin/actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";
import { useReportPending } from "@/components/pending-overlay";
import { ReservationSuccessPreview } from "./reservation-success-preview";
import { BookingStylePreview } from "./booking-style-preview";
import {
  CARD_RADIUS_OPTIONS,
  CARD_SIZE_OPTIONS,
  TEXT_SIZE_OPTIONS,
  type BookingStyle,
} from "@/lib/booking-style";

export type SettingsFormValues = {
  slotIntervalMin: number;
  minLeadDays: number;
  maxAdvanceDays: number;
  cancelDeadlineHours: number;
  bankAccount: string;
  studioIntro: string;
  notice: string;
  reservationSuccessHeading: string;
  reservationSuccessMessage: string;
  adminNotifyPhone: string;
  adminNotifyEmail: string;
  showProductThumbnails: boolean;
  bookingStyle: BookingStyle;
};

const FORM_ID = "settings-form";

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const [state, action, pending] = useActionState<
    SettingsActionState,
    FormData
  >(saveSettings, null);
  useReportPending(pending);

  // "예약 완료 화면 문구" 섹션의 네 칸만 컨트롤드로 둔다(나머지는 여전히
  // defaultValue로만 충분하다) — 오른쪽 미리보기가 타이핑하는 대로 바로
  // 반영되려면 이 값들을 상태로 들고 있어야 한다. name은 그대로 둬서
  // 폼 제출(action)은 지금까지와 똑같이 동작한다.
  const [reservationSuccessHeading, setReservationSuccessHeading] = useState(
    initial.reservationSuccessHeading,
  );
  const [reservationSuccessMessage, setReservationSuccessMessage] = useState(
    initial.reservationSuccessMessage,
  );
  const [bankAccount, setBankAccount] = useState(initial.bankAccount);
  const [notice, setNotice] = useState(initial.notice);
  const [bookingStyle, setBookingStyle] = useState(initial.bookingStyle);

  function patchBookingStyle(patch: Partial<BookingStyle>) {
    setBookingStyle((prev) => ({ ...prev, ...patch }));
  }

  return (
    <>
      {/* 저장 버튼을 타이틀 옆에 두고, 이 줄만 스크롤해도 화면에 그대로
          남아 있게 한다 — 관리자 헤더(app/admin/(dashboard)/layout.tsx)
          바로 아래(top-16)에 붙여, 페이지가 아무리 길어도 저장 버튼을
          다시 찾아 스크롤할 필요가 없다.
          <form> 안에 넣지 않고 밖으로 뺀 이유: sticky는 자신을 담은
          가장 가까운 블록(여기서는 원래 <form>)의 높이를 벗어나면 더는
          안 붙는다 — 그 안에 있을 때는 이메일 문구 설정 같은 아래쪽
          섹션(페이지에서 <form>과 형제인 요소들)으로 스크롤하면 폼이
          거기서 끝나버려 타이틀 줄이 사라졌다. 폼 바깥, 페이지 전체를
          감싸는 부모 밑에 두면 페이지 끝까지 계속 붙어 있는다. 대신
          저장 버튼은 DOM상 폼 밖에 있어도 form={FORM_ID}로 그 폼을
          그대로 제출한다(상품 수정 화면의 "손님에게 공개" 토글과 같은
          방식). */}
      <div className="bg-background border-border sticky top-16 z-10 -mx-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-b px-4 py-4 sm:-mx-[8.5%] sm:px-[8.5%]">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">예약 설정</h1>
          {/* text-2xl의 줄 높이는 Tailwind가 2rem(32px)으로 고정해
              두므로(폰트 자체 메트릭과 무관), 버튼 높이를 그 90%인
              1.8rem(28.8px)으로 맞추고 flex items-center로 나란히
              세로 중앙에 둔다. 기본 버튼(py-2 기준 36px)은 타이틀보다
              더 커서 같이 두면 비율이 안 맞았다. */}
          <Button
            type="submit"
            form={FORM_ID}
            disabled={pending}
            className="!h-[1.8rem] shrink-0 self-center !py-0"
          >
            {pending ? "저장 중…" : "저장"}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {state?.success ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              저장했습니다.
            </p>
          ) : null}
          <ErrorText>{state?.error ?? null}</ErrorText>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <form id={FORM_ID} action={action} className="max-w-xl space-y-8">
          <section className="space-y-4">
            <h2 className="font-bold">예약 규칙</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="슬롯 간격 (분)"
                hint="시간 선택 화면에 몇 분 단위로 보여줄지."
              >
                <input
                  name="slotIntervalMin"
                  type="number"
                  min={5}
                  step={5}
                  defaultValue={initial.slotIntervalMin}
                  required
                  className={inputClass}
                />
              </Field>

              <Field
                label="최소 며칠 전 예약"
                hint="1이면 당일 예약 불가, 내일부터 가능."
              >
                <input
                  name="minLeadDays"
                  type="number"
                  min={0}
                  defaultValue={initial.minLeadDays}
                  required
                  className={inputClass}
                />
              </Field>

              <Field
                label="몇 일 뒤까지 열어둘지"
                hint="예: 60이면 두 달 뒤까지 예약 가능."
              >
                <input
                  name="maxAdvanceDays"
                  type="number"
                  min={1}
                  defaultValue={initial.maxAdvanceDays}
                  required
                  className={inputClass}
                />
              </Field>

              <Field
                label="손님 자가 취소 기한 (시간)"
                hint="촬영 시작 이 시간 전까지만 손님이 직접 취소 가능."
              >
                <input
                  name="cancelDeadlineHours"
                  type="number"
                  min={0}
                  defaultValue={initial.cancelDeadlineHours}
                  required
                  className={inputClass}
                />
              </Field>
            </div>
          </section>

          {/* 예약 신청 완료 화면(손님이 신청서를 제출한 직후 보는 화면)에
            들어가는 문구를 한 섹션에 모아둔다 — 위 두 개(제목·설명)는
            코드에 고정돼 있던 문구였고, 나머지(계좌·공지)는 원래도
            수정 가능했지만 다른 섹션에 흩어져 있었다. */}
          <section className="space-y-4">
            <h2 className="font-bold">예약 완료 화면 문구</h2>
            <p className="text-muted -mt-2 text-xs">
              손님이 예약 신청을 제출하면 바로 이어서 보이는 화면입니다.
            </p>

            <Field label="완료 제목">
              <input
                name="reservationSuccessHeading"
                required
                value={reservationSuccessHeading}
                onChange={(e) => setReservationSuccessHeading(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="완료 설명">
              <textarea
                name="reservationSuccessMessage"
                rows={3}
                required
                value={reservationSuccessMessage}
                onChange={(e) => setReservationSuccessMessage(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="입금 계좌">
              <input
                name="bankAccount"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="국민은행 000-0000-0000 (예금주)"
                className={inputClass}
              />
            </Field>

            <Field label="예약 공지" hint="계좌 안내 아래에 함께 표시됩니다.">
              <textarea
                name="notice"
                rows={3}
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
                placeholder="예약 확정 후 24시간 안에 입금이 확인되지 않으면 자동 취소됩니다."
                className={inputClass}
              />
            </Field>
          </section>

          <section className="space-y-4">
            <h2 className="font-bold">홈 화면 문구</h2>

            <Field
              label="스튜디오 소개"
              hint="랜딩 페이지에 마크다운으로 표시됩니다."
            >
              <textarea
                name="studioIntro"
                rows={5}
                defaultValue={initial.studioIntro}
                className={inputClass}
              />
            </Field>
          </section>

          <section className="space-y-4">
            <h2 className="font-bold">상품 목록 화면</h2>

            <label className="inline-flex cursor-pointer items-center gap-2">
              <span className="relative inline-block h-6 w-11 shrink-0">
                <input
                  type="checkbox"
                  name="showProductThumbnails"
                  defaultChecked={initial.showProductThumbnails}
                  className="peer sr-only"
                />
                <span className="bg-surface-subtle border-border peer-checked:bg-brand peer-checked:border-brand absolute inset-0 rounded-full border transition-colors" />
                <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
              </span>
              <span className="text-sm font-medium">썸네일 표시</span>
            </label>
            <p className="text-muted -mt-3 text-xs">
              예약하기(/booking) 상품 목록에서 각 상품 옆에 대표 이미지 썸네일을
              보여줄지 정합니다. 꺼두면 이미지 없이 상품명·설명·가격만 보입니다.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-bold">예약 페이지 디자인</h2>
            <p className="text-muted -mt-2 text-xs">
              예약하기(/booking) 화면의 색상·글자 크기·카드 모양을 정합니다.
              오른쪽 미리보기에 바로 반영됩니다.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="강조색" hint="예약하기 링크·예약 조회 버튼.">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="accentColor"
                    value={bookingStyle.accentColor}
                    onChange={(e) => patchBookingStyle({ accentColor: e.target.value })}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded border p-0.5"
                  />
                  <input
                    type="text"
                    value={bookingStyle.accentColor}
                    onChange={(e) => patchBookingStyle({ accentColor: e.target.value })}
                    className={`${inputClass} font-mono uppercase`}
                  />
                </div>
              </Field>

              <Field label="세일 배지 색" hint="할인율 배지.">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="saleColor"
                    value={bookingStyle.saleColor}
                    onChange={(e) => patchBookingStyle({ saleColor: e.target.value })}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded border p-0.5"
                  />
                  <input
                    type="text"
                    value={bookingStyle.saleColor}
                    onChange={(e) => patchBookingStyle({ saleColor: e.target.value })}
                    className={`${inputClass} font-mono uppercase`}
                  />
                </div>
              </Field>

              <Field label="텍스트 색" hint="상품명·가격.">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="textColor"
                    value={bookingStyle.textColor}
                    onChange={(e) => patchBookingStyle({ textColor: e.target.value })}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded border p-0.5"
                  />
                  <input
                    type="text"
                    value={bookingStyle.textColor}
                    onChange={(e) => patchBookingStyle({ textColor: e.target.value })}
                    className={`${inputClass} font-mono uppercase`}
                  />
                </div>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <span className="mb-1.5 block text-sm font-medium">텍스트 크기</span>
                <input type="hidden" name="textSize" value={bookingStyle.textSize} />
                <div className="flex flex-wrap gap-1.5">
                  {TEXT_SIZE_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={bookingStyle.textSize === opt.value ? "primary" : "ghost"}
                      aria-pressed={bookingStyle.textSize === opt.value}
                      className="text-xs"
                      onClick={() => patchBookingStyle({ textSize: opt.value })}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium">박스 모서리</span>
                <input type="hidden" name="cardRadius" value={bookingStyle.cardRadius} />
                <div className="flex flex-wrap gap-1.5">
                  {CARD_RADIUS_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={bookingStyle.cardRadius === opt.value ? "primary" : "ghost"}
                      aria-pressed={bookingStyle.cardRadius === opt.value}
                      className="text-xs"
                      onClick={() => patchBookingStyle({ cardRadius: opt.value })}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium">박스 크기</span>
                <input type="hidden" name="cardSize" value={bookingStyle.cardSize} />
                <div className="flex flex-wrap gap-1.5">
                  {CARD_SIZE_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={bookingStyle.cardSize === opt.value ? "primary" : "ghost"}
                      aria-pressed={bookingStyle.cardSize === opt.value}
                      className="text-xs"
                      onClick={() => patchBookingStyle({ cardSize: opt.value })}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-bold">알림 받을 연락처</h2>
            <p className="text-muted -mt-2 text-xs">
              새 예약 신청이 들어오면 즉시 알려 드립니다. 둘 다 비워두면 사장님
              알림은 보내지 않고, 손님에게만 접수·확정·취소·리마인드가
              발송됩니다.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="전화번호 (SMS)" hint="숫자만, 010으로 시작.">
                <input
                  name="adminNotifyPhone"
                  defaultValue={initial.adminNotifyPhone}
                  placeholder="01012345678"
                  className={inputClass}
                />
              </Field>

              <Field label="이메일">
                <input
                  name="adminNotifyEmail"
                  type="email"
                  defaultValue={initial.adminNotifyEmail}
                  placeholder="owner@example.com"
                  className={inputClass}
                />
              </Field>
            </div>
          </section>
        </form>

        {/* 위쪽 sticky 타이틀 줄(top-16)만큼 더 내려서 겹치지 않게 한다.
          lg 미만에서는 폼 아래로 자연스럽게 떨어져 쌓인다(sticky는
          lg부터만 건다 — 좁은 화면에서 계속 붙어 있으면 오히려
          입력칸을 가린다). */}
        <aside className="lg:sticky lg:top-36 space-y-8">
          <ReservationSuccessPreview
            successHeading={reservationSuccessHeading}
            successMessage={reservationSuccessMessage}
            bankAccount={bankAccount}
            notice={notice}
          />
          <BookingStylePreview style={bookingStyle} />
        </aside>
      </div>
    </>
  );
}
