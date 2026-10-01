"use client";
import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import {
  lookupReservationsByPhone,
  lookupReservation,
  cancelReservation,
  type PhoneLookupState,
  type PhoneReservation,
  type LookupState,
} from "@/lib/booking/actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";
import { useReportPending } from "@/components/pending-overlay";
const STATUS_LABEL: Record<string, string> = {
  requested: "접수 · 일정 확인 대기",
  schedule_confirmed: "일정 확정",
  payment_confirmed: "입금 확인 · 예약 확정",
  completed: "촬영 완료",
  cancelled: "취소 완료",
  no_show: "노쇼",
};
const idle: LookupState = { status: "idle" };
const phoneIdle: PhoneLookupState = { status: "idle" };
const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
export function LookupForm() {
  const [mode, setMode] = useState("phone");
  const [phoneState, phoneAction, phonePending] = useActionState(
    lookupReservationsByPhone,
    phoneIdle,
  );
  const [codeState, codeAction, codePending] = useActionState(
    lookupReservation,
    idle,
  );
  const [list, setList] = useState<PhoneReservation[] | null>(null);
  const [phone, setPhone] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [cancelCode, setCancelCode] = useState<string | null>(null);
  const [handledPhone, setHandledPhone] = useState(phoneState);
  const [handledCode, setHandledCode] = useState(codeState);
  if (phoneState !== handledPhone) {
    setHandledPhone(phoneState);
    if (phoneState.status === "found") {
      setList(phoneState.reservations);
      setPhone(phoneState.phone);
      setSelectedCode(phoneState.reservations[0]?.code ?? null);
      setFilter("all");
    }
  }
  if (codeState !== handledCode) {
    setHandledCode(codeState);
    if (codeState.status === "found") {
      const r = codeState.reservation;
      setPhone(codeState.phone ?? "");
      setList([{ ...r, shootEnd: null, productName: "예약 상세" }]);
      setSelectedCode(r.code);
      setFilter("all");
    }
  }
  const [cancelState, cancelAction, cancelPending] = useActionState(
    async (prev: LookupState, data: FormData) => {
      setCancelCode(String(data.get("code") ?? ""));
      const result = await cancelReservation(prev, data);
      if (
        result.status === "found" &&
        result.reservation.status === "cancelled"
      )
        setList(
          (prev) =>
            prev?.map((r) =>
              r.code === result.reservation.code
                ? { ...r, status: "cancelled" }
                : r,
            ) ?? null,
        );
      return result;
    },
    idle,
  );
  useReportPending(phonePending || codePending || cancelPending);
  function matches(r: PhoneReservation, key: string) {
    return (
      key === "all" ||
      (key === "pending" && r.status === "requested") ||
      (key === "confirmed" &&
        ["schedule_confirmed", "payment_confirmed"].includes(r.status)) ||
      (key === "completed" && r.status === "completed") ||
      (key === "cancelled" && ["cancelled", "no_show"].includes(r.status))
    );
  }
  if (!list)
    return (
      <div className="mx-auto max-w-xl">
        <Link href="/booking" className="text-muted text-sm">
          ← 상품 목록
        </Link>
        <section className="booking-card mt-5">
          <h1 className="text-2xl font-bold">예약 조회</h1>
          <p className="text-muted mt-3 text-sm">
            연락처 또는 예약번호로 예약 상태를 확인합니다.
          </p>
          <div
            className="border-border mt-6 mb-6 flex gap-4 border-b"
            role="group"
            aria-label="예약 조회 방식"
          >
            {[
              ["phone", "연락처로 조회"],
              ["code", "예약번호로 조회"],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                aria-pressed={mode === key}
                onClick={() => setMode(key)}
                className={`border-b-2 pb-3 text-sm ${mode === key ? "border-brand text-brand font-bold" : "text-muted border-transparent"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <form
            action={mode === "phone" ? phoneAction : codeAction}
            className="space-y-5"
            key={mode}
          >
            {mode === "code" ? (
              <Field label="예약번호">
                <input
                  name="code"
                  required
                  autoCapitalize="characters"
                  className={inputClass}
                  placeholder="예약번호를 입력합니다"
                />
              </Field>
            ) : null}
            {mode === "phone" ? (
              <Field label="연락처" hint="예약할 때 입력한 번호입니다.">
                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                  className={inputClass}
                  placeholder="01012345678"
                />
              </Field>
            ) : null}
            <div role="alert">
              <ErrorText>
                {mode === "phone"
                  ? phoneState.status === "error"
                    ? phoneState.error
                    : null
                  : codeState.status === "error"
                    ? codeState.error
                    : null}
              </ErrorText>
            </div>
            <Button
              type="submit"
              disabled={phonePending || codePending}
              className="min-h-12 w-full"
            >
              {phonePending || codePending ? "조회 중…" : "예약 조회하기"}
            </Button>
          </form>
        </section>
      </div>
    );
  const visible = list.filter((r) => matches(r, filter));
  const selected = visible.find((r) => r.code === selectedCode) ?? visible[0];
  return (
    <div>
      <h1 className="text-3xl font-bold">예약 내역</h1>
      <p className="text-muted mt-2 text-sm">
        예약을 선택하면 상태와 상세 내용을 확인합니다.
      </p>
      <div
        className="mt-6 mb-6 flex flex-wrap gap-2"
        role="group"
        aria-label="예약 상태 필터"
      >
        {[
          ["all", "전체"],
          ["pending", "확정 대기"],
          ["confirmed", "확정"],
          ["completed", "촬영 완료"],
          ["cancelled", "취소·노쇼"],
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`rounded-md border px-3 py-2 text-sm ${filter === key ? "border-brand bg-brand text-white" : "border-border bg-surface"}`}
          >
            {label} {list.filter((r) => matches(r, key)).length}
          </button>
        ))}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="booking-card">
          <h2 className="mb-4 font-bold">예약 목록</h2>
          {visible.length ? (
            <ul className="space-y-3">
              {visible.map((r) => (
                <li key={r.code}>
                  <button
                    type="button"
                    onClick={() => setSelectedCode(r.code)}
                    aria-pressed={selected?.code === r.code}
                    className={`border-border w-full rounded-md border p-4 text-left ${selected?.code === r.code ? "bg-surface-subtle" : "bg-surface"}`}
                  >
                    <span className="text-brand text-xs font-semibold">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    <h3 className="mt-2 font-bold">{r.productName}</h3>
                    <p className="text-muted mt-2 text-xs">
                      {r.shootStart
                        ? formatDate(r.shootStart)
                        : "희망 시간 확인 후 확정"}
                    </p>
                    <p className="text-muted mt-2 font-mono text-xs">
                      {r.code}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted text-sm">이 상태의 예약이 없습니다.</p>
          )}
        </aside>
        {selected ? (
          <LookupReservationDetail
            key={selected.code}
            reservation={selected}
            phone={phone}
            cancelAction={cancelAction}
            cancelPending={cancelPending}
            cancelState={cancelCode === selected.code ? cancelState : idle}
          />
        ) : (
          <section className="booking-card">
            <p className="text-muted">확인할 예약을 선택합니다.</p>
          </section>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        className="mt-6"
        onClick={() => {
          setList(null);
          setSelectedCode(null);
        }}
      >
        ← 다른 예약 조회하기
      </Button>
    </div>
  );
}

export function LookupReservationDetail({
  reservation: r,
  phone,
  cancelAction,
  cancelPending,
  cancelState,
}: {
  reservation: PhoneReservation;
  phone: string;
  cancelAction: (data: FormData) => void;
  cancelPending: boolean;
  cancelState: LookupState;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancellable = [
    "requested",
    "schedule_confirmed",
    "payment_confirmed",
  ].includes(r.status);
  return (
    <section className="booking-card">
      <span className="bg-surface-subtle text-brand inline-block rounded-md px-3 py-1 text-xs font-bold">
        {STATUS_LABEL[r.status] ?? r.status}
      </span>
      <h2 className="mt-3 text-2xl font-bold">{r.productName}</h2>
      <p className="text-muted mt-2 font-mono text-sm">{r.code}</p>
      <dl className="border-border mt-6 grid gap-5 border-t pt-6 text-sm">
        <div>
          <dt className="text-muted">예약자</dt>
          <dd className="mt-1 font-semibold">{r.customerName}</dd>
        </div>
        <div>
          <dt className="text-muted">촬영 일시</dt>
          <dd className="mt-1">
            {r.shootStart
              ? formatDate(r.shootStart)
              : "확정 대기 중입니다. 신청한 희망 시간 중 하나로 확정해 드립니다."}
          </dd>
          {r.shootEnd ? (
            <dd className="text-muted mt-1">종료: {formatDate(r.shootEnd)}</dd>
          ) : null}
        </div>
      </dl>
      {cancelState.status === "error" ? (
        <div role="alert" className="mt-5">
          <ErrorText>{cancelState.error}</ErrorText>
        </div>
      ) : null}
      {cancelState.status === "found" &&
      cancelState.reservation.code === r.code &&
      cancelState.reservation.status !== "cancelled" ? (
        <div role="alert" className="mt-5">
          <ErrorText>
            취소 기한이 지났거나 이미 처리된 예약이라 취소할 수 없습니다.
            스튜디오로 문의해 주십시오.
          </ErrorText>
        </div>
      ) : null}
      {cancellable ? (
        <div className="border-border mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
          <div>
            <h3 className="font-bold">예약 취소</h3>
            <p className="text-muted mt-1 text-xs">
              취소 가능 기한 이내에 취소할 수 있습니다.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => dialog.current?.showModal()}
          >
            예약 취소하기
          </Button>
        </div>
      ) : (
        <p
          role="status"
          className="bg-surface-subtle mt-6 rounded-md p-4 text-sm"
        >
          {r.status === "cancelled"
            ? "예약이 취소되었습니다."
            : "이 예약은 더 이상 변경할 수 없습니다."}
        </p>
      )}
      <dialog
        ref={dialog}
        className="border-border bg-surface text-foreground w-[calc(100%-2rem)] max-w-md rounded-xl border p-6 backdrop:bg-black/50"
        aria-label="예약 취소 확인"
      >
        <h3 className="text-xl font-bold">예약을 취소하시겠습니까?</h3>
        <p className="text-muted mt-3 text-sm">
          {r.productName} · {r.code}
        </p>
        <p className="text-muted mt-2 text-sm">
          취소한 예약은 새로 신청해야 합니다.
        </p>
        <form
          action={cancelAction}
          className="mt-6 flex flex-wrap gap-3"
          onSubmit={() => dialog.current?.close()}
        >
          <input type="hidden" name="code" value={r.code} />
          <input type="hidden" name="phone" value={phone} />
          <Button
            type="button"
            variant="ghost"
            onClick={() => dialog.current?.close()}
          >
            유지하기
          </Button>
          <Button type="submit" disabled={cancelPending}>
            {cancelPending ? "취소하는 중…" : "취소하기"}
          </Button>
        </form>
      </dialog>
    </section>
  );
}
