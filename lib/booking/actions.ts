"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadAvailableSlots } from "@/lib/availability/load";
import { generateReservationCode } from "@/lib/booking/code";
import { kstToInstant } from "@/lib/time";
import {
  reservationSchema,
  lookupSchema,
  phoneLookupSchema,
} from "@/lib/validation/reservation";
import {
  notifyAdminNewRequest,
  notifyCustomerCancelled,
  notifyCustomerRequested,
} from "@/lib/notifications/notify";
import { getProductName } from "@/lib/notifications/product-name";
import {
  extractReservationFormData,
  loadActiveCustomFields,
} from "@/lib/booking/custom-fields";
import {
  syncCustomerToSheet,
  syncReservationToSheet,
} from "@/lib/google-sheets/sync";
import { upsertCustomerFromReservation } from "@/lib/customers-db";
import { syncReservationToCalendar } from "@/lib/google-calendar/sync";

/**
 * 달력에서 날짜를 고른 순간 그 날의 시간 슬롯을 가져온다.
 *
 * 예전엔 날짜 칸이 곧 "그 날짜 페이지"로 가는 링크였어서 서버 컴포넌트가
 * 슬롯을 미리 계산해 내려줬다. 이제 한 화면 안에서 날짜→시간→폼이 이어지는
 * 흐름이라, 클라이언트가 날짜를 고를 때마다 이 함수를 직접 불러 그 순간의
 * 슬롯을 다시 계산한다 — 예약 신청 시점에도 loadAvailableSlots로 한 번 더
 * 확인하니(createReservation), 여기서 보여주는 목록은 어차피 스냅샷이라
 * 매번 새로 계산해도 손해볼 게 없다.
 */
export async function loadSlotsForDate(
  productId: string,
  date: string,
): Promise<string[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const slots = await loadAvailableSlots({ date, productId });
  return slots.map((slot) => slot.time);
}

export type ReservationActionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | {
      status: "success";
      code: string;
      /** 손님이 낸 희망 시간(1~3개), 접수 순서 그대로(1지망부터). */
      candidates: { dateLabel: string; timeLabel: string }[];
    };

/**
 * 예약 신청.
 *
 * 손님이 최대 3개까지 낸 희망 시간(1~3지망) 각각을 서버가 다시 계산해서
 * 확인한다 — 화면에 떠 있던 목록은 몇 초 전 스냅샷이라 그사이 다른
 * 사람이 채웠을 수 있고, 폼 데이터는 브라우저에서 오는 값이라 조작될
 * 수도 있다.
 *
 * 이전 버전과 달리 접수(requested) 자체는 어떤 시간도 점유하지 않는다
 * — 후보는 그냥 선호일 뿐이고, 관리자가 그중 하나를 골라 확정할 때만
 * 그 시간이 실제로 점유된다(EXCLUDE 제약은 confirmed 상태에서만 걸림).
 * 그래서 여기서는 "그 시간이 운영시간·리드타임 안이고 이미 확정된
 * 다른 예약과 안 겹치는가"(loadAvailableSlots)만 확인하면 되고, 접수
 * 시점의 동시 접수 충돌(23P01)은 나지 않는다 — 후보끼리는 겹쳐도 되는
 * 정책이라서다.
 */
export async function createReservation(
  productId: string,
  productName: string,
  durationMin: number,
  bufferAfterMin: number,
  bankAccount: string | null,
  notice: string | null,
  _prev: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const rawDates = formData.getAll("candidateDate");
  const rawTimes = formData.getAll("candidateTime");
  const candidates = rawDates.map((date, i) => ({
    date,
    time: rawTimes[i] ?? "",
  }));

  const parsed = reservationSchema.safeParse({
    candidates,
    agreePrivacy: formData.get("agreePrivacy"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주시기 바랍니다.",
    };
  }

  const input = parsed.data;

  const customFields = await loadActiveCustomFields(productId);
  const extracted = extractReservationFormData(customFields, formData);
  if (!extracted.ok) {
    return { status: "error", error: extracted.error };
  }
  const { special, answers: customAnswers } = extracted;

  // 후보마다 다시 계산해서, 지금도 정말 예약 가능한 시간인지 확인한다.
  // 날짜가 다를 수 있어 후보별로 loadAvailableSlots를 따로 부른다.
  const slotsByDate = await Promise.all(
    input.candidates.map((c) => loadAvailableSlots({ date: c.date, productId })),
  );
  const invalidIndex = input.candidates.findIndex(
    (c, i) => !slotsByDate[i].some((slot) => slot.time === c.time),
  );
  if (invalidIndex !== -1) {
    return {
      status: "error",
      error:
        `${invalidIndex + 1}번째로 고르신 시간은 예약할 수 없게 되었습니다. ` +
        "이미 확정되었거나 예약 가능 시간이 아닙니다. 뒤로 가서 다시 선택해 주시기 바랍니다.",
    };
  }

  const candidateTimes = input.candidates.map((c) => {
    const shootStart = kstToInstant(c.date, c.time);
    const shootEnd = new Date(shootStart.getTime() + durationMin * 60_000);
    const occupiesEnd = new Date(shootEnd.getTime() + bufferAfterMin * 60_000);
    return { date: c.date, time: c.time, shootStart, occupiesEnd };
  });

  const supabase = await createClient();

  // 코드가 우연히 겹치면(극히 드묾) 새로 뽑아 다시 시도한다.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateReservationCode();

    const { data, error } = await supabase.rpc(
      "create_reservation_with_candidates",
      {
        p_code: code,
        p_product_id: productId,
        p_customer_name: special.customerName,
        p_customer_phone: special.customerPhone,
        p_customer_email: special.customerEmail,
        p_gender: special.gender,
        p_birth_date: special.birthDate,
        p_candidate_starts: candidateTimes.map((c) => c.shootStart.toISOString()),
        p_candidate_ends: candidateTimes.map((c) => c.occupiesEnd.toISOString()),
      },
    );

    if (!error) {
      const reservationId = data?.id ?? "";

      if (customAnswers.length > 0) {
        await supabase.from("reservation_answers").insert(
          customAnswers.map((answer) => ({
            reservation_id: reservationId,
            field_id: answer.fieldId,
            value: answer.value,
          })),
        );
      }

      const reservationNotice = {
        reservationId,
        customerName: special.customerName,
        customerPhone: special.customerPhone,
        customerEmail: special.customerEmail,
        productName,
        code,
        candidateTimes: candidateTimes.map((c) => c.shootStart),
      };

      const { data: settingsRow } = await supabase
        .from("settings")
        .select("admin_notify_phone, admin_notify_email")
        .eq("id", 1)
        .single();

      // SMS·이메일 발송은 몇 초씩 걸릴 수 있다(특히 Gmail SMTP). 손님이
      // "예약 신청" 버튼을 누른 뒤 그 발송이 끝날 때까지 기다리게 하면
      // 안 되니, 응답은 먼저 보내고 발송은 after()로 응답 뒤에 진행한다
      // (Vercel이 응답 후에도 이 작업이 끝날 때까지 실행을 유지해준다).
      after(async () => {
        // 고객DB부터 먼저 채워야, 같이 도는 시트 동기화가 방금 채운
        // 값을 곧바로 읽을 수 있다(동시에 돌리면 시트 쪽이 더 먼저
        // 끝나 아직 안 채워진 값을 읽어갈 수 있다).
        await upsertCustomerFromReservation({
          phone: special.customerPhone,
          name: special.customerName,
          gender: special.gender,
          birthDate: special.birthDate,
          email: special.customerEmail,
        });
        await Promise.all([
          notifyCustomerRequested({
            ...reservationNotice,
            bankAccount,
            notice,
          }),
          notifyAdminNewRequest({
            ...reservationNotice,
            adminPhone: settingsRow?.admin_notify_phone ?? null,
            adminEmail: settingsRow?.admin_notify_email ?? null,
          }),
          syncReservationToSheet(reservationId),
          syncCustomerToSheet(special.customerPhone),
          syncReservationToCalendar(reservationId),
        ]);
      });

      return {
        status: "success",
        code,
        candidates: input.candidates.map((c) => ({
          dateLabel: c.date,
          timeLabel: c.time,
        })),
      };
    }

    if (error.code === "23505") continue; // 예약번호 충돌. 다시 시도.

    return { status: "error", error: `예약에 실패했습니다: ${error.message}` };
  }

  return {
    status: "error",
    error: "일시적인 오류로 예약에 실패했습니다. 다시 시도해 주시기 바랍니다.",
  };
}

export type LookupState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | {
      status: "found";
      reservation: {
        code: string;
        status: string;
        /** 아직 확정 전(후보만 낸 상태)이면 null. */
        shootStart: string | null;
        customerName: string;
      };
      canCancel: boolean;
    };

export async function lookupReservation(
  _prev: LookupState,
  formData: FormData,
): Promise<LookupState> {
  const parsed = lookupSchema.safeParse({
    code: formData.get("code"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주시기 바랍니다.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lookup_reservation", {
    p_code: parsed.data.code,
    p_phone: parsed.data.phone,
  });

  if (error) {
    return { status: "error", error: `조회에 실패했습니다: ${error.message}` };
  }

  const reservation = data?.[0];
  if (!reservation) {
    return {
      status: "error",
      error: "예약번호와 연락처가 일치하는 예약을 찾지 못했습니다.",
    };
  }

  return {
    status: "found",
    reservation: {
      code: reservation.code,
      status: reservation.status,
      shootStart: reservation.shoot_start,
      customerName: reservation.customer_name,
    },
    canCancel:
      reservation.status === "requested" || reservation.status === "confirmed",
  };
}

export async function cancelReservation(
  _prev: LookupState,
  formData: FormData,
): Promise<LookupState> {
  const parsed = lookupSchema.safeParse({
    code: formData.get("code"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주시기 바랍니다.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_reservation", {
    p_code: parsed.data.code,
    p_phone: parsed.data.phone,
  });

  if (error) {
    return { status: "error", error: `취소에 실패했습니다: ${error.message}` };
  }

  const reservation = data?.[0];
  if (!reservation) {
    return {
      status: "error",
      error: "예약번호와 연락처가 일치하는 예약을 찾지 못했습니다.",
    };
  }

  if (reservation.status === "cancelled") {
    const productName = await getProductName(reservation.product_id);
    after(async () => {
      await upsertCustomerFromReservation({
        phone: reservation.customer_phone,
        name: reservation.customer_name,
        gender: reservation.gender,
        birthDate: reservation.birth_date,
        email: reservation.customer_email,
      });
      await Promise.all([
        notifyCustomerCancelled({
          reservationId: reservation.id,
          customerName: reservation.customer_name,
          customerPhone: reservation.customer_phone,
          customerEmail: reservation.customer_email,
          productName,
          shootStart: reservation.shoot_start ? new Date(reservation.shoot_start) : null,
          code: reservation.code,
        }),
        syncReservationToSheet(reservation.id),
        syncCustomerToSheet(reservation.customer_phone),
        syncReservationToCalendar(reservation.id),
      ]);
    });
  }

  return {
    status: "found",
    reservation: {
      code: reservation.code,
      status: reservation.status,
      shootStart: reservation.shoot_start,
      customerName: reservation.customer_name,
    },
    canCancel: false,
  };
}

export type PhoneReservation = {
  code: string;
  status: string;
  /** 아직 확정 전(후보만 낸 상태)이면 둘 다 null. */
  shootStart: string | null;
  shootEnd: string | null;
  customerName: string;
  productName: string;
};

export type PhoneLookupState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "found"; phone: string; reservations: PhoneReservation[] };

/** 전화번호 하나로 그 번호에 걸린 예약을 전부 찾는다. */
export async function lookupReservationsByPhone(
  _prev: PhoneLookupState,
  formData: FormData,
): Promise<PhoneLookupState> {
  const parsed = phoneLookupSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주시기 바랍니다.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lookup_reservations_by_phone", {
    p_phone: parsed.data.phone,
  });

  if (error) {
    return { status: "error", error: `조회에 실패했습니다: ${error.message}` };
  }

  if (!data || data.length === 0) {
    return {
      status: "error",
      error: "이 연락처로 등록된 예약을 찾지 못했습니다.",
    };
  }

  return {
    status: "found",
    phone: parsed.data.phone,
    reservations: data.map((row) => ({
      code: row.code,
      status: row.status,
      shootStart: row.shoot_start,
      shootEnd: row.shoot_end,
      customerName: row.customer_name,
      productName: row.product_name,
    })),
  };
}

/**
 * 상품별 "링크 진입 횟수" 통계용 조회 기록. 상품 상세 페이지가 서버에서
 * 렌더링될 때가 아니라, 그 화면이 브라우저에 실제로 뜬 시점에(클라이언트
 * 컴포넌트가 마운트될 때) 호출한다 — 이 라우트는 동적 렌더링 대상인데,
 * 상품 목록 페이지에 있는 로딩 경계(app/booking/loading.tsx) 때문에
 * 목록의 링크가 뷰포트에 들어오는 순간 "로딩 화면까지만" 미리 가져가고
 * 실제 내용(과 그 안의 부수효과)은 클릭한 뒤에야 스트리밍되는 경우가
 * 있다. 서버 컴포넌트 쪽에서 기록하면 이런 타이밍에 따라 언제 찍히는지
 * (또는 찍히긴 하는지) 애매해지므로, 상품 목록에서 클릭해 들어오든 공유된
 * 링크로 바로 들어오든 상관없이 "화면이 실제로 떴다"는 확실한 신호인
 * 마운트 시점에 클라이언트에서 직접 부른다.
 */
export async function logProductView(productId: string) {
  const supabase = await createClient();
  await supabase.from("product_views").insert({ product_id: productId });
}

/**
 * "상품 목록 진입 수 → 상품 상세 진입 수 → 실제 예약 수" 퍼널의 첫 단계용
 * 기록. logProductView와 같은 이유로(로딩 경계 때문에 서버 렌더링 시점이
 * 애매하다) 목록 화면이 브라우저에 실제로 뜬 시점에 클라이언트에서 부른다.
 */
export async function logBookingListView() {
  const supabase = await createClient();
  await supabase.from("booking_list_views").insert({});
}
