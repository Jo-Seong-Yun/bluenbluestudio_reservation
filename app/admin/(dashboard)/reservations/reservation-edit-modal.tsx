"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  loadReservationForEdit,
  saveReservationEdit,
} from "@/app/admin/actions";
import { Button, ErrorText, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { toLocalInput, type EditData } from "@/lib/reservations/edit-shared";
const statusLabels = {
  requested: "접수",
  schedule_confirmed: "일정 확정",
  payment_confirmed: "입금 확인",
  completed: "촬영 완료",
  cancelled: "취소",
  no_show: "노쇼",
};
export function ReservationEditModal({
  reservationId,
}: {
  reservationId: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<EditData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generation, setGeneration] = useState(0);
  async function open() {
    setData(null);
    setError(null);
    setLoading(true);
    dialog.current?.showModal();
    try {
      const result = await loadReservationForEdit(reservationId);
      setData(result.data);
      setError(result.error);
      setGeneration((v) => v + 1);
    } catch {
      setError("불러오지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <Button variant="ghost" onClick={open}>
        예약 수정
      </Button>
      <dialog
        ref={dialog}
        className="border-border bg-surface text-foreground m-auto w-[calc(100%-2rem)] max-w-3xl rounded-xl border p-0 backdrop:bg-black/50"
        style={{ maxHeight: "90dvh" }}
      >
        <header className="flex items-center justify-between border-b border-inherit px-5 py-4">
          <h2 className="font-bold">예약 내용 수정</h2>
          <Button
            variant="ghost"
            aria-label="닫기"
            onClick={() => dialog.current?.close()}
          >
            ×
          </Button>
        </header>
        <div className="max-h-[calc(90dvh-80px)] overflow-y-auto p-5">
          {loading ? <p role="status">불러오는 중…</p> : null}
          <ErrorText>{error ?? undefined}</ErrorText>
          {data ? (
            <EditForm
              key={generation}
              data={data}
              onClose={() => dialog.current?.close()}
            />
          ) : null}
        </div>
      </dialog>
    </>
  );
}
function EditForm({ data, onClose }: { data: EditData; onClose: () => void }) {
  const r = data.reservation;
  const [state, action] = useActionState(saveReservationEdit, null);
  const [productId, setProductId] = useState(r.product_id);
  const [formError, setFormError] = useState("");
  const [breakdown, setBreakdown] = useState(r.charged_amount_breakdown ?? []);
  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);
  const fields = data.fields.filter(
    (f) =>
      !["name", "phone", "email", "gender", "birth_date"].includes(f.type) &&
      (((f.product_id === productId || f.product_id === null) && f.active) ||
        data.answers.some((a) => a.field_id === f.id)),
  );
  const input = (
    name: string,
    label: string,
    type = "text",
    value: string | number | null = "",
    extra: Record<string, unknown> = {},
  ) => (
    <label className="block text-sm" key={name}>
      <span className="mb-1.5 block font-medium">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={value ?? ""}
        className={inputClass}
        {...extra}
      />
    </label>
  );
  const textarea = (name: string, label: string, value: string | null) => (
    <label className="block text-sm" key={name}>
      <span className="mb-1.5 block font-medium">{label}</span>
      <textarea
        name={name}
        rows={3}
        defaultValue={value ?? ""}
        className={inputClass}
      />
    </label>
  );
  async function submit(form: FormData) {
    setFormError("");
    try {
      const value = (name: string) => String(form.get(name) ?? "");
      const names = [
        "code",
        "status",
        "customer_name",
        "customer_phone",
        "customer_email",
        "gender",
        "birth_date",
        "people_count",
        "shoot_start",
        "shoot_end",
        "created_at",
        "deliverable_sent_at",
        "reminded_at",
        "confirmed_candidate_rank",
        "memo",
        "admin_memo",
        "shoot_location",
        "cancel_reason",
        "cost",
        "cost_memo",
        "charged_amount",
        "charged_amount_memo",
        "estimated_amount",
        "ref",
      ];
      const payload: Record<string, unknown> = Object.fromEntries(
        names.map((n) => [n, value(n)]),
      );
      payload.id = r.id;
      payload.expectedUpdatedAt = r.updated_at;
      payload.product_id = productId;
      payload.birth_date = value("birth_date").replaceAll("-", "");
      payload.team_emails = value("team_emails")
        .split(/[\s,;]+/)
        .filter(Boolean);
      payload.charged_amount_breakdown = breakdown;
      payload.answers = [
        ...data.answers.filter((a) => !fields.some((f) => f.id === a.field_id)),
        ...fields.map((f) => {
          const raw = value("answer_" + f.id);
          return {
            field_id: f.id,
            value:
              f.type === "multi_choice"
                ? JSON.stringify(form.getAll("answer_" + f.id))
                : raw,
          };
        }),
      ];
      payload.candidates = [1, 2, 3].flatMap((rank) => {
        const start = value("candidate_start_" + rank),
          end = value("candidate_end_" + rank);
        return start || end
          ? [{ rank, shoot_start: start, shoot_end: end }]
          : [];
      });
      const request = new FormData();
      request.set("payload", JSON.stringify(payload));
      await action(request);
    } catch {
      setFormError("수정 내용을 준비하지 못했습니다. 다시 시도해 주세요.");
    }
  }
  return (
    <form
      action={submit}
      onReset={(event) => event.preventDefault()}
      className="space-y-5"
    >
      <p className="text-muted text-xs">
        예약의 모든 운영 항목과 신청서 답변을 수정합니다. 저장하면
        매출·고객DB·캘린더 연동에도 반영되며 고객 안내 메일은 자동 발송하지
        않습니다.
      </p>
      <section className="border-border rounded-xl border p-4">
        <h3 className="mb-3 font-bold">예약 및 상품</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {input("code", "예약번호", "text", r.code, { required: true })}
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">상품</span>
            <select
              className={inputClass}
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {data.products.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">상태</span>
            <select
              name="status"
              className={inputClass}
              defaultValue={r.status}
            >
              {Object.entries(statusLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          {input(
            "created_at",
            "접수 일시 (한국시간)",
            "datetime-local",
            toLocalInput(r.created_at),
            { required: true },
          )}
          {input("ref", "유입경로", "text", r.ref)}
        </div>
        <p className="text-muted mt-3 text-xs">
          상품 변경 시 기존 답변을 유지하며 새 상품의 문항도 작성할 수 있습니다.
          예상 금액은 아래에서 직접 확인·수정해 주세요.
        </p>
      </section>
      <section className="border-border rounded-xl border p-4">
        <h3 className="mb-3 font-bold">고객 정보</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {input("customer_name", "이름", "text", r.customer_name, {
            required: true,
            maxLength: 50,
          })}
          {input("customer_phone", "연락처", "tel", r.customer_phone, {
            required: true,
          })}
          {input("customer_email", "이메일", "email", r.customer_email)}
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">성별</span>
            <select
              name="gender"
              className={inputClass}
              defaultValue={r.gender ?? ""}
            >
              <option value="">미입력</option>
              <option value="male">남</option>
              <option value="female">여</option>
            </select>
          </label>
          {input("birth_date", "생년월일", "date", r.birth_date)}
          {input("people_count", "촬영 인원", "number", r.people_count, {
            min: 1,
            step: 1,
          })}
        </div>
        {textarea(
          "team_emails",
          "팀원 수신 이메일 (줄바꿈 또는 쉼표 구분)",
          r.team_emails.join("\n"),
        )}
      </section>
      <section className="border-border rounded-xl border p-4">
        <h3 className="mb-3 font-bold">촬영 일정 및 희망 시간</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {input(
            "shoot_start",
            "확정 촬영 시작",
            "datetime-local",
            toLocalInput(r.shoot_start),
          )}
          {input(
            "shoot_end",
            "확정 촬영 종료",
            "datetime-local",
            toLocalInput(r.shoot_end),
          )}
          {input(
            "confirmed_candidate_rank",
            "확정한 후보 순위 (직접 변경 시 비움)",
            "number",
            r.confirmed_candidate_rank,
            { min: 1, max: 3 },
          )}
          {input("shoot_location", "촬영 장소", "text", r.shoot_location)}
        </div>
        {[1, 2, 3].map((rank) => {
          const c = data.candidates.find((c) => c.rank === rank);
          return (
            <div key={rank} className="mt-4 grid gap-3 sm:grid-cols-2">
              {input(
                "candidate_start_" + rank,
                rank + "지망 시작",
                "datetime-local",
                toLocalInput(c?.shoot_start ?? null),
              )}
              {input(
                "candidate_end_" + rank,
                rank + "지망 종료",
                "datetime-local",
                toLocalInput(c?.shoot_end ?? null),
              )}
            </div>
          );
        })}
        <p className="text-muted mt-3 text-xs">
          촬영 종료 시간 뒤에는 선택 상품의 정리 시간이 적용됩니다. 확정 예약과
          겹치면 저장할 수 없습니다.
        </p>
      </section>
      <section className="border-border rounded-xl border p-4">
        <h3 className="mb-3 font-bold">신청서 전체 답변</h3>
        <div className="space-y-4">
          {fields.map((f) => {
            const raw =
              data.answers.find((a) => a.field_id === f.id)?.value ?? "";
            const name = "answer_" + f.id;
            let multi: string[] = [];
            try {
              const v = JSON.parse(raw);
              if (Array.isArray(v)) multi = v;
            } catch {}
            return (
              <div key={f.id} className="border-border rounded-lg border p-3">
                <p className="mb-2 text-sm font-medium">
                  {f.label}
                  {f.product_id !== null && f.product_id !== productId
                    ? " (기존 상품 답변)"
                    : ""}
                </p>
                {f.type === "multi_choice" ? (
                  <div className="space-y-2">
                    {Array.from(new Set([...(f.options ?? []), ...multi])).map(
                      (opt) => (
                        <label
                          key={opt}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            name={name}
                            value={opt}
                            defaultChecked={multi.includes(opt)}
                          />
                          {opt}
                        </label>
                      ),
                    )}
                  </div>
                ) : f.type === "single_choice" ? (
                  <select name={name} defaultValue={raw} className={inputClass}>
                    <option value="">미입력</option>
                    {Array.from(
                      new Set([...(f.options ?? []), ...(raw ? [raw] : [])]),
                    ).map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                ) : f.type === "checkbox" ? (
                  <select name={name} defaultValue={raw} className={inputClass}>
                    <option value="">미입력</option>
                    <option value="true">예 / 동의</option>
                    <option value="false">아니오 / 미동의</option>
                  </select>
                ) : (
                  <textarea
                    name={name}
                    defaultValue={raw}
                    rows={2}
                    className={inputClass}
                  />
                )}
              </div>
            );
          })}
          {!fields.length ? (
            <p className="text-muted text-sm">추가 신청서 문항이 없습니다.</p>
          ) : null}
        </div>
        {textarea("memo", "손님 요청사항", r.memo)}
      </section>
      <section className="border-border rounded-xl border p-4">
        <h3 className="mb-3 font-bold">금액 및 운영 기록</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {input(
            "estimated_amount",
            "예상 금액 (원)",
            "number",
            r.estimated_amount,
            { min: 0, step: 1 },
          )}
          {input(
            "charged_amount",
            "실제 지불액 (원)",
            "number",
            r.charged_amount,
            { min: 0, step: 1 },
          )}
          {input("cost", "촬영 원가 (원)", "number", r.cost, {
            min: 0,
            step: 1,
          })}
          {input(
            "deliverable_sent_at",
            "결과물 전송 완료 일시",
            "datetime-local",
            toLocalInput(r.deliverable_sent_at),
          )}
          {input(
            "reminded_at",
            "리마인드 기록 일시",
            "datetime-local",
            toLocalInput(r.reminded_at),
          )}
        </div>
        <div className="mt-4 space-y-4">
          {textarea(
            "charged_amount_memo",
            "지불액 메모",
            r.charged_amount_memo,
          )}
          <div>
            <p className="mb-2 text-sm font-medium">실제 지불액 구성</p>
            {breakdown.map((row, index) => (
              <div
                key={index}
                className="mb-2 flex flex-wrap items-center gap-2"
              >
                <input
                  aria-label={`구성 ${index + 1} 이름`}
                  className={inputClass + " min-w-0 flex-1"}
                  value={row.label}
                  onChange={(e) =>
                    setBreakdown((rows) =>
                      rows.map((r, i) =>
                        i === index ? { ...r, label: e.target.value } : r,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`구성 ${index + 1} 금액`}
                  type="number"
                  min={0}
                  step={1}
                  className={inputClass + " w-28"}
                  value={row.amount}
                  onChange={(e) =>
                    setBreakdown((rows) =>
                      rows.map((r, i) =>
                        i === index
                          ? { ...r, amount: Number(e.target.value) }
                          : r,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setBreakdown((rows) => rows.filter((_, i) => i !== index))
                  }
                >
                  삭제
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setBreakdown((rows) => [...rows, { label: "", amount: 0 }])
              }
            >
              + 금액 구성 추가
            </Button>
            <p className="text-muted mt-2 text-xs">
              구성 합계{" "}
              {breakdown.reduce((a, b) => a + b.amount, 0).toLocaleString()}원 ·
              실제 지불액과 같아야 합니다.
            </p>
          </div>
          {textarea("cost_memo", "원가 메모", r.cost_memo)}
          {textarea("admin_memo", "관리자 메모", r.admin_memo)}
          {textarea("cancel_reason", "취소 사유", r.cancel_reason)}
        </div>
      </section>
      <ErrorText>{formError || state?.error}</ErrorText>
      <div className="bg-surface sticky bottom-0 flex justify-end gap-2 border-t border-inherit py-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          취소
        </Button>
        <SubmitButton>변경사항 저장</SubmitButton>
      </div>
    </form>
  );
}
