"use client";

import { useActionState } from "react";
import { saveSettings, type SettingsActionState } from "@/app/admin/actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";

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
};

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const [state, action, pending] = useActionState<
    SettingsActionState,
    FormData
  >(saveSettings, null);

  return (
    <form action={action} className="max-w-xl space-y-8">
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

        <Field label="입금 계좌" hint="예약 완료 화면에 안내돼요.">
          <input
            name="bankAccount"
            defaultValue={initial.bankAccount}
            placeholder="국민은행 000-0000-0000 (예금주)"
            className={inputClass}
          />
        </Field>

        <Field
          label="예약 공지"
          hint="예약 완료 화면에 계좌 안내와 함께 보여요."
        >
          <textarea
            name="notice"
            rows={3}
            defaultValue={initial.notice}
            placeholder="예약 후 24시간 안에 입금이 확인되지 않으면 자동 취소돼요."
            className={inputClass}
          />
        </Field>

        <Field label="스튜디오 소개" hint="랜딩 페이지에 마크다운으로 보여요.">
          <textarea
            name="studioIntro"
            rows={5}
            defaultValue={initial.studioIntro}
            className={inputClass}
          />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="font-bold">알림 받을 연락처</h2>
        <p className="text-muted -mt-2 text-xs">
          새 예약 신청이 들어오면 즉시 알려드려요. 둘 다 비워두면 사장님 알림은
          보내지 않고, 손님에게만 접수·확정·취소·리마인드가 나가요.
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

      <ErrorText>{state?.error ?? null}</ErrorText>
      {state?.success ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          저장했어요.
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "저장 중…" : "저장"}
      </Button>
    </form>
  );
}
