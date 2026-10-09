"use client";
import {
  resolveCopy,
  fieldGroup,
  GROUP_COPY_KEYS,
  type BookingCopy,
} from "@/lib/booking/copy";
import {
  analyticsContext,
  trackBooking,
  flushAnalytics,
  finishAnalyticsAttempt,
} from "@/lib/analytics/client";
import { bookingFormVersion } from "@/lib/analytics/shared";
import { useBookingKeyboard } from "@/components/use-booking-keyboard";
import { BookingContactInput } from "@/components/booking-contact-input";
import { BirthDateSlots } from "@/components/birth-date-slots";
import { BookingCTA } from "@/components/booking-cta";
import { BookingSteps } from "@/components/booking-shell";

import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { flushSync } from "react-dom";
import {
  createReservation,
  type ReservationActionState,
} from "@/lib/booking/actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";
import { useReportPending } from "@/components/pending-overlay";
import { calculateAge, parseBirthDate8 } from "@/lib/age";
import { FieldDescription } from "@/components/field-description";
import { ReservationSuccessCard } from "@/components/reservation-success-card";
import {
  fieldFormName,
  visibleBookingFields,
  bookingReviewAnswers,
  selectedPricedOptions,
  type CustomField,
} from "@/lib/booking/custom-fields-shared";
import { bookingFieldError } from "@/lib/booking/field-validation";
import { readRefCookie } from "@/lib/booking/ref-cookie";

/** 상품별 문항과 입력 컴포넌트를 유지하며 진행선이 있는 아코디언으로 표시합니다. */
const FIELD_LABEL_CLASS = "text-base font-semibold";
const FIELD_HINT_CLASS = "text-sm";
// 라디오/체크박스는 라벨 전체(원·네모 + 글자)가 다 눌리긴 하지만, 기본
// 크기(13px 안팎)로는 선택 표시 자체가 잘 안 보여 손가락으로 짚기
// 애매하다 — py-2로 줄 높이도 같이 키워 터치 영역을 넉넉히 한다.
const OPTION_LABEL_CLASS = "flex items-center gap-2.5 py-2 text-base";
const OPTION_INPUT_CLASS = "h-5 w-5 shrink-0";
const FIELD_WRAPPER_CLASS = "booking-field";
// 기본 버튼 높이(36px)는 관리자 화면 기준이라 모바일에서 엄지로 누르기
// 빠듯하다 — 예약 흐름의 "신청하기" 버튼(booking-flow.tsx)과 같은
// 54px로 맞춘다.
const PRIMARY_CTA_CLASS = "h-[3.375rem] w-full text-base";

/** 문항 상세 설명이 있으면 서식 있는 렌더러로, 없으면 기본 힌트를 보여준다. */
function descriptionHint(
  field: CustomField,
  fallback?: React.ReactNode,
): React.ReactNode {
  return field.description ? (
    <FieldDescription html={field.description} />
  ) : (
    fallback
  );
}

const draftStorageKey = (productId: string) => `booking-draft:v1:${productId}`;
const answerDrafts = new Map<string, Record<string, string[]>>();
const initialState: ReservationActionState = { status: "idle" };

/**
 * 신청서 작성 페이지 본문. 손님이 고른 희망 시간(정확히 3개, 우선순위 순)이
 * 이미 정해진 채로 이 페이지에 들어오므로(쿼리스트링에 담겨 있다),
 * 여기서는 문항들만 받는다.
 *
 * 예전엔 이름·연락처·이메일·성별·생년월일·인원·요청사항이 이 컴포넌트에
 * 하드코딩돼 항상 나갔는데, 이제는 그런 "기본 문항" 없이 상품별
 * customFields 목록만 순서대로 그린다 — 이름/연락처 등도 문항편집에서
 * 만든 문항 중 하나(타입이 name/phone/... 인 것)일 뿐이라 다른 상품엔
 * 없을 수도 있다(app/admin/actions.ts의 DEFAULT_CUSTOM_FIELDS가 새
 * 상품에 기본으로 5개를 만들어 둔다).
 */
export function ReservationForm({
  copy: rawCopy,
  depositRequired = true,
  productId,
  productName,
  durationMin,
  bufferAfterMin,
  basePrice,
  candidates,
  backHref,
  bankAccount,
  notice,
  successHeading,
  successMessage,
  customFields,
}: {
  copy?: BookingCopy;
  depositRequired?: boolean;
  productId: string;
  productName: string;
  durationMin: number;
  bufferAfterMin: number;
  /** 상품 기본가(할인가가 있으면 할인가) — 예상 금액 계산의 출발점. */
  basePrice: number;
  /** 정확히 3개, 우선순위 순서대로. */
  candidates: { date: string; time: string }[];
  backHref: string;
  bankAccount: string | null;
  notice: string | null;
  /** 신청 완료 화면의 제목/설명(관리자 설정에서 고친다). */
  successHeading: string;
  successMessage: string;
  customFields: CustomField[];
}) {
  const fields = useMemo(
    () => visibleBookingFields(customFields),
    [customFields],
  );
  const [initialAnswers, setInitialAnswers] = useState(
    () => answerDrafts.get(productId) ?? {},
  );
  const [draftRestored, setDraftRestored] = useState(false);
  const copy = useMemo(() => resolveCopy(rawCopy), [rawCopy]);
  const groups = useMemo(
    () =>
      [0, 1, 2, 3].filter((group) =>
        fields.some((field) => fieldGroup(field, copy) === group),
      ),
    [fields, copy],
  );
  const [currentGroup, setCurrentGroup] = useState(groups[0] ?? 0);
  const entryGroupRef = useRef(currentGroup);
  const pageEntryFocusRef = useRef<number | null>(null);
  const initialPageFocusHandled = useRef(false);
  const actorFields = fields.filter((field) => fieldGroup(field, copy) === 0);
  const actorName = actorFields.find((field) => field.type === "name");
  const actorGender = actorFields.find(
    (field) =>
      field.type === "gender" ||
      (field.type === "single_choice" && /성별/.test(field.label)),
  );
  const actorBirth = actorFields.find((field) => field.type === "birth_date");

  const actorAutoArmed = useRef(true);
  const contactAutoPassed = useRef(new Set<string>());

  const [reviewing, setReviewing] = useState(false);
  const compactActor =
    currentGroup === 0 &&
    !reviewing &&
    actorFields.length === 3 &&
    !!actorName &&
    !!actorGender &&
    !!actorBirth;
  const visibleIds = fields
    .filter((field) => fieldGroup(field, copy) === currentGroup)
    .map((field) => field.id);
  function nextGroup() {
    for (const field of fields.filter(
      (field) => fieldGroup(field, copy) === currentGroup,
    ))
      if (!validateField(field)) return;
    const next = groups[groups.indexOf(currentGroup) + 1];
    if (next === undefined) {
      confirm();
      return;
    }
    const first = fields.find((field) => fieldGroup(field, copy) === next);
    // iOS 키패드는 사용자 이벤트 안에서 동기 focus해야 열립니다.
    // 두 번째 페이지의 첫 텍스트 입력을 표시한 뒤 같은 이벤트에서 초점을 줍니다.
    const firstInput =
      groups.indexOf(next) === 1
        ? fields
            .filter((field) => fieldGroup(field, copy) === next)
            .map((field) =>
              formRef.current?.querySelector<
                HTMLInputElement | HTMLTextAreaElement
              >(
                `[data-field-id="${CSS.escape(field.id)}"] input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not(:disabled), [data-field-id="${CSS.escape(field.id)}"] textarea:not(:disabled)`,
              ),
            )
            .find((input) => input)
        : null;
    if (firstInput) {
      pageEntryFocusRef.current = next;
      flushSync(() => {
        setCurrentGroup(next);
        setActiveFieldId(
          firstInput.closest<HTMLElement>("[data-field-id]")?.dataset.fieldId ??
            first?.id ??
            null,
        );
      });
      firstInput.focus({ preventScroll: true });
      // 데스크톱에서는 키패드 hook이 스크롤하지 않으므로 직접 중앙에 배치합니다.
      if (!window.matchMedia("(max-width: 767px)").matches)
        firstInput.closest<HTMLElement>("[data-field-id]")?.scrollIntoView({
          block: "center",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        });
      return;
    }
    setCurrentGroup(next);
    setActiveFieldId(first?.id ?? null);
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && formRef.current?.contains(focused))
      focused.blur();
    requestAnimationFrame(() =>
      window.scrollTo({ top: 0, behavior: "instant" }),
    );
  }
  useEffect(() => {
    const restoreFrame = requestAnimationFrame(() => {
      try {
        const raw = sessionStorage.getItem(draftStorageKey(productId));
        if (raw) {
          const saved = JSON.parse(raw);
          if (
            typeof saved.savedAt === "number" &&
            Date.now() - saved.savedAt < 86400000 &&
            saved.answers &&
            typeof saved.answers === "object"
          ) {
            const answers: Record<string, string[]> = {};
            for (const field of fields) {
              const values = saved.answers[field.id];
              if (
                Array.isArray(values) &&
                values.every((v: unknown) => typeof v === "string")
              )
                answers[field.id] = values;
            }
            answerDrafts.set(productId, answers);
            setInitialAnswers(answers);
            if (groups.includes(saved.group)) setCurrentGroup(saved.group);
          } else sessionStorage.removeItem(draftStorageKey(productId));
        }
      } catch {
        /* Storage may be unavailable in a restricted browser. */
      }
      setDraftRestored(true);
    });
    return () => cancelAnimationFrame(restoreFrame);
    // A draft is restored once per mounted product, after hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);
  useEffect(() => {
    if (!draftRestored || initialPageFocusHandled.current) return;
    // 답변 복원으로 입력 DOM을 다시 만든 뒤 첫 페이지에서 한 번만 초점을 줍니다.
    initialPageFocusHandled.current = true;
    if (reviewing || currentGroup !== groups[0]) return;
    const input = formRef.current?.querySelector<
      HTMLInputElement | HTMLTextAreaElement
    >(
      '.booking-questionnaire:not([hidden]) [data-field-id]:not([hidden]) input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not(:disabled), .booking-questionnaire:not([hidden]) [data-field-id]:not([hidden]) textarea:not(:disabled)',
    );
    if (!input) return;
    input.focus({ preventScroll: true });
    if (!window.matchMedia("(max-width: 767px)").matches)
      input.closest<HTMLElement>("[data-field-id]")?.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }, [draftRestored, currentGroup, groups, reviewing]);
  useEffect(() => {
    if (!draftRestored) return;
    syncFieldSnapshots();
    recomputeEstimate();
    try {
      const answers = answerDrafts.get(productId);
      if (answers)
        sessionStorage.setItem(
          draftStorageKey(productId),
          JSON.stringify({ answers, group: currentGroup, savedAt: Date.now() }),
        );
    } catch {
      /* Keep the in-memory draft if sessionStorage is unavailable. */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftRestored, initialAnswers, currentGroup, productId]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const panel = formRef.current?.querySelector<HTMLElement>(
      reviewing ? ".booking-review" : ".booking-questionnaire",
    );
    const animation = panel?.animate(
      [
        { opacity: 0, transform: "translateY(12px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 280, easing: "cubic-bezier(.22,1,.36,1)" },
    );
    return () => animation?.cancel();
  }, [currentGroup, reviewing]);
  // Mobile browsers may restore the old scroll position after the keyboard closes.
  // Keep the page entry at the top through viewport resize/pan, until the visitor acts.
  useEffect(() => {
    const entryForm = formRef.current;
    let frame = 0;
    let scrollFrame = 0;
    let moving = false;
    let interrupted = false;
    const changed = entryGroupRef.current !== currentGroup;
    entryGroupRef.current = currentGroup;
    // 2페이지 자동 초점은 useBookingKeyboard가 중앙 정렬합니다.
    // 키패드 종료 대기/최상단 복원과 겹쳐 스크롤하지 않습니다.
    if (pageEntryFocusRef.current === currentGroup && !reviewing) {
      pageEntryFocusRef.current = null;
      if (entryForm) {
        entryForm.dataset.entryScroll = "true";
        entryForm.style.setProperty(
          "--booking-entry-space",
          `${window.innerHeight / 2}px`,
        );
      }
      return () => {
        if (entryForm) {
          delete entryForm.dataset.entryScroll;
          entryForm.style.removeProperty("--booking-entry-space");
        }
      };
    }
    const viewport = window.visualViewport;
    let waited = 0;
    const scrollFirst = () => {
      if (interrupted || reviewing) return;
      const height = viewport?.height ?? window.innerHeight;
      // Let the keyboard close before measuring the new page's visible area.
      if (
        Math.max(window.innerHeight, document.documentElement.clientHeight) -
          height >
          120 &&
        waited++ < 60
      ) {
        scrollFrame = requestAnimationFrame(scrollFirst);
        return;
      }
      const question = formRef.current?.querySelector<HTMLElement>(
        ".booking-questionnaire:not([hidden]) [data-field-id]:not([hidden])",
      );
      if (!question) return;
      if (
        question
          .closest(".booking-questionnaire")
          ?.getAnimations()
          .some((animation) => animation.playState === "running")
      ) {
        scrollFrame = requestAnimationFrame(scrollFirst);
        return;
      }
      moving = true;
      const dock =
        formRef.current
          ?.querySelector<HTMLElement>(".booking-form-actions")
          ?.getBoundingClientRect().height ?? 0;
      const available = height - dock;
      if (formRef.current) {
        formRef.current.dataset.entryScroll = "true";
        formRef.current.style.setProperty(
          "--booking-entry-space",
          `${available / 2}px`,
        );
      }
      const rect = question.getBoundingClientRect();
      const offset =
        rect.height <= available - 32 ? (available - rect.height) / 2 : 16;
      window.scrollTo({
        top: Math.max(
          0,
          window.scrollY + rect.top - (viewport?.offsetTop ?? 0) - offset,
        ),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    };
    const restoreTop = () => {
      if (moving) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const active = document.activeElement;
        if (
          interrupted ||
          (active instanceof HTMLElement &&
            formRef.current?.contains(active) &&
            active.matches("input:not([type=hidden]), textarea, select"))
        )
          return;
        window.scrollTo({ top: 0, behavior: "instant" });
        if (changed && !reviewing && !scrollFrame)
          scrollFrame = requestAnimationFrame(() => {
            scrollFrame = requestAnimationFrame(scrollFirst);
          });
      });
    };
    const interrupt = () => {
      interrupted = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(scrollFrame);
      if (moving) window.scrollTo({ top: window.scrollY, behavior: "instant" });
    };
    restoreTop();
    viewport?.addEventListener("resize", restoreTop);
    viewport?.addEventListener("scroll", restoreTop);
    window.addEventListener("resize", restoreTop);
    // Ignore the Enter/click event that opened this page; only subsequent actions cancel entry positioning.
    const listenFrame = requestAnimationFrame(() => {
      window.addEventListener("pointerdown", interrupt, { passive: true });
      window.addEventListener("touchstart", interrupt, { passive: true });
      window.addEventListener("wheel", interrupt, { passive: true });
      window.addEventListener("keydown", interrupt);
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(listenFrame);
      cancelAnimationFrame(scrollFrame);
      if (entryForm) {
        delete entryForm.dataset.entryScroll;
        entryForm.style.removeProperty("--booking-entry-space");
      }
      viewport?.removeEventListener("resize", restoreTop);
      viewport?.removeEventListener("scroll", restoreTop);
      window.removeEventListener("resize", restoreTop);
      window.removeEventListener("pointerdown", interrupt);
      window.removeEventListener("touchstart", interrupt);
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("keydown", interrupt);
    };
  }, [currentGroup, reviewing]);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(
    fields[0]?.id ?? null,
  );
  const [passedFieldIds, setPassedFieldIds] = useState<string[]>([]);
  const [fieldSnapshots, setFieldSnapshots] = useState<
    Record<string, { value: string; answered: boolean; valid: boolean }>
  >({});
  const [fieldError, setFieldError] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const [answers, setAnswers] = useState<
    { id: string; label: string; value: string }[]
  >([]);
  const boundAction = createReservation.bind(
    null,
    productId,
    productName,
    durationMin,
    bufferAfterMin,
    basePrice,
    bankAccount,
    notice,
  );
  async function trackedAction(
    previous: ReservationActionState,
    data: FormData,
  ) {
    try {
      const context = analyticsContext(productId);
      data.set("analyticsSessionId", context.sessionId);
      data.set("analyticsAttemptId", context.attemptId ?? "");
      data.set("analyticsDevice", context.device);
      data.set("ref", context.ref ?? "");
      trackBooking("submit_attempt", productId, {
        formVersion: bookingFormVersion(fields),
      });
      flushAnalytics();
    } catch {
      /* 통계 실패가 접수를 막지 않습니다. */
    }
    try {
      const result = await boundAction(previous, data);
      if (result.status === "error")
        trackBooking("submit_error", productId, {
          formVersion: bookingFormVersion(fields),
          errorCode: result.errorCode ?? "server",
        });
      if (result.status === "success") {
        answerDrafts.delete(productId);
        try {
          sessionStorage.removeItem(draftStorageKey(productId));
        } catch {}
        flushAnalytics();
        finishAnalyticsAttempt(productId);
      }
      return result;
    } catch (error) {
      trackBooking("submit_error", productId, {
        formVersion: bookingFormVersion(fields),
        errorCode: "server",
      });
      throw error;
    }
  }
  const [state, action, pending] = useActionState(trackedAction, initialState);
  useReportPending(pending);

  // 유료 옵션이 하나도 없는 상품(대부분)은 이 박스를 아예 안 보여준다
  // — 매번 기본가만 덩그러니 보여주는 건 정보가 아니라 잡음이다.
  const hasPricedFields = fields.some(
    (field) => field.option_prices && field.option_prices.length > 0,
  );
  const formRef = useRef<HTMLFormElement>(null);
  useBookingKeyboard(formRef);
  const analyticsVisited = useRef<string | null>(null);
  const analyticsOpenedAt = useRef(0);
  const analyticsValidity = useRef(new Map<string, boolean>());
  const formVersion = bookingFormVersion(fields);
  useEffect(() => {
    if (reviewing || !activeFieldId || state.status === "success") return;
    if (analyticsVisited.current !== activeFieldId) {
      analyticsVisited.current = activeFieldId;
      analyticsOpenedAt.current = Date.now();
      trackBooking("field_view", productId, {
        fieldId: activeFieldId,
        formVersion,
      });
    }
  }, [activeFieldId, reviewing, productId, formVersion, state.status]);
  useEffect(() => {
    const timer = setTimeout(() => {
      for (const field of fields) {
        const snapshot = fieldSnapshots[field.id];
        if (!snapshot) continue;
        const valid = snapshot.answered && snapshot.valid;
        if (
          analyticsValidity.current.get(field.id) === valid ||
          (!valid && !analyticsValidity.current.has(field.id))
        )
          continue;
        analyticsValidity.current.set(field.id, valid);
        trackBooking(valid ? "field_valid" : "field_invalid", productId, {
          fieldId: field.id,
          formVersion,
          durationMs:
            field.id === activeFieldId
              ? Math.min(
                  86400000,
                  Math.max(0, Date.now() - analyticsOpenedAt.current),
                )
              : null,
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [fieldSnapshots, formVersion, productId, activeFieldId, fields]);
  const [pricedItems, setPricedItems] = useState<
    { fieldId: string; label: string; price: number }[]
  >([]);

  // 신청서에 들어오기 전에 상품 목록/상세를 거치며 쿠키에 저장된
  // 유입경로 값 — 조회 기록과 같은 값으로 맞춰야 채널별 전환율을 비교할
  // 수 있다(lib/booking/ref-cookie.ts). 서버 렌더 시점엔 쿠키를 읽을 수
  // 없으니, state 대신 ref로 마운트 후 DOM에 직접 채워 넣는다 — 리렌더도
  // 없고 하이드레이션 시점의 서버/클라이언트 값 불일치도 없다.
  const refInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (refInputRef.current) {
      refInputRef.current.value = readRefCookie() ?? "";
    }
  }, []);

  // 체크박스/라디오를 전부 controlled로 바꾸는 건 이 화면 전체를 다시
  // 짜는 큰 변경이라, 대신 변경이 있을 때마다 DOM에서 지금 체크된 값을
  // 직접 읽어 다시 계산한다 — onChange 하나로 모든 옵션을 델리게이션해서
  // 듣는다(handleFieldKeyDown과 같은 방식).
  function recomputeEstimate() {
    if (!formRef.current || !hasPricedFields) return;
    const form = formRef.current;
    const selected = new Map<string, string[]>();
    for (const field of fields) {
      if (!field.option_prices) continue;
      const name = fieldFormName(field.id);
      const inputs = form.querySelectorAll<HTMLInputElement>(
        `input[name="${CSS.escape(name)}"]:checked`,
      );
      selected.set(
        field.id,
        Array.from(inputs).map((el) => el.value),
      );
    }
    setPricedItems(selectedPricedOptions(customFields, selected));
  }

  // 마운트 시점에도 한 번 계산한다 — 브라우저가 뒤로가기로 체크 상태를
  // 그대로 복원해 주는 경우(bfcache) 초기 렌더에는 아직 반영이 안 돼서다.
  useEffect(() => {
    recomputeEstimate();
    syncFieldSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addonTotal = pricedItems.reduce((sum, item) => sum + item.price, 0);
  const estimatedTotal = basePrice + addonTotal;

  const requiredCount = fields.filter((field) => field.required).length;
  const completedRequiredCount = fields.filter(
    (field) =>
      field.required &&
      fieldSnapshots[field.id]?.answered &&
      fieldSnapshots[field.id]?.valid,
  ).length;

  const forwardReady =
    !pending &&
    fields
      .filter((field) => reviewing || fieldGroup(field, copy) === currentGroup)
      .every(
        (field) =>
          fieldSnapshots[field.id]?.valid &&
          (!field.required || fieldSnapshots[field.id]?.answered),
      );

  function syncFieldSnapshots() {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    const summaries = bookingReviewAnswers(fields, data);
    setFieldSnapshots(
      Object.fromEntries(
        fields.map((field, index) => [
          field.id,
          {
            value: summaries[index].value,
            answered: data
              .getAll(fieldFormName(field.id))
              .some((v) => String(v).trim().length > 0),
            valid:
              bookingFieldError(field, data) === null &&
              Array.from(
                formRef.current!.querySelectorAll<
                  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
                >(`[name="${CSS.escape(fieldFormName(field.id))}"]`),
              ).every((input) => input.validity.valid),
          },
        ]),
      ),
    );
  }

  function revealField(id: string, reportError = false) {
    const groupField = fields.find((field) => field.id === id);
    if (groupField) setCurrentGroup(fieldGroup(groupField, copy));
    setActiveFieldId(id);
    requestAnimationFrame(() => {
      const block = formRef.current?.querySelector<HTMLElement>(
        `[data-field-id="${CSS.escape(id)}"]`,
      );
      const input = block?.querySelector<
        HTMLInputElement | HTMLTextAreaElement
      >("input, textarea");
      (input ?? block?.querySelector<HTMLButtonElement>("button"))?.focus({
        preventScroll: true,
      });
      if (reportError) input?.reportValidity();
    });
  }

  function validateField(field: CustomField) {
    const form = formRef.current;
    if (!form) return false;
    const block = form.querySelector<HTMLElement>(
      `[data-field-id="${CSS.escape(field.id)}"]`,
    );
    const inputs = [
      ...(block?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "input, textarea",
      ) ?? []),
    ];
    inputs.forEach((input) => input.setCustomValidity(""));
    let error = bookingFieldError(field, new FormData(form));
    if (!error)
      error =
        inputs.find((input) => !input.validity.valid)?.validationMessage ??
        null;
    if (error) {
      trackBooking("field_error", productId, {
        fieldId: field.id,
        formVersion,
        errorCode: "validation",
      });
      inputs[0]?.setCustomValidity(error);
      setFieldError({ id: field.id, message: error });
      revealField(field.id, true);
      return false;
    }
    return true;
  }

  // 이전 단계와 새로고침에서 입력값을 유지합니다. 임시 답변은 탭별 sessionStorage에 저장하고,
  // 신청서의 모든 페이지 입력을 마운트한 채 hidden으로 표시만 전환합니다.
  // Enter 이동을 유지하고, 배우 정보 세 항목의 완료 시에만 자동으로 다음 페이지로 이동합니다.
  function handleFieldKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (
      reviewing ||
      e.key !== "Enter" ||
      e.nativeEvent.isComposing ||
      e.nativeEvent.keyCode === 229
    )
      return;
    const target = e.target;
    if (!(
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ))
      return;
    // 장문형도 Enter로 이동합니다. Shift+Enter로 줄바꿈을 유지합니다.
    if (target instanceof HTMLTextAreaElement && e.shiftKey) return;
    if (target instanceof HTMLInputElement && target.type === "hidden") return;
    e.preventDefault();
    const id = target.closest<HTMLElement>("[data-field-id]")?.dataset.fieldId;
    const index = fields.findIndex((field) => field.id === id);
    if (index < 0 || !validateField(fields[index])) return;
    const submittedValues = new FormData(formRef.current!);
    if (
      submittedValues
        .getAll(fieldFormName(fields[index].id))
        .some((v) => String(v).trim().length > 0) &&
      analyticsValidity.current.get(fields[index].id) !== true
    ) {
      analyticsValidity.current.set(fields[index].id, true);
      trackBooking("field_valid", productId, {
        fieldId: fields[index].id,
        formVersion,
        durationMs: Math.min(
          86400000,
          Math.max(0, Date.now() - analyticsOpenedAt.current),
        ),
      });
    }
    syncFieldSnapshots();
    setFieldError(null);
    setPassedFieldIds((prev) =>
      prev.includes(fields[index].id) ? prev : [...prev, fields[index].id],
    );
    const groupFields = fields.filter(
      (field) => fieldGroup(field, copy) === currentGroup,
    );
    const next =
      groupFields[groupFields.findIndex((field) => field.id === id) + 1];
    if (next) revealField(next.id);
    else nextGroup();
  }

  function guideActorChange(target: HTMLElement) {
    if (
      currentGroup !== 0 ||
      reviewing ||
      !actorName ||
      !actorGender ||
      !actorBirth ||
      !formRef.current
    )
      return;
    const data = new FormData(formRef.current);
    const complete =
      actorFields.every(
        (field) =>
          bookingFieldError(field, data) === null &&
          Array.from(
            formRef.current!.querySelectorAll<
              HTMLInputElement | HTMLTextAreaElement
            >(`[name="${CSS.escape(fieldFormName(field.id))}"]`),
          ).every((input) => input.validity.valid),
      ) &&
      [actorName, actorGender, actorBirth].every(
        (field) =>
          String(data.get(fieldFormName(field.id)) ?? "").trim().length > 0,
      );
    if (!complete) actorAutoArmed.current = true;
    if (complete && actorAutoArmed.current) {
      actorAutoArmed.current = false;
      nextGroup();
      return;
    }
    focusActorBirth(target);
  }

  function guideContactChange(target: HTMLElement, finished = false) {
    const form = formRef.current;
    if (!form || currentGroup !== 1 || reviewing || pending) return;
    const id = target.closest<HTMLElement>("[data-field-id]")?.dataset.fieldId;
    const groupFields = fields.filter((field) => fieldGroup(field, copy) === 1);
    const index = groupFields.findIndex((field) => field.id === id);
    if (index < 0) return;
    const field = groupFields[index];
    const data = new FormData(form);
    const raw = String(data.get(fieldFormName(field.id)) ?? "").trim();
    const valid = (item: CustomField) =>
      bookingFieldError(item, data) === null &&
      Array.from(
        form.querySelectorAll<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >(`[name="${CSS.escape(fieldFormName(item.id))}"]`),
      ).every((input) => input.validity.valid);
    const complete =
      !!raw &&
      valid(field) &&
      (field.type === "phone"
        ? raw.replace(/\D/g, "").length === 11
        : finished);
    if (!complete) {
      contactAutoPassed.current.delete(field.id);
      return;
    }
    if (contactAutoPassed.current.has(field.id)) return;
    contactAutoPassed.current.add(field.id);
    const next = groupFields[index + 1];
    if (next) {
      setActiveFieldId(next.id);
      const input = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        `[name="${CSS.escape(fieldFormName(next.id))}"]`,
      );
      input?.focus({ preventScroll: true });
      return;
    }
    if (groupFields.every(valid)) nextGroup();
  }

  function focusActorBirth(target: HTMLElement) {
    if (
      currentGroup !== 0 ||
      reviewing ||
      !actorGender ||
      !actorBirth ||
      !(target instanceof HTMLInputElement) ||
      target.type !== "radio" ||
      target.name !== fieldFormName(actorGender.id)
    )
      return;
    const input = formRef.current?.querySelector<HTMLInputElement>(
      `[name="${CSS.escape(fieldFormName(actorBirth.id))}"]`,
    );
    // Focus during the native click, before iOS clears its keyboard gesture permission.
    if (input && document.activeElement !== input)
      input.focus({ preventScroll: true });
  }

  function confirm() {
    const form = formRef.current;
    if (!form) return;
    for (const field of fields) if (!validateField(field)) return;
    setFieldError(null);
    const analyticsData = new FormData(form);
    for (const field of fields) {
      const answered = analyticsData
        .getAll(fieldFormName(field.id))
        .some((v) => String(v).trim().length > 0);
      if (answered && analyticsValidity.current.get(field.id) !== true) {
        analyticsValidity.current.set(field.id, true);
        trackBooking("field_valid", productId, {
          fieldId: field.id,
          formVersion,
        });
      }
    }
    syncFieldSnapshots();
    setAnswers(bookingReviewAnswers(fields, new FormData(form)));
    trackBooking("review_view", productId, { formVersion });
    flushAnalytics();
    setReviewing(true);
    requestAnimationFrame(() =>
      document.getElementById("booking-review-heading")?.focus(),
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (state.status === "success") {
    return (
      <div className="mx-auto max-w-3xl">
        <BookingSteps stage="success" />

        <ReservationSuccessCard
          successHeading={rawCopy?.successTitle ?? successHeading}
          successMessage={rawCopy?.successIntro ?? successMessage}
          copy={copy}
          depositRequired={state.depositRequired ?? depositRequired}
          estimatedTotal={estimatedTotal}
          durationMin={durationMin}
          code={state.code}
          productName={productName}
          candidates={state.candidates}
          bankAccount={bankAccount}
          notice={notice}
        />
      </div>
    );
  }
  return (
    <>
      <div className={compactActor ? "booking-actor-steps" : undefined}>
        <BookingSteps stage={reviewing ? "review" : "form"} />
      </div>
      <form
        ref={formRef}
        action={action}
        onKeyDown={handleFieldKeyDown}
        onClickCapture={(event) => focusActorBirth(event.target as HTMLElement)}
        onCompositionEnd={(event) => {
          requestAnimationFrame(() =>
            guideActorChange(event.target as HTMLElement),
          );
        }}
        onFocusCapture={(event) => {
          const id = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-field-id]",
          )?.dataset.fieldId;
          if (id) setActiveFieldId(id);
        }}
        onBlur={(event) =>
          guideContactChange(event.target as HTMLElement, true)
        }
        onChange={(event) => {
          const target = event.target as HTMLElement;
          const block = target.closest<HTMLElement>("[data-field-id]");
          block
            ?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
              "input, textarea",
            )
            .forEach((input) => input.setCustomValidity(""));
          if (block?.dataset.fieldId === fieldError?.id) setFieldError(null);
          if (formRef.current) {
            const data = new FormData(formRef.current);
            answerDrafts.set(
              productId,
              Object.fromEntries(
                fields.map((field) => [
                  field.id,
                  data.getAll(fieldFormName(field.id)).map(String),
                ]),
              ),
            );
          }
          try {
            sessionStorage.setItem(
              draftStorageKey(productId),
              JSON.stringify({
                answers: answerDrafts.get(productId),
                group: currentGroup,
                savedAt: Date.now(),
              }),
            );
          } catch {
            /* Browser storage is optional; input must remain usable. */
          }
          syncFieldSnapshots();
          recomputeEstimate();
          if (!(event.nativeEvent as InputEvent).isComposing) {
            guideActorChange(target);
            guideContactChange(target);
          }
        }}
        onSubmit={(event) => {
          if (!reviewing) {
            event.preventDefault();
            confirm();
          }
        }}
        className={[
          "booking-split booking-reservation-form booking-modern-form",
          compactActor ? "booking-actor-compact" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {candidates.map((c, i) => (
          <div key={i} hidden>
            <input type="hidden" name="candidateDate" value={c.date} />
            <input type="hidden" name="candidateTime" value={c.time} />
          </div>
        ))}
        <input type="hidden" name="ref" ref={refInputRef} defaultValue="" />
        <section
          key={draftRestored ? "draft-restored" : "draft-initial"}
          className="booking-card booking-questionnaire"
          hidden={reviewing}
        >
          <Link
            href={backHref}
            className="text-brand mb-5 inline-block text-sm"
          >
            ← 날짜·시간 다시 고르기
          </Link>
          <div className="booking-group-navigation">
            <button
              type="button"
              onClick={() => {
                const prev = groups[groups.indexOf(currentGroup) - 1];
                if (prev !== undefined) {
                  const focused = document.activeElement;
                  if (focused instanceof HTMLElement) focused.blur();
                  setCurrentGroup(prev);
                }
              }}
              disabled={groups.indexOf(currentGroup) === 0}
            >
              ← 이전
            </button>
            <span>
              신청서 {groups.indexOf(currentGroup) + 1} / {groups.length}
            </span>
          </div>
          <div className="booking-group-progress">
            {groups.map((group) => (
              <span
                key={group}
                className={group <= currentGroup ? "done" : ""}
              />
            ))}
          </div>
          <h1 className="text-2xl font-bold">
            {copy[GROUP_COPY_KEYS[currentGroup][0]]}
          </h1>
          {copy[GROUP_COPY_KEYS[currentGroup][1]] ? (
            <p className="booking-lead">
              {copy[GROUP_COPY_KEYS[currentGroup][1]]}
            </p>
          ) : null}
          <p className="booking-form-help">
            Enter로 다음 문항에 이동합니다. 문항 제목을 눌러 직접 이동할 수도
            있습니다.
          </p>
          <div className="booking-form-product">
            <div>
              <strong>{productName}</strong>
              <p>
                촬영 {durationMin}분 · 희망 시간 {candidates.length}개
              </p>
            </div>
            <strong>{estimatedTotal.toLocaleString()}원</strong>
          </div>
          <div className="booking-form-progress" aria-live="polite">
            <span>작성 진행</span>
            <span>
              필수 문항{" "}
              {
                fields.filter(
                  (f) =>
                    f.required &&
                    fieldSnapshots[f.id]?.answered &&
                    fieldSnapshots[f.id]?.valid,
                ).length
              }
              /{fields.filter((f) => f.required).length}
            </span>
          </div>
          <div
            className="booking-form-progress-track"
            role="progressbar"
            aria-label="필수 문항 작성 진행"
            aria-valuemin={0}
            aria-valuemax={Math.max(requiredCount, 1)}
            aria-valuenow={requiredCount ? completedRequiredCount : 1}
          >
            <span
              style={{
                width: `${requiredCount ? (completedRequiredCount / requiredCount) * 100 : 100}%`,
              }}
            />
          </div>
          <ReservationFields
            fields={fields}
            initialAnswers={initialAnswers}
            placeholders={copy}
            navigation={{
              visibleIds,
              activeId: activeFieldId,
              onSelect: (id) => revealField(id),
              snapshots: fieldSnapshots,
              passedIds: passedFieldIds,
              error: fieldError,
            }}
          />
        </section>
        {reviewing ? (
          <section className="booking-card booking-review">
            <h1
              id="booking-review-heading"
              tabIndex={-1}
              className="text-2xl font-bold"
            >
              {copy.reviewTitle}
            </h1>
            {copy.reviewIntro ? (
              <p className="text-muted mt-2 text-sm">{copy.reviewIntro}</p>
            ) : null}
            <dl className="mt-5">
              {answers.map((a) => (
                <div key={a.id} className="booking-review-answer">
                  <dt>{a.label}</dt>
                  <dd>{a.value}</dd>
                </div>
              ))}
            </dl>
            <Button
              type="button"
              variant="ghost"
              className="mt-5"
              onClick={() => setReviewing(false)}
            >
              ← 신청 정보 수정하기
            </Button>
          </section>
        ) : null}
        <aside className="booking-card booking-summary" aria-label="예약 요약">
          <p className="booking-form-summary-detail text-brand text-xs font-bold">
            예약 요약
          </p>
          <h2 className="booking-form-summary-detail">{productName}</h2>
          <p className="booking-form-summary-detail text-muted text-sm">
            촬영 {durationMin}분
          </p>
          <div className="booking-form-summary-detail booking-summary-total">
            <span>예상 금액</span>
            <strong>{estimatedTotal.toLocaleString()}원</strong>
          </div>
          {pricedItems.length > 0 ? (
            <ul className="text-muted mt-3 space-y-2 text-xs">
              <li className="flex justify-between gap-3">
                <span>기본 요금</span>
                <span>{basePrice.toLocaleString()}원</span>
              </li>
              {pricedItems.map((p, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{p.label}</span>
                  <span>+{p.price.toLocaleString()}원</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div role="alert" className={state.status === "error" ? "mt-4" : ""}>
            <ErrorText>
              {state.status === "error" ? state.error : null}
            </ErrorText>
          </div>
          <div className="booking-form-actions">
            <div className="booking-form-mobile-total">
              <span>예상 금액</span>
              <strong>{estimatedTotal.toLocaleString()}원</strong>
            </div>
            {reviewing ? (
              <BookingCTA
                ready={forwardReady}
                key="submit-reservation"
                type="submit"
                disabled={pending}
                className={`${PRIMARY_CTA_CLASS} mt-4`}
              >
                {pending ? "접수 중…" : "예약 신청하기"}
              </BookingCTA>
            ) : (
              <BookingCTA
                ready={forwardReady}
                key="confirm-reservation"
                type="button"
                onClick={(event) => {
                  // 확인 버튼이 제출 버튼으로 바뀌는 클릭에서 바로 접수되지 않게 한다.
                  event.preventDefault();
                  nextGroup();
                }}
                className={`${PRIMARY_CTA_CLASS} mt-4`}
              >
                {groups.indexOf(currentGroup) === groups.length - 1
                  ? "신청 내용 확인하기 →"
                  : "다음 단계로 →"}
              </BookingCTA>
            )}
          </div>
          <p className="booking-form-summary-detail text-muted mt-4 text-xs leading-relaxed">
            신청 후 스튜디오에서 일정 확정 안내를 드립니다.
            {depositRequired ? " 확정 안내 전에는 입금하지 않습니다." : ""}
          </p>
        </aside>
      </form>
    </>
  );
}

/** 상품 문항 설정을 고객 신청서와 관리자 미리보기에서 똑같이 렌더링한다. */
type QuestionNavigation = {
  visibleIds?: string[];
  activeId: string | null;
  onSelect: (id: string) => void;
  snapshots: Record<
    string,
    { value: string; answered: boolean; valid: boolean }
  >;
  passedIds: string[];
  error: { id: string; message: string } | null;
};
export function ReservationFields({
  fields,
  navigation,
  initialAnswers = {},
  placeholders = {},
}: {
  fields: CustomField[];
  initialAnswers?: Record<string, string[]>;
  placeholders?: BookingCopy;
  navigation?: QuestionNavigation;
}) {
  return (
    <div className={navigation ? "booking-question-list" : undefined}>
      {visibleBookingFields(fields).map((field, index) => {
        const active = navigation?.activeId === field.id;
        const snapshot = navigation?.snapshots[field.id];
        const complete =
          snapshot?.valid &&
          (snapshot.answered || navigation?.passedIds.includes(field.id));
        const error =
          navigation?.error?.id === field.id ? navigation.error.message : null;
        const headingId = `question-heading-${field.id}`;
        const panelId = `question-panel-${field.id}`;
        return (
          <div
            key={field.id}
            hidden={
              navigation?.visibleIds
                ? !navigation.visibleIds.includes(field.id)
                : false
            }
            data-field-block
            data-field-type={field.type}
            data-gender={
              field.type === "gender" ||
              (field.type === "single_choice" && /성별/.test(field.label))
                ? "true"
                : undefined
            }
            data-field-id={field.id}
            className={[
              FIELD_WRAPPER_CLASS,
              navigation ? "booking-question" : "",
              navigation && active ? "is-active" : "",
              navigation && complete ? "is-complete" : "",
              navigation && error ? "has-error" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {navigation ? (
              <>
                <button
                  id={headingId}
                  type="button"
                  className="booking-question-heading"
                  aria-controls={panelId}
                  onClick={() => navigation.onSelect(field.id)}
                >
                  <span className="booking-question-dot" aria-hidden>
                    {complete && !active
                      ? "✓"
                      : String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="booking-question-heading-copy">
                    <span className="booking-question-title">
                      {field.label}
                      {field.required ? (
                        <span className="booking-question-required">필수</span>
                      ) : null}
                      {active ? (
                        <span className="booking-question-current">
                          작성 중
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
                <div
                  id={panelId}
                  aria-labelledby={headingId}
                  className="booking-question-panel"
                >
                  <ReservationFieldInput
                    field={field}
                    values={initialAnswers[field.id] ?? []}
                    placeholderText={placeholders[`placeholder:${field.id}`]}
                  />
                  {error ? (
                    <p className="booking-question-error" role="alert">
                      {error}
                    </p>
                  ) : null}
                  <p className="booking-question-key-hint">
                    {field.type === "long_text"
                      ? "Enter는 다음 문항 · Shift+Enter는 줄바꿈"
                      : "Enter로 다음 문항 · 제목을 눌러 이동할 수도 있습니다."}
                  </p>
                </div>
              </>
            ) : (
              <ReservationFieldInput
                field={field}
                values={initialAnswers[field.id] ?? []}
                placeholderText={placeholders[`placeholder:${field.id}`]}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** 보기 여러 개를 하나의 label 안에 중첩하지 않고 접근 가능한 그룹으로 묶는다. */
function ChoiceField({
  label,
  required,
  hint,
  children,
  labelClassName,
  hintClassName,
}: React.ComponentProps<typeof Field>) {
  return (
    <fieldset className="min-w-0">
      <legend className={`${labelClassName} mb-1`}>
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </legend>
      {hint ? (
        <div className={`text-muted mb-2 ${hintClassName}`}>{hint}</div>
      ) : null}
      {children}
    </fieldset>
  );
}

/** 문항 하나를 타입에 맞는 입력으로 그린다. */
function ReservationFieldInput({
  field,
  values = [],
  placeholderText,
}: {
  field: CustomField;
  values?: string[];
  placeholderText?: string;
}) {
  const optionHintId = useId();
  const name = fieldFormName(field.id);
  const options = field.options ?? [];

  if (field.type === "name") {
    return (
      <Field
        label={field.label}
        required={field.required}
        hint={descriptionHint(field)}
        labelClassName={FIELD_LABEL_CLASS}
        hintClassName={FIELD_HINT_CLASS}
        hintPosition="before"
      >
        <input
          name={name}
          defaultValue={values[0] ?? ""}
          placeholder={placeholderText || undefined}
          enterKeyHint="next"
          required={field.required}
          maxLength={50}
          className={inputClass}
        />
      </Field>
    );
  }

  if (field.type === "phone") {
    return (
      <Field
        label={field.label}
        required={field.required}
        hint={descriptionHint(field)}
        labelClassName={FIELD_LABEL_CLASS}
        hintClassName={FIELD_HINT_CLASS}
        hintPosition="before"
      >
        <BookingContactInput
          label={field.label}
          name={name}
          defaultValue={values[0] ?? ""}
          enterKeyHint="next"
          type="tel"
          placeholder={placeholderText || "010-0000-0000"}
          required={field.required}
          className={inputClass}
        />
      </Field>
    );
  }

  if (field.type === "email") {
    return (
      <Field
        label={field.label}
        required={field.required}
        hint={descriptionHint(
          field,
          "입력하시면 문자와 함께 이메일로도 안내해 드립니다.",
        )}
        labelClassName={FIELD_LABEL_CLASS}
        hintClassName={FIELD_HINT_CLASS}
        hintPosition="before"
      >
        <BookingContactInput
          label={field.label}
          name={name}
          defaultValue={values[0] ?? ""}
          enterKeyHint="next"
          type="email"
          placeholder={placeholderText || "you@example.com"}
          required={field.required}
          className={inputClass}
        />
      </Field>
    );
  }

  if (field.type === "gender") {
    return (
      <ChoiceField
        label={field.label}
        required={field.required}
        hint={descriptionHint(field)}
        labelClassName={FIELD_LABEL_CLASS}
        hintClassName={FIELD_HINT_CLASS}
        hintPosition="before"
      >
        <div className="flex gap-4">
          <label className={OPTION_LABEL_CLASS}>
            <input
              type="radio"
              name={name}
              enterKeyHint="next"
              value="male"
              defaultChecked={values.includes("male")}
              required={field.required}
              className={OPTION_INPUT_CLASS}
            />
            남성
          </label>
          <label className={OPTION_LABEL_CLASS}>
            <input
              type="radio"
              name={name}
              enterKeyHint="next"
              value="female"
              defaultChecked={values.includes("female")}
              required={field.required}
              className={OPTION_INPUT_CLASS}
            />
            여성
          </label>
        </div>
      </ChoiceField>
    );
  }

  if (field.type === "birth_date") {
    return (
      <BirthDateInput
        field={field}
        name={name}
        initialValue={values[0] ?? ""}
        placeholderText={placeholderText}
      />
    );
  }

  if (field.type === "long_text") {
    return (
      <Field
        label={field.label}
        required={field.required}
        hint={descriptionHint(field)}
        labelClassName={FIELD_LABEL_CLASS}
        hintClassName={FIELD_HINT_CLASS}
        hintPosition="before"
      >
        <textarea
          name={name}
          defaultValue={values[0] ?? ""}
          placeholder={placeholderText || undefined}
          enterKeyHint="next"
          rows={3}
          maxLength={1000}
          required={field.required}
          className={inputClass}
        />
      </Field>
    );
  }

  if (field.type === "single_choice" || field.type === "multi_choice") {
    return (
      <ChoiceField
        label={field.label}
        required={field.required}
        hint={descriptionHint(field)}
        labelClassName={FIELD_LABEL_CLASS}
        hintClassName={FIELD_HINT_CLASS}
        hintPosition="before"
      >
        <div>
          {options.map((option, index) => {
            const price = field.option_prices?.[index];
            const description = field.option_descriptions?.[index];
            return (
              <label
                key={option}
                className={
                  description
                    ? "booking-option-tile flex items-start gap-2.5 py-2 text-base"
                    : OPTION_LABEL_CLASS
                }
              >
                <input
                  type={field.type === "single_choice" ? "radio" : "checkbox"}
                  name={name}
                  enterKeyHint="next"
                  value={option}
                  defaultChecked={values.includes(option)}
                  aria-describedby={
                    description ? `${optionHintId}-${index}` : undefined
                  }
                  required={field.type === "single_choice" && field.required}
                  className={[
                    OPTION_INPUT_CLASS,
                    description ? "mt-0.5" : "",
                  ].join(" ")}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span>{option}</span>
                    {price ? (
                      <span className="text-brand text-sm font-medium">
                        (+{price.toLocaleString()}원)
                      </span>
                    ) : null}
                  </span>
                  {description ? (
                    <span
                      id={`${optionHintId}-${index}`}
                      className="text-muted mt-1 block text-sm break-words whitespace-pre-wrap"
                    >
                      {description}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      </ChoiceField>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-start gap-2 text-base">
        <input
          type="checkbox"
          defaultChecked={values.length > 0}
          name={name}
          enterKeyHint="next"
          required={field.required}
          className="mt-0.5 h-5 w-5 shrink-0"
        />
        <span className="font-semibold">
          {field.label}
          {field.required ? (
            <span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
          ) : null}
          {field.description ? (
            <span className="text-muted mt-1 block text-sm font-normal">
              <FieldDescription html={field.description} />
            </span>
          ) : null}
        </span>
      </label>
    );
  }

  // short_text
  return (
    <Field
      label={field.label}
      required={field.required}
      hint={descriptionHint(field)}
      labelClassName={FIELD_LABEL_CLASS}
      hintClassName={FIELD_HINT_CLASS}
      hintPosition="before"
    >
      <input
        name={name}
        defaultValue={values[0] ?? ""}
        enterKeyHint="next"
        type="text"
        placeholder={placeholderText || undefined}
        maxLength={200}
        required={field.required}
        className={inputClass}
      />
    </Field>
  );
}

/** 생년월일 입력. 8자리를 타이핑하는 대로 만나이/한국나이/미성년자를 보여준다. */
function BirthDateInput({
  field,
  name,
  initialValue = "",
  placeholderText,
}: {
  field: CustomField;
  name: string;
  initialValue?: string;
  placeholderText?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const parsedDate = parseBirthDate8(value);
  const ageInfo = parsedDate ? calculateAge(parsedDate) : null;

  return (
    <Field
      label={field.label}
      required={field.required}
      hint={descriptionHint(
        field,
        placeholderText || "태어난 연도·월·일을 8자리로 입력해주세요",
      )}
      labelClassName={FIELD_LABEL_CLASS}
      hintClassName={FIELD_HINT_CLASS}
      hintPosition="before"
    >
      <BirthDateSlots
        name={name}
        label={field.label}
        required={field.required}
        initialValue={initialValue}
        onValueChange={setValue}
      />
      {ageInfo ? (
        <p className="text-muted mt-1 text-xs">
          만 {ageInfo.manAge}세 (한국 나이 {ageInfo.koreanAge}세) ·{" "}
          <span
            className={
              ageInfo.isMinor
                ? "font-medium text-amber-600 dark:text-amber-400"
                : ""
            }
          >
            {ageInfo.isMinor ? "미성년자" : "성인"}
          </span>
        </p>
      ) : null}
    </Field>
  );
}
