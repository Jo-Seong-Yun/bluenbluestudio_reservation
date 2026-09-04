"use client";

import { useActionState, useState } from "react";
import {
  lookupReservationsByPhone,
  cancelReservation,
  type PhoneLookupState,
  type PhoneReservation,
  type LookupState,
} from "@/lib/booking/actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";

const initialPhoneState: PhoneLookupState = { status: "idle" };
const initialCancelState: LookupState = { status: "idle" };

const STATUS_LABEL: Record<string, string> = {
  requested: "접수됨 (확정 대기)",
  confirmed: "확정됨",
  completed: "촬영 완료",
  cancelled: "취소됨",
  no_show: "노쇼 처리됨",
};

/**
 * 화면은 크게 세 칸으로 나눈다. requested(접수 대기)는 아직 살아있는
 * 예약이라 "확정된 예약" 칸에 함께 두고, no_show는 촬영이 성사되지
 * 않았다는 점에서 "취소된 예약" 칸에 함께 둔다.
 */
const GROUPS = [
  { key: "completed", title: "완료된 예약", statuses: ["completed"] },
  {
    key: "confirmed",
    title: "확정된 예약",
    statuses: ["confirmed", "requested"],
  },
  {
    key: "cancelled",
    title: "취소된 예약",
    statuses: ["cancelled", "no_show"],
  },
] as const;

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} ${d.toLocaleTimeString(
    "ko-KR",
    {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  )}`;
}

export function LookupForm() {
  const [lookupState, lookupAction, lookupPending] = useActionState(
    lookupReservationsByPhone,
    initialPhoneState,
  );

  // 조회 결과를 별도 상태로 들고 있는다 — 취소 성공 시 그 한 건의 상태만
  // 바로 바꿔서 보여줘야 해서(전체를 다시 조회하지 않고).
  const [list, setList] = useState<PhoneReservation[] | null>(null);
  const [phone, setPhone] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  // 렌더링 중 상태 조정: lookupState가 새로 바뀐 시점에만(effect 없이) 한 번
  // list/phone에 옮겨 담는다. useEffect로 하면 렌더 한 번을 더 쓰게 되고,
  // React 자체가 이 경우엔 렌더링 중 조정을 권장한다.
  const [handledLookupState, setHandledLookupState] = useState(lookupState);
  if (lookupState !== handledLookupState) {
    setHandledLookupState(lookupState);
    if (lookupState.status === "found") {
      setList(lookupState.reservations);
      setPhone(lookupState.phone);
    }
  }

  const [cancelState, cancelAction, cancelPending] = useActionState(
    async (_prev: LookupState, formData: FormData) => {
      const result = await cancelReservation(_prev, formData);
      if (
        result.status === "found" &&
        result.reservation.status === "cancelled"
      ) {
        setList((prev) =>
          prev
            ? prev.map((item) =>
                item.code === result.reservation.code
                  ? { ...item, status: "cancelled" }
                  : item,
              )
            : prev,
        );
      }
      return result;
    },
    initialCancelState,
  );

  if (list) {
    return (
      <div>
        <div className="grid gap-6 sm:grid-cols-3">
          {GROUPS.map((group) => {
            const items = list.filter((r) =>
              (group.statuses as readonly string[]).includes(r.status),
            );
            return (
              <div key={group.key}>
                <h2 className="text-muted mb-2 text-xs font-bold tracking-wide uppercase">
                  {group.title} ({items.length})
                </h2>
                {items.length === 0 ? (
                  <p className="text-muted text-sm">없어요.</p>
                ) : (
                  <ul className="space-y-3">
                    {items.map((reservation) => (
                      <ReservationCard
                        key={reservation.code}
                        reservation={reservation}
                        isOpen={selectedCode === reservation.code}
                        onToggle={() =>
                          setSelectedCode((prev) =>
                            prev === reservation.code ? null : reservation.code,
                          )
                        }
                        phone={phone}
                        cancelAction={cancelAction}
                        cancelPending={cancelPending}
                        cancelState={cancelState}
                      />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setList(null);
            setSelectedCode(null);
          }}
          className="text-muted mt-8 text-sm hover:underline"
        >
          ← 다른 번호로 다시 조회
        </button>
      </div>
    );
  }

  return (
    <form action={lookupAction} className="space-y-4">
      <Field label="연락처" hint="예약하실 때 입력하신 번호예요.">
        <input
          name="phone"
          type="tel"
          inputMode="numeric"
          placeholder="01012345678"
          required
          className={inputClass}
        />
      </Field>

      <ErrorText>
        {lookupState.status === "error" ? lookupState.error : null}
      </ErrorText>

      <Button type="submit" disabled={lookupPending} className="w-full">
        {lookupPending ? "조회 중…" : "조회하기"}
      </Button>
    </form>
  );
}

function ReservationCard({
  reservation,
  isOpen,
  onToggle,
  phone,
  cancelAction,
  cancelPending,
  cancelState,
}: {
  reservation: PhoneReservation;
  isOpen: boolean;
  onToggle: () => void;
  phone: string;
  cancelAction: (formData: FormData) => void;
  cancelPending: boolean;
  cancelState: LookupState;
}) {
  const cancellable =
    reservation.status === "requested" || reservation.status === "confirmed";

  return (
    <li className="border-border bg-surface rounded-xl border p-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <p className="font-medium">{reservation.productName}</p>
          <p className="text-muted mt-0.5 text-sm">
            {formatDateTime(reservation.shootStart)}
          </p>
        </div>
        <span className="text-muted shrink-0 text-xs">
          {STATUS_LABEL[reservation.status] ?? reservation.status}
        </span>
      </button>

      {isOpen ? (
        <div className="border-border mt-3 border-t pt-3">
          <p className="text-muted text-sm">
            예약번호 <span className="font-mono">{reservation.code}</span>
          </p>

          {cancellable ? (
            <form action={cancelAction} className="mt-3">
              <input type="hidden" name="code" value={reservation.code} />
              <input type="hidden" name="phone" value={phone} />
              <Button variant="danger" type="submit" disabled={cancelPending}>
                {cancelPending ? "취소하는 중…" : "이 예약 취소하기"}
              </Button>

              {/* 이 예약에 대한 취소 시도 결과만 여기 보여준다. 성공(=상태가
                  cancelled로 바뀜)이면 이 조건 자체가 false가 되어
                  아래의 "변경할 수 없어요" 문구로 자연스럽게 바뀐다. */}
              <div className="mt-2">
                {cancelState.status === "error" ? (
                  <ErrorText>{cancelState.error}</ErrorText>
                ) : null}
                {cancelState.status === "found" &&
                cancelState.reservation.code === reservation.code &&
                cancelState.reservation.status !== "cancelled" ? (
                  <ErrorText>
                    취소 기한이 지났거나 이미 처리된 예약이라 취소할 수 없어요.
                    스튜디오로 문의해주세요.
                  </ErrorText>
                ) : null}
              </div>
            </form>
          ) : (
            <p className="text-muted mt-2 text-sm">
              {reservation.status === "cancelled"
                ? "이미 취소된 예약이에요."
                : "이 예약은 더 이상 변경할 수 없어요."}
            </p>
          )}
        </div>
      ) : null}
    </li>
  );
}
