"use client";

import { useActionState, useState } from "react";
import { Wallet, SlidersHorizontal, ChevronDown } from "lucide-react";
import { MoneyInput } from "@/components/money-input";
import { Button, inputClass } from "@/components/ui";
import { useReportPending } from "@/components/pending-overlay";
import {
  expectedBankBalance,
  type BankBalanceData,
  type BankReference,
} from "@/lib/revenue/bank-balance";
import {
  saveBankBalanceReference,
  type BankBalanceActionState,
} from "./bank-actions";
import { BankForecastPanel } from "./bank-forecast-panel";
import { RevenueRetryButton } from "./period-controls";

const won = (value: number) => `${value.toLocaleString()}원`;
const signedWon = (value: number) => `${value > 0 ? "+" : ""}${won(value)}`;

function BalanceSettingsForm({
  mode,
  reference,
  action = saveBankBalanceReference,
}: {
  mode: "reference" | "adjustment";
  reference: BankReference | null;
  action?: typeof saveBankBalanceReference;
}) {
  const [state, formAction, pending] = useActionState<
    BankBalanceActionState,
    FormData
  >(action, null);
  useReportPending(pending);
  const settingReference = mode === "reference";
  return (
    <form
      action={formAction}
      className="min-w-0"
      aria-label={
        settingReference ? "통장 기준 잔액 설정" : "미등록 입출금 보정"
      }
    >
      <input type="hidden" name="mode" value={mode} />
      <h3 className="text-sm font-bold">
        {settingReference ? "기준 잔액 설정" : "미등록 입출금 보정"}
      </h3>
      <p className="text-muted mt-1 text-xs leading-relaxed">
        {settingReference
          ? "지금 통장에 있는 실제 잔액을 입력하세요. 현재 장부를 새 기준으로 잡고 이전 보정은 초기화합니다."
          : "기준 설정 후 장부에 없는 이체·출금·환불의 합계를 입력하세요. 별도 입금은 더하기, 별도 출금은 빼기를 선택하세요."}
      </p>
      {!settingReference ? (
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium">보정 방향</span>
          <select
            name="direction"
            key={`direction-${reference?.adjustment}`}
            defaultValue={(reference?.adjustment ?? 0) < 0 ? "out" : "in"}
            className={inputClass}
          >
            <option value="in">더하기 · 별도 입금</option>
            <option value="out">빼기 · 별도 출금</option>
          </select>
        </label>
      ) : null}
      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium">
          {settingReference
            ? "현재 실제 통장 잔액 (원)"
            : "누적 보정 금액 (원)"}
        </span>
        {settingReference ? (
          <input
            name="amount"
            type="text"
            inputMode="decimal"
            required
            autoComplete="off"
            maxLength={20}
            placeholder="예: 1,500,000"
            className={inputClass}
          />
        ) : (
          <MoneyInput
            key={`amount-${reference?.adjustment}`}
            name="amount"
            required
            defaultValue={Math.abs(reference?.adjustment ?? 0)}
          />
        )}
      </label>
      {!settingReference ? (
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium">
            보정 메모 (선택)
          </span>
          <input
            key={`memo-${reference?.memo}`}
            name="memo"
            maxLength={200}
            defaultValue={reference?.memo ?? ""}
            placeholder="예: 개인 통장으로 50,000원 이체"
            className={inputClass}
          />
        </label>
      ) : null}
      <p
        role={state?.error ? "alert" : "status"}
        className={`mt-2 text-xs ${state?.error ? "text-red-600 dark:text-red-400" : "text-brand"}`}
      >
        {state?.error ?? (state?.reference ? "저장했습니다." : "")}
      </p>
      <Button
        type="submit"
        disabled={pending || (!settingReference && !reference)}
        className="mt-3 min-h-11"
      >
        {pending
          ? "저장 중…"
          : settingReference
            ? "현재 잔액을 기준으로 저장"
            : "보정 저장"}
      </Button>
    </form>
  );
}

export function BankBalanceCard({
  data,
  saveAction,
}: {
  data?: BankBalanceData;
  saveAction?: typeof saveBankBalanceReference;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  if (!data)
    return (
      <section
        aria-label="오늘 예상 통장 잔액"
        className="border-border bg-surface mb-6 rounded-xl border p-5"
      >
        <h2 className="font-bold">
          <button
            type="button"
            className="flex min-h-11 w-full items-center gap-2 text-left"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls="bank-balance-error"
          >
            통장 잔액 <ChevronDown size={18} aria-hidden />
            <span className="sr-only">{expanded ? "접기" : "펼치기"}</span>
          </button>
        </h2>
        <div id="bank-balance-error" hidden={!expanded}>
          <p className="text-muted mt-2 text-sm">
            장부 또는 잔액 설정을 불러오지 못해 금액을 표시할 수 없습니다.
          </p>
          <RevenueRetryButton />
        </div>
      </section>
    );
  const { book, reference } = data;
  const balance = reference ? expectedBankBalance(book, reference) : null;
  const change = reference ? book.net - reference.bookNet : 0;
  return (
    <section
      aria-labelledby="bank-balance-heading"
      className="border-border bg-surface border-t-brand mb-6 overflow-hidden rounded-xl border border-t-[3px]"
      data-bank-date={book.today}
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="bank-balance-heading"
            className="min-w-fit flex-1 text-base font-bold"
          >
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-controls="bank-balance-content"
              className="focus-visible:outline-brand flex min-h-11 w-full items-center gap-2 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Wallet size={18} className="text-brand shrink-0" aria-hidden />
              <span className="whitespace-nowrap">통장 잔액</span>
              <ChevronDown
                size={18}
                aria-hidden
                className={`text-muted shrink-0 ${expanded ? "rotate-180" : ""}`}
              />
              <span className="sr-only">{expanded ? "접기" : "펼치기"}</span>
            </button>
          </h2>
          <span className="bg-surface-subtle text-muted rounded-full px-3 py-1 text-xs">
            {book.today} · 오늘 기준
          </span>
        </div>
      </div>
      <div id="bank-balance-content" hidden={!expanded}>
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-muted mb-2 text-xs font-medium">
                오늘 예상 잔액
              </p>
              <p
                data-bank-amount
                aria-live="polite"
                className={`text-2xl font-bold break-words tabular-nums sm:text-4xl ${balance !== null && balance < 0 ? "text-red-600 dark:text-red-400" : "text-brand"}`}
              >
                {balance === null ? "기준 잔액을 설정해 주세요" : won(balance)}
              </p>
              <p className="text-muted mt-2 text-xs leading-relaxed">
                {reference
                  ? `${reference.date}에 설정한 실제 잔액 + 이후 장부 변동 + 미등록 입출금 보정`
                  : "현재 통장 잔액을 한 번 입력하면 이후 등록 내역의 변동을 반영합니다."}
              </p>
            </div>
            {reference ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSettingsOpen(!settingsOpen)}
                aria-expanded={settingsOpen}
                aria-controls="bank-settings"
                className="min-h-11 shrink-0 self-start sm:self-auto"
              >
                <SlidersHorizontal size={15} aria-hidden />
                {settingsOpen ? "설정 닫기" : "잔액 설정·보정"}
              </Button>
            ) : null}
          </div>
          {reference ? (
            <dl className="border-border mt-5 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-3">
              {[
                { label: "기준 잔액", amount: reference.balance },
                { label: "기준 설정 후 장부 변동", amount: change },
                { label: "미등록 입출금 보정", amount: reference.adjustment },
              ].map(({ label, amount }, i) => (
                <div key={label} className="min-w-0">
                  <dt className="text-muted text-xs">{label}</dt>
                  <dd className="mt-1 font-semibold break-words tabular-nums">
                    {i === 0 ? won(amount) : signedWon(amount)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          {reference?.memo ? (
            <p className="text-muted mt-3 text-xs break-words">
              보정 메모: {reference.memo}
            </p>
          ) : null}
        </div>
        {settingsOpen || !reference ? (
          <div
            id="bank-settings"
            className="border-border bg-surface-subtle border-t p-5 sm:p-6"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <BalanceSettingsForm
                mode="reference"
                reference={reference}
                action={saveAction}
              />
              {reference ? (
                <BalanceSettingsForm
                  mode="adjustment"
                  reference={reference}
                  action={saveAction}
                />
              ) : null}
            </div>
            <p className="text-muted mt-4 text-xs">
              설정은 로그인한 관리자 계정에 저장됩니다. 월·연 매출의 선택 기간과
              관계없이 오늘 기준으로 계산합니다.
            </p>
          </div>
        ) : null}
        <BankForecastPanel forecast={data.forecast} currentBalance={balance} />
        <details className="border-border border-t px-5 py-4 sm:px-6">
          <summary className="text-muted cursor-pointer text-xs font-medium">
            오늘 잔액 계산 기준과 확인할 항목
            {book.missingAmounts +
              book.undatedExpenses +
              book.cancelledPayments +
              book.futureCosts >
            0 ? (
              <span className="ml-2 inline-block font-semibold text-amber-800 dark:text-amber-200">
                확인{" "}
                {book.missingAmounts +
                  book.undatedExpenses +
                  book.cancelledPayments +
                  book.futureCosts}
                건
              </span>
            ) : null}
          </summary>
          <div className="mt-3 text-xs leading-relaxed">
            <dl className="grid gap-2 sm:grid-cols-3">
              {[
                { label: "입금 확인된 누적 금액", amount: book.receipts },
                {
                  label: "오늘까지 촬영한 예약의 등록 원가",
                  amount: book.shootingCosts,
                },
                {
                  label: "오늘까지 날짜가 있는 등록 지출",
                  amount: book.expenses,
                },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="text-muted">{item.label}</dt>
                  <dd className="mt-1 font-semibold tabular-nums">
                    {won(item.amount)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-muted mt-3">
              입금확인·촬영완료·노쇼의 실제 지불액을 포함하며, 앞으로 촬영할
              예약도 이미 입금 확인되었다면 포함합니다. 미래 날짜 지출은
              제외합니다. 촬영 원가의 지급일은 저장돼 있지 않아 촬영일을
              기준으로 차감합니다.
            </p>
            <p className="text-muted mt-2">
              은행 거래내역과 자동 연동되지는 않습니다. 선지급 원가, 별도 이체,
              취소 후 미환불 등 장부와 다른 입출금은 보정해 주세요. 과거 기록을
              수정·삭제하면 예상 잔액도 바뀝니다.
            </p>
            {book.missingAmounts +
              book.undatedExpenses +
              book.cancelledPayments +
              book.futureCosts >
            0 ? (
              <ul className="mt-3 space-y-1 text-amber-800 dark:text-amber-200">
                {book.missingAmounts > 0 ? (
                  <li>
                    실제 지불액 미입력 {book.missingAmounts}건: 입금액을 입력해
                    주세요.
                  </li>
                ) : null}
                {book.undatedExpenses > 0 ? (
                  <li>
                    지출일 미입력 {book.undatedExpenses}건: 차감에서
                    제외했습니다. 날짜를 입력해 주세요.
                  </li>
                ) : null}
                {book.cancelledPayments > 0 ? (
                  <li>
                    지불액이 남아 있는 취소 예약 {book.cancelledPayments}건:
                    입금 합계에서 제외했습니다. 실제 환불 여부를 확인해 주세요.
                  </li>
                ) : null}
                {book.futureCosts > 0 ? (
                  <li>
                    미래 촬영 또는 촬영일 없는 원가 {book.futureCosts}건: 아직
                    차감하지 않았습니다. 이미 지급했다면 보정해 주세요.
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>
        </details>
      </div>
    </section>
  );
}
