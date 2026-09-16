"use client";

import { useActionState } from "react";
import { saveSettings, type SettingsActionState } from "@/app/admin/actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";
import { useReportPending } from "@/components/pending-overlay";

export type SettingsFormValues = {
  slotIntervalMin: number;
  minLeadDays: number;
  maxAdvanceDays: number;
  cancelDeadlineHours: number;
  bankAccount: string;
  studioIntro: string;
  notice: string;
  adminNotifyPhone: string;
  adminNotifyEmail: string;
  showProductThumbnails: boolean;
};

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const [state, action, pending] = useActionState<
    SettingsActionState,
    FormData
  >(saveSettings, null);
  useReportPending(pending);

  return (
    <form action={action} className="max-w-xl space-y-8">
      {/* 저장 버튼을 타이틀 옆에 두고, 이 줄만 스크롤해도 화면에 그대로
          남아 있게 한다 — 관리자 헤더(app/admin/(dashboard)/layout.tsx)
          바로 아래(top-16)에 붙여, 폼이 아무리 길어도 저장 버튼을 다시
          찾아 스크롤할 필요가 없다. */}
      <div className="bg-background border-border sticky top-16 z-10 -mx-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-b px-4 py-4 sm:-mx-[8.5%] sm:px-[8.5%]">
        <h1 className="text-2xl font-bold">예약 설정</h1>
        <div className="flex flex-wrap items-center gap-3">
          {/* text-2xl 타이틀의 줄 높이(32px)를 기준으로, 버튼 높이를
              그 90%(1.8rem=28.8px)로 맞추고 세로 중앙에 나란히 둔다 —
              기본 버튼(py-2 기준 36px)은 타이틀보다 더 커서 같이
              두면 비율이 안 맞았다. */}
          <Button
            type="submit"
            disabled={pending}
            className="!h-[1.8rem] !py-0"
          >
            {pending ? "저장 중…" : "저장"}
          </Button>
          {state?.success ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              저장했습니다.
            </p>
          ) : null}
          <ErrorText>{state?.error ?? null}</ErrorText>
        </div>
      </div>

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

      <section className="space-y-4">
        <h2 className="font-bold">손님에게 보여줄 문구</h2>

        <Field label="입금 계좌" hint="예약 완료 화면에 안내됩니다.">
          <input
            name="bankAccount"
            defaultValue={initial.bankAccount}
            placeholder="국민은행 000-0000-0000 (예금주)"
            className={inputClass}
          />
        </Field>

        <Field
          label="예약 공지"
          hint="예약 완료 화면에 계좌 안내와 함께 표시됩니다."
        >
          <textarea
            name="notice"
            rows={3}
            defaultValue={initial.notice}
            placeholder="예약 후 24시간 안에 입금이 확인되지 않으면 자동 취소됩니다."
            className={inputClass}
          />
        </Field>

        <Field label="스튜디오 소개" hint="랜딩 페이지에 마크다운으로 표시됩니다.">
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
        <h2 className="font-bold">알림 받을 연락처</h2>
        <p className="text-muted -mt-2 text-xs">
          새 예약 신청이 들어오면 즉시 알려 드립니다. 둘 다 비워두면 사장님
          알림은 보내지 않고, 손님에게만 접수·확정·취소·리마인드가 발송됩니다.
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
  );
}
