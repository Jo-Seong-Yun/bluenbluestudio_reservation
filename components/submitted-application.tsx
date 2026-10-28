"use client";
import { useState } from "react";
import { ReservationFields } from "./reservation-form";
import { formPages, orderedFormFields } from "@/lib/booking/form-pages";
import { fieldGroup } from "@/lib/booking/copy";
import type { SubmittedApplication } from "@/lib/booking/submission";
export function SubmittedApplicationView({
  snapshot,
}: {
  snapshot: SubmittedApplication;
}) {
  const pages = formPages(snapshot.copy).filter(
    (p) =>
      !p.hidden &&
      snapshot.fields.some((f) => fieldGroup(f, snapshot.copy) === p.id),
  );
  const [pageId, setPageId] = useState(pages[0]?.id);
  const page = pages.find((p) => p.id === pageId) ?? pages[0];
  const fields = orderedFormFields(snapshot.fields, snapshot.copy).filter(
    (f) => fieldGroup(f, snapshot.copy) === page?.id,
  );
  return (
    <div className="booking-workspace">
      <main className="booking-page booking-modern-form">
        <p className="text-muted mb-2 text-sm">제출 당시 원본 · 읽기 전용</p>
        <h1>{snapshot.product.name}</h1>
        <p className="booking-lead">
          예상 금액 {snapshot.estimatedAmount.toLocaleString()}원 · 촬영{" "}
          {snapshot.product.durationMin}분
        </p>
        <nav
          aria-label="제출 신청서 페이지"
          className="my-5 flex flex-wrap gap-2"
        >
          {pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-current={p.id === page?.id ? "page" : undefined}
              onClick={() => setPageId(p.id)}
              className="rounded border px-3 py-2 text-sm aria-[current=page]:bg-blue-100"
            >
              {i + 1}. {p.label}
            </button>
          ))}
        </nav>
        <section className="booking-card booking-questionnaire">
          <h2 className="text-xl font-bold">{page?.title}</h2>
          <p className="booking-lead">{page?.intro}</p>
          <fieldset disabled>
            <legend className="sr-only">제출된 답변</legend>
            <ReservationFields
              key={page?.id}
              fields={fields}
              placeholders={snapshot.copy}
              initialAnswers={snapshot.answers}
              navigation={{
                visibleIds: fields.map((f) => f.id),
                activeId: null,
                onSelect: () => {},
                snapshots: {},
                passedIds: [],
                error: null,
              }}
            />
          </fieldset>
        </section>
        <section className="mt-6">
          <h2 className="font-bold">제출한 희망 일정</h2>
          {snapshot.candidates.map((c, i) => (
            <p key={i}>
              {i + 1}순위 · {c.date} {c.time}
            </p>
          ))}
        </section>
      </main>
    </div>
  );
}
