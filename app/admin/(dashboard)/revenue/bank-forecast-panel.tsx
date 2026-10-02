"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { addDays } from "@/lib/time";
import { Button, inputClass } from "@/components/ui";
import {
  summarizeBankForecastAt,
  type BankForecastData,
} from "@/lib/revenue/bank-forecast";

const won = (n: number) => `${(n === 0 ? 0 : n).toLocaleString()}원`;
const signed = (n: number) => `${n > 0 ? "+" : ""}${won(n)}`;

export function BankForecastPanel({
  forecast,
  currentBalance,
}: {
  forecast?: BankForecastData;
  currentBalance: number | null;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  if (!forecast)
    return (
      <section
        aria-label="날짜별 예상 잔액"
        className="border-border border-t p-5 sm:p-6"
      >
        <h3 className="font-bold">날짜별 예상 잔액</h3>
        <p className="text-muted mt-2 text-sm">
          예정 내역을 불러오지 못해 전망을 표시할 수 없습니다.
        </p>
      </section>
    );
  const date = selectedDate ?? addDays(forecast.today, 7);
  // 입력란을 비운 경우에는 이전 결과나 임의 날짜로 계산하지 않습니다.
  const summary = summarizeBankForecastAt(forecast, date);
  const balance =
    currentBalance !== null && summary ? currentBalance + summary.change : null;
  return (
    <section
      aria-labelledby="bank-forecast-heading"
      className="border-border bg-surface-subtle border-t p-5 sm:p-6"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h3
            id="bank-forecast-heading"
            className="flex items-center gap-2 text-base font-bold"
          >
            <CalendarDays size={17} aria-hidden />
            날짜별 예상 잔액
          </h3>
          <p className="text-muted mt-1 text-xs">
            오늘 잔액을 기준으로 오늘부터 선택일 마감까지의 예정 입출금을
            반영합니다.
          </p>
        </div>
        <label className="block sm:w-44">
          <span className="mb-1 block text-xs font-medium">
            예상 잔액 기준일
          </span>
          <input
            type="date"
            aria-label="예상 잔액 기준일"
            min={forecast.today}
            max="9999-12-31"
            value={date}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={`${inputClass} min-h-11 min-w-0`}
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { label: "오늘 마감", date: forecast.today },
          { label: "7일 후", date: addDays(forecast.today, 7) },
          { label: "30일 후", date: addDays(forecast.today, 30) },
        ].map((item) => (
          <Button
            type="button"
            key={item.label}
            variant="ghost"
            className="min-h-11"
            aria-pressed={date === item.date}
            onClick={() => setSelectedDate(item.date)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {!summary ? (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          오늘 이후의 유효한 날짜를 선택해 주세요. 과거 잔액은 현재 기록만으로
          계산할 수 없습니다.
        </p>
      ) : (
        <>
          <div className="border-border bg-surface mt-4 rounded-lg border p-4">
            <p className="text-muted text-xs">
              {summary.date} 마감 기준 예상 통장 잔액
            </p>
            <p
              data-forecast-amount
              aria-live="polite"
              className={`mt-2 text-2xl font-bold break-words tabular-nums sm:text-3xl ${balance !== null && balance < 0 ? "text-red-600 dark:text-red-400" : "text-brand"}`}
            >
              {balance === null
                ? "먼저 기준 잔액을 설정해 주세요"
                : won(balance)}
            </p>
            <p className="text-muted mt-2 text-xs">
              오늘 대비 예정 변동 {signed(summary.change)} · 예정 촬영 예약{" "}
              {summary.unpaidCount + summary.recognizedCount}건
            </p>
            <dl className="border-border mt-4 grid grid-cols-1 gap-3 border-t pt-3 sm:grid-cols-3">
              {[
                { label: "예정 입금", amount: summary.income },
                { label: "예정 촬영 원가", amount: -summary.shootingCosts },
                { label: "예정 기타·고정지출", amount: -summary.expenses },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="text-muted text-xs">{item.label}</dt>
                  <dd className="mt-1 text-sm font-semibold break-words tabular-nums">
                    {signed(item.amount)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          {summary.missingIncomeCount + summary.missingCostCount > 0 ? (
            <p
              role="status"
              className="mt-3 text-xs leading-relaxed text-amber-800 dark:text-amber-200"
            >
              선택 기간 중 예정 금액 미입력 {summary.missingIncomeCount}건 ·
              원가 미입력 {summary.missingCostCount}건은 해당 금액을 반영하지
              못했습니다. 예약 상세에서 입력하면 전망이 갱신됩니다.
            </p>
          ) : null}
          <details className="mt-4">
            <summary className="text-muted cursor-pointer text-xs font-medium">
              날짜별 예정 내역 · {summary.days.length}일
            </summary>
            {summary.days.length ? (
              <ul className="mt-3 space-y-2">
                {summary.days.map((day) => (
                  <li
                    key={day.date}
                    className="border-border bg-surface rounded-lg border p-3 text-xs"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong>{day.date}</strong>
                      <strong className="tabular-nums">
                        {signed(day.income - day.shootingCosts - day.expenses)}
                      </strong>
                    </div>
                    <p className="text-muted mt-1 leading-relaxed">
                      입금 {won(day.income)} · 촬영 원가{" "}
                      {won(day.shootingCosts)} · 지출 {won(day.expenses)}
                    </p>
                    {day.recognizedCount > 0 ? (
                      <p className="text-muted mt-1">
                        입금확인·완료·노쇼 예약 {day.recognizedCount}건도 미래
                        촬영일의 예정 입금에 포함합니다.
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted mt-3 text-xs">
                이 날짜까지 등록된 예정 입출금이 없습니다.
              </p>
            )}
          </details>
        </>
      )}
      <p className="text-muted mt-4 text-xs leading-relaxed">
        확정 예약의 금액은 입금 처리 상태와 관계없이 촬영일에 반영합니다. 실제
        지불액이 입력되어 있으면 그 금액을, 미입력이라면 신청 당시 예상 금액을
        사용합니다. 촬영 원가는 촬영일, 지출은 등록된 날짜에 반영합니다. 미등록
        반복 지출·추가 입출금은 포함하지 않습니다.
      </p>
      {forecast.unconfirmedCount +
        forecast.undatedReservationCount +
        forecast.overdueUnpaidCount >
      0 ? (
        <p className="text-muted mt-2 text-xs">
          일정 미확정 신청 {forecast.unconfirmedCount}건 · 촬영일 없는 확정 예약{" "}
          {forecast.undatedReservationCount}건 · 지난 촬영일의 미입금 예약{" "}
          {forecast.overdueUnpaidCount}건은 예정 입금에서 제외합니다. 취소
          예약의 입금도 제외하지만, 등록된 원가는 촬영일에 반영합니다.
        </p>
      ) : null}
    </section>
  );
}
