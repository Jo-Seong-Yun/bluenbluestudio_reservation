"use server";

import { createClient } from "@/lib/supabase/server";
import { loadAvailableSlots } from "@/lib/availability/load";
import { generateReservationCode } from "@/lib/booking/code";
import { kstToInstant } from "@/lib/time";
import {
  reservationSchema,
  lookupSchema,
  phoneLookupSchema,
} from "@/lib/validation/reservation";
import { toTstzRange } from "@/lib/availability/range";

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
      dateLabel: string;
      timeLabel: string;
    };

/**
 * 예약 신청.
 *
 * 손님이 고른 시간을 서버가 다시 계산해서 확인한다 — 화면에 떠 있던
 * 목록은 몇 초 전 스냅샷이라 그사이 다른 사람이 채웠을 수 있고, 폼
 * 데이터는 브라우저에서 오는 값이라 조작될 수도 있다. 마지막 방어선은
 * reservations 테이블의 EXCLUDE 제약이지만, 그 앞에서 "운영시간 안이고
 * 아직 리드타임 안에 안 걸리는 시간인가"까지 다시 확인해야 애초에
 * 규칙에 안 맞는 시간이 걸러진다.
 */
export async function createReservation(
  productId: string,
  productName: string,
  durationMin: number,
  bufferAfterMin: number,
  _prev: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const parsed = reservationSchema.safeParse({
    date: formData.get("date"),
    time: formData.get("time"),
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    peopleCount: formData.get("peopleCount"),
    memo: formData.get("memo"),
    agreePrivacy: formData.get("agreePrivacy"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  const input = parsed.data;

  // 다시 계산해서, 지금도 정말 예약 가능한 시간인지 확인한다.
  const slots = await loadAvailableSlots({ date: input.date, productId });
  const stillAvailable = slots.some((slot) => slot.time === input.time);
  if (!stillAvailable) {
    return {
      status: "error",
      error:
        "이 시간은 예약할 수 없게 됐어요. 방금 다른 분이 예약했거나, " +
        "예약 가능 시간이 아니에요. 뒤로 가서 다시 골라주세요.",
    };
  }

  const shootStart = kstToInstant(input.date, input.time);
  const shootEnd = new Date(shootStart.getTime() + durationMin * 60_000);
  const occupiesEnd = new Date(shootEnd.getTime() + bufferAfterMin * 60_000);
  const period = toTstzRange({ start: shootStart, end: occupiesEnd });

  const supabase = await createClient();

  // 코드가 우연히 겹치면(극히 드묾) 새로 뽑아 다시 시도한다.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateReservationCode();

    const { error } = await supabase.from("reservations").insert({
      code,
      product_id: productId,
      period,
      shoot_start: shootStart.toISOString(),
      shoot_end: shootEnd.toISOString(),
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      people_count: input.peopleCount,
      memo: input.memo || null,
    });

    if (!error) {
      return {
        status: "success",
        code,
        dateLabel: input.date,
        timeLabel: input.time,
      };
    }

    if (error.code === "23505") continue; // 예약번호 충돌. 다시 시도.

    if (error.code === "23P01") {
      // EXCLUDE 제약. loadAvailableSlots 재확인 이후 그사이에 다른 손님이
      // 정확히 같은 시간을 채간, 진짜 동시 접수 충돌이다.
      return {
        status: "error",
        error: "방금 다른 분이 같은 시간에 예약했어요. 다시 골라주세요.",
      };
    }

    return { status: "error", error: `예약에 실패했습니다: ${error.message}` };
  }

  return {
    status: "error",
    error: "일시적인 오류로 예약에 실패했습니다. 다시 시도해주세요.",
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
        shootStart: string;
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
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
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
      error: "예약번호와 연락처가 일치하는 예약을 찾지 못했어요.",
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
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
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
      error: "예약번호와 연락처가 일치하는 예약을 찾지 못했어요.",
    };
  }

  if (reservation.status !== "cancelled") {
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
  shootStart: string;
  shootEnd: string;
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
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
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
      error: "이 연락처로 등록된 예약을 찾지 못했어요.",
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
