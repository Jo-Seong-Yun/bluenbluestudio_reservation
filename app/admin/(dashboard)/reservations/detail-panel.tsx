import Link from "next/link";
import { saveAdminMemo, saveReservationCost } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { kstDateString, kstTimeString } from "@/lib/time";
import { calculateAge } from "@/lib/age";
import { DeleteReservationButton } from "./delete-reservation-button";
import { StatusButtons } from "./status-buttons";
import { ConfirmCandidateButtons } from "./confirm-candidate-buttons";
import { RescheduleForm } from "./reschedule-form";
import { RecordSheetButton } from "./record-sheet-button";
import { MoneyField } from "./money-field";
import { ChargedAmountBreakdown } from "./charged-amount-breakdown";
import { Button } from "@/components/ui";

const GENDER_LABEL: Record<string, string> = { male: "남", female: "여" };

type ReservationRow = {
  id: string;
  code: string;
  status: string;
  /** 후보(1~3지망)만 낸 채 아직 확정 전이면 null. */
  shoot_start: string | null;
  shoot_end: string | null;
  customer_name: string;
  customer_phone: string;
  people_count: number | null;
  memo: string | null;
  admin_memo: string | null;
  cost: number | null;
  cost_memo: string | null;
  charged_amount: number | null;
  charged_amount_memo: string | null;
  estimated_amount: number | null;
  gender: string | null;
  birth_date: string | null;
  productName: string;
  customAnswers?: { label: string; value: string; priceNote?: string }[];
  basePrice?: number;
  priceBreakdown?: { label: string; amount: number }[];
  charged_amount_breakdown?: { label: string; amount: number }[] | null;
  /** shoot_start가 null일 때만 채워진다 — 손님이 낸 희망 시간들. */
  candidates?: { rank: number; shootStart: string; shootEnd: string }[];
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
    // key를 예약 id로 못박아 둔다 — 이게 없으면 예약 A에서 입력칸에
    // (defaultValue로만 초기화되는 uncontrolled input) 값을 만지다가
    // 예약 B로 넘어가도 React가 같은 컴포넌트 인스턴스를 재사용해
    // DOM의 값을 그대로 들고 있는다. 화면엔 B를 보고 있지만 입력칸엔
    // A에서 만지던 숫자가 남아 있고, 그 상태로 "저장"을 누르면
    // hidden id는 B로 정확히 바뀌어 있어 B에 A의 값이 그대로
    // 덮어써진다 — key를 주면 예약이 바뀔 때마다 컴포넌트가 통째로
    // 새로 마운트되어 모든 입력칸이 새 예약의 실제 값으로 다시 초기화된다.
    return (
      <ReservationDetail
        key={selected.id}
        reservation={selected}
        month={month}
      />
    );
  }

  if (selectedDate) {
    return (
      <div className="border-border bg-surface rounded-xl border p-4">
        <p className="mb-3 text-sm font-medium">{selectedDate}</p>
        {dayReservations.length === 0 ? (
          <p className="text-muted text-sm">이 날은 예약이 없습니다.</p>
        ) : (
          <ul className="space-y-1">
            {dayReservations.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/reservations?month=${month}&date=${selectedDate}&id=${r.id}`}
                  className="hover:bg-surface-subtle -mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm"
                >
                  <span>
                    {/* 이 목록은 캘린더 날짜 칸에서 온 것이라 항상 shoot_start가 있다. */}
                    {kstTimeString(new Date(r.shoot_start!))} ·{" "}
                    {r.customer_name}
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
      달력에서 날짜나 예약을 선택해 주시기 바랍니다.
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
  // 후보(1~3지망)만 낸 채 아직 확정 전이면 shoot_start가 없다 — 날짜
  // 자체가 안 정해졌으니 "그날 목록으로" 링크도, 시간 표시도 못 한다.
  const isPending = !reservation.shoot_start;
  const start = reservation.shoot_start
    ? new Date(reservation.shoot_start)
    : null;
  const end = reservation.shoot_end ? new Date(reservation.shoot_end) : null;
  const date = reservation.shoot_start?.slice(0, 10);

  return (
    <div className="border-border bg-surface rounded-xl border p-4">
      <Link
        href={
          date
            ? `/admin/reservations?month=${month}&date=${date}`
            : `/admin/reservations?month=${month}`
        }
      >
        <Button type="button" variant="ghost" className="text-xs">
          ← {date ? `${date} 목록` : "예약관리"}
        </Button>
      </Link>

      <p className="mt-2 font-mono text-sm">{reservation.code}</p>
      <h2 className="text-lg font-bold">{reservation.productName}</h2>
      {start && end ? (
        <p className="text-muted mt-0.5 text-sm">
          {kstTimeString(start)} ~ {kstTimeString(end)}
        </p>
      ) : (
        <p className="text-muted mt-0.5 text-sm">
          확정 대기 중 — 아래 희망 시간 중 하나를 선택해 주시기 바랍니다.
        </p>
      )}

      <dl className="mt-4 space-y-1.5 text-sm">
        <Row label="예약자">{reservation.customer_name}</Row>
        <Row label="연락처">{reservation.customer_phone}</Row>
        {reservation.gender ? (
          <Row label="성별">
            {GENDER_LABEL[reservation.gender] ?? reservation.gender}
          </Row>
        ) : null}
        {reservation.birth_date ? (
          <Row label="생년월일">
            <AgeInfo birthDate={reservation.birth_date} />
          </Row>
        ) : null}
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

      {reservation.customAnswers && reservation.customAnswers.length > 0 ? (
        <div className="border-border bg-surface-subtle mt-3 space-y-2 rounded-lg border p-3">
          <p className="text-muted text-xs">추가 문항 답변</p>
          {reservation.customAnswers.map((answer, index) => (
            <div key={index} className="text-sm">
              <p className="text-muted text-xs">{answer.label}</p>
              <div className="flex items-baseline justify-between gap-2">
                <p className="whitespace-pre-wrap">{answer.value}</p>
                {answer.priceNote && (
                  <span className="text-muted shrink-0 text-xs">
                    {answer.priceNote}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="border-border mt-4 border-t pt-4">
        {isPending && reservation.candidates ? (
          <ConfirmCandidateButtons
            reservationId={reservation.id}
            candidates={reservation.candidates}
          />
        ) : (
          <>
            <p className="mb-2 text-sm font-medium">
              상태 변경{" "}
              <span className="text-muted font-normal">
                (파란 버튼이 지금 상태입니다)
              </span>
            </p>
            <StatusButtons
              reservationId={reservation.id}
              status={reservation.status}
            />
          </>
        )}
      </div>

      {/* 확정된 예약만 날짜·시간을 바꿀 수 있다 — 후보만 낸 상태는
          위 ConfirmCandidateButtons로 먼저 확정해야 한다. */}
      {reservation.status === "confirmed" && start ? (
        <RescheduleForm
          reservationId={reservation.id}
          currentDate={kstDateString(start)}
          currentTime={kstTimeString(start)}
        />
      ) : null}

      {/* 날짜가 확정된 예약만 촬영 기록표를 만들 수 있다 — 아직 후보만
          낸 상태(isPending)는 촬영일시 자체가 없다. */}
      {start ? (
        <div className="border-border mt-4 border-t pt-4">
          <RecordSheetButton reservationId={reservation.id} />
        </div>
      ) : null}

      <form action={saveAdminMemo} className="border-border mt-4 border-t pt-4">
        <input type="hidden" name="id" value={reservation.id} />
        <label className="mb-1.5 block text-sm font-medium" htmlFor="adminMemo">
          사장님 메모{" "}
          <span className="text-muted font-normal">
            (손님에게 표시되지 않습니다)
          </span>
        </label>
        <textarea
          id="adminMemo"
          name="adminMemo"
          rows={3}
          defaultValue={reservation.admin_memo ?? ""}
          className="border-border bg-surface focus:border-brand focus:ring-brand/30 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
        />
        <SubmitButton variant="ghost" className="mt-2">
          메모 저장
        </SubmitButton>
      </form>

      {reservation.basePrice != null ? (
        <ChargedAmountBreakdown
          reservationId={reservation.id}
          basePrice={reservation.basePrice}
          defaultOptionItems={reservation.priceBreakdown ?? []}
          initialBreakdown={reservation.charged_amount_breakdown ?? null}
          initialMemo={reservation.charged_amount_memo}
        />
      ) : null}

      <MoneyField
        reservationId={reservation.id}
        label="촬영 원가"
        hint="(대관료·소품·외주 등, 매출관리 순이익 계산에 사용됩니다)"
        amountName="cost"
        memoName="costMemo"
        initialAmount={reservation.cost}
        initialMemo={reservation.cost_memo}
        action={saveReservationCost}
      />

      {/* 상태 버튼들과 시각적으로 분리해둔다 — 되돌릴 수 없는 동작이라
          실수로 다른 버튼과 헷갈려 누르는 일이 없어야 한다. */}
      <div className="mt-6 border-t border-dashed border-red-300 pt-4 dark:border-red-900">
        <p className="text-muted mb-2 text-xs">
          아래는 되돌릴 수 없는 작업입니다.
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

function AgeInfo({ birthDate }: { birthDate: string }) {
  const { manAge, koreanAge, isMinor } = calculateAge(birthDate);
  return (
    <>
      {birthDate} · 만 {manAge}세 (한국 나이 {koreanAge}세) ·{" "}
      <span
        className={
          isMinor ? "font-medium text-amber-600 dark:text-amber-400" : ""
        }
      >
        {isMinor ? "미성년자" : "성인"}
      </span>
    </>
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
