import Link from "next/link";
import { updateReservationStatus, saveAdminMemo } from "@/app/admin/actions";
import { Button } from "@/components/ui";
import { kstTimeString } from "@/lib/time";
import { DeleteReservationButton } from "./delete-reservation-button";

type ReservationRow = {
  id: string;
  code: string;
  status: string;
  shoot_start: string;
  shoot_end: string;
  customer_name: string;
  customer_phone: string;
  people_count: number | null;
  memo: string | null;
  admin_memo: string | null;
  productName: string;
};

const STATUS_LABEL: Record<string, string> = {
  requested: "접수됨",
  confirmed: "확정됨",
  completed: "촬영 완료",
  cancelled: "취소됨",
  no_show: "노쇼",
};

export function DetailPanel({
  selectedDate,
  dayReservations,
  selected,
  month,
}: {
  selectedDate?: string;
  dayReservations: ReservationRow[];
  selected?: ReservationRow;
  month: string;
}) {
  if (selected) {
    return <ReservationDetail reservation={selected} month={month} />;
  }

  if (selectedDate) {
    return (
      <div className="border-border bg-surface rounded-xl border p-4">
        <p className="mb-3 text-sm font-medium">{selectedDate}</p>
        {dayReservations.length === 0 ? (
          <p className="text-muted text-sm">이 날은 예약이 없어요.</p>
        ) : (
          <ul className="space-y-1">
            {dayReservations.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/reservations?month=${month}&date=${selectedDate}&id=${r.id}`}
                  className="hover:bg-surface-subtle -mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm"
                >
                  <span>
                    {kstTimeString(new Date(r.shoot_start))} · {r.customer_name}
                  </span>
                  <span className="text-muted text-xs">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="border-border bg-surface text-muted rounded-xl border p-6 text-center text-sm">
      달력에서 날짜나 예약을 선택해주세요.
    </div>
  );
}

function ReservationDetail({
  reservation,
  month,
}: {
  reservation: ReservationRow;
  month: string;
}) {
  const start = new Date(reservation.shoot_start);
  const end = new Date(reservation.shoot_end);
  const date = reservation.shoot_start.slice(0, 10);

  return (
    <div className="border-border bg-surface rounded-xl border p-4">
      <Link
        href={`/admin/reservations?month=${month}&date=${date}`}
        className="text-muted text-xs hover:underline"
      >
        ← {date} 목록
      </Link>

      <p className="mt-2 font-mono text-sm">{reservation.code}</p>
      <h2 className="text-lg font-bold">{reservation.productName}</h2>
      <p className="text-muted mt-0.5 text-sm">
        {kstTimeString(start)} ~ {kstTimeString(end)}
      </p>

      <dl className="mt-4 space-y-1.5 text-sm">
        <Row label="예약자">{reservation.customer_name}</Row>
        <Row label="연락처">{reservation.customer_phone}</Row>
        {reservation.people_count ? (
          <Row label="인원">{reservation.people_count}명</Row>
        ) : null}
        <Row label="상태">
          {STATUS_LABEL[reservation.status] ?? reservation.status}
        </Row>
      </dl>

      {reservation.memo ? (
        <div className="border-border bg-surface-subtle mt-3 rounded-lg border p-3">
          <p className="text-muted text-xs">손님 요청사항</p>
          <p className="mt-1 text-sm whitespace-pre-wrap">{reservation.memo}</p>
        </div>
      ) : null}

      <div className="border-border mt-4 border-t pt-4">
        <p className="mb-2 text-sm font-medium">
          상태 변경{" "}
          <span className="text-muted font-normal">
            (파란 버튼이 지금 상태예요)
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <StatusButton
            id={reservation.id}
            status="confirmed"
            label="확정"
            current={reservation.status}
          />
          <StatusButton
            id={reservation.id}
            status="completed"
            label="완료 처리"
            current={reservation.status}
          />
          <StatusButton
            id={reservation.id}
            status="no_show"
            label="노쇼 처리"
            current={reservation.status}
          />
          <StatusButton
            id={reservation.id}
            status="cancelled"
            label="취소"
            current={reservation.status}
          />
        </div>
      </div>

      <form action={saveAdminMemo} className="border-border mt-4 border-t pt-4">
        <input type="hidden" name="id" value={reservation.id} />
        <label className="mb-1.5 block text-sm font-medium" htmlFor="adminMemo">
          사장님 메모{" "}
          <span className="text-muted font-normal">(손님에게 안 보여요)</span>
        </label>
        <textarea
          id="adminMemo"
          name="adminMemo"
          rows={3}
          defaultValue={reservation.admin_memo ?? ""}
          className="border-border bg-surface focus:border-brand focus:ring-brand/30 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
        />
        <Button type="submit" variant="ghost" className="mt-2">
          메모 저장
        </Button>
      </form>

      {/* 상태 버튼들과 시각적으로 분리해둔다 — 되돌릴 수 없는 동작이라
          실수로 다른 버튼과 헷갈려 누르는 일이 없어야 한다. */}
      <div className="mt-6 border-t border-dashed border-red-300 pt-4 dark:border-red-900">
        <p className="text-muted mb-2 text-xs">
          아래는 되돌릴 수 없는 작업이에요.
        </p>
        <DeleteReservationButton
          id={reservation.id}
          month={month}
          date={date}
        />
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted w-14 shrink-0">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function StatusButton({
  id,
  status,
  label,
  current,
}: {
  id: string;
  status: string;
  label: string;
  /** 이 예약의 지금 상태. status와 같으면 파란색으로 켜져 있는 것처럼 보여준다. */
  current: string;
}) {
  const isCurrent = status === current;

  return (
    <form action={updateReservationStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button
        type="submit"
        variant={isCurrent ? "primary" : "ghost"}
        aria-pressed={isCurrent}
        className="text-xs"
      >
        {label}
      </Button>
    </form>
  );
}
