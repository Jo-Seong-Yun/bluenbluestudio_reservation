"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { productSchema, toSlug } from "@/lib/validation/product";
import {
  manualReservationSchema,
  phoneField,
  rescheduleReservationSchema,
} from "@/lib/validation/reservation";
import { addDays, diffDays, kstToInstant, type DateString } from "@/lib/time";
import { isReservationTimeAvailable } from "@/lib/availability/load";
import { toTstzRange } from "@/lib/availability/range";
import { generateReservationCode } from "@/lib/booking/code";
import {
  notifyCustomerCancelled,
  notifyCustomerConfirmed,
  notifyCustomerRescheduled,
} from "@/lib/notifications/notify";
import { sanitizeDescriptionHtml } from "@/lib/sanitize-description";
import { PRODUCT_TAG_COLORS } from "@/lib/product-tag-colors";
import {
  APPLICANT_FIELD_LABELS,
  LOCKED_FIELD_TYPES,
  SNS_CONSENT_FIELD_LABEL,
  SPECIAL_FIELD_TYPES,
  fieldFormName,
  selectedLabelsFromAnswers,
  selectedPricedOptions,
  type CustomField,
} from "@/lib/booking/custom-fields-shared";
import {
  EMAIL_TEMPLATE_PURPOSES,
  type EmailTemplatePurpose,
} from "@/lib/notifications/email-templates-shared";
import {
  parseRecordSheetRows,
  type RecordSheetRow,
} from "@/lib/record-sheet/schema";
import {
  backfillAllToSheet,
  markReservationDeletedInSheet,
  syncAllCustomersToSheet,
  syncAllReservationsToSheet,
  syncCustomerToSheet,
  syncReservationToSheet,
} from "@/lib/google-sheets/sync";
import { upsertCustomerFromReservation } from "@/lib/customers-db";
import {
  backfillAllToCalendar,
  deleteReservationFromCalendar,
  syncReservationToCalendar,
} from "@/lib/google-calendar/sync";

/**
 * 관리자 화면의 데이터 변경.
 *
 * 서버 액션은 화면을 거치지 않고 POST로 직접 호출될 수 있다.
 * 그래서 함수마다 첫 줄에서 requireAdmin()으로 로그인을 확인한다.
 * (Next.js 문서의 경고: "Always verify authentication and authorization
 *  inside every Server Function")
 */

export type ActionState = { error?: string } | null;

export async function signIn(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해 주시기 바랍니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // "이메일/비번 틀림"과 "이메일 인증 안 됨"은 구분해서 보여준다.
    // 관리자 계정이 하나뿐인 사이트라 계정 추측 방지보다, 원인을 알 수
    // 없어 사장님이 막히는 쪽이 더 큰 문제다.
    if (error.code === "email_not_confirmed") {
      return {
        error:
          "이 계정은 아직 이메일 인증이 완료되지 않았습니다. Supabase 대시보드 " +
          "Authentication → Users 에서 해당 계정을 열고 이메일을 " +
          "확인(confirm) 상태로 바꿔 주시기 바랍니다.",
      };
    }
    return { error: "이메일 또는 비밀번호가 맞지 않습니다." };
  }

  redirect("/admin/products");
}

export async function signOut() {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/**
 * 새 상품을 만들면 문항편집 화면에 기본으로 생겨 있는 5개 문항.
 * 손님용 신청서에는 더 이상 이름/연락처/이메일/성별/생년월일이
 * 하드코딩돼 있지 않고, 이 문항들 그 자체가 신청서를 이룬다 —
 * 그래서 상품을 만드는 순간 미리 만들어 둔다. 관리자가 라벨을
 * 바꾸거나 지울 수 있다(supabase/migrations/20260909000500_
 * custom_fields_special_types.sql이 기존 상품에도 같은 5개를
 * 소급 적용한다).
 *
 * 이름·연락처·이메일·생년월일은 예약 조회·나이 계산·알림 발송이 그
 * 답을 reservations의 전용 컬럼에서 그대로 읽어 쓰기 때문에 답변 종류
 * 자체(lib/booking/custom-fields-shared.ts의 SPECIAL_FIELD_TYPES)를
 * 고정해 둔다. 성별은 그런 의존이 없는 단순 표시용 정보라 굳이 그렇게
 * 미리 굳혀 둘 이유가 없다 — 문항 자체는 기본으로 만들어 두되
 * (single_choice, 옵션 남성/여성) 다른 일반 문항과 똑같이 답변 종류도
 * 자유롭게 바꿀 수 있게 둔다.
 */
const DEFAULT_CUSTOM_FIELDS = [
  { label: "이름", type: "name", required: true, options: null },
  { label: "연락처", type: "phone", required: true, options: null },
  { label: "이메일", type: "email", required: false, options: null },
  {
    label: "성별",
    type: "single_choice",
    required: true,
    options: ["남성", "여성"],
  },
  { label: "생년월일", type: "birth_date", required: true, options: null },
  // 아래 다섯은 촬영 기록표(관리자가 예약 정보로 자동 채우는 서명지,
  // lib/record-sheet)를 위한 문항이다 — 배우가 미성년자이거나 대표
  // 예약자가 따로 있을 때만 쓰는 칸이라 필수는 아니다. SNS 동의만
  // 서명지에 반드시 있어야 하는 항목이라 필수로 둔다.
  {
    label: APPLICANT_FIELD_LABELS.name,
    type: "short_text",
    required: false,
    options: null,
  },
  {
    label: APPLICANT_FIELD_LABELS.birthDate,
    type: "short_text",
    required: false,
    options: null,
  },
  {
    label: APPLICANT_FIELD_LABELS.gender,
    type: "single_choice",
    required: false,
    options: ["남성", "여성"],
  },
  {
    label: APPLICANT_FIELD_LABELS.phone,
    type: "short_text",
    required: false,
    options: null,
  },
  {
    label: APPLICANT_FIELD_LABELS.relation,
    type: "single_choice",
    required: false,
    options: ["보호자", "팀원", "기타"],
  },
  {
    label: SNS_CONSENT_FIELD_LABEL,
    type: "single_choice",
    required: true,
    options: ["동의", "비동의"],
  },
] as const;

async function seedDefaultCustomFields(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
) {
  await supabase.from("custom_fields").insert(
    DEFAULT_CUSTOM_FIELDS.map((field, index) => ({
      product_id: productId,
      label: field.label,
      type: field.type,
      required: field.required,
      options: field.options ? [...field.options] : null,
      sort_order: index,
    })),
  );
}

/**
 * "상품 추가" 버튼을 누르면 곧바로 빈 상품을 하나 만들고 그 상품의 수정
 * 화면으로 보낸다. 예전엔 이름 등 기본 정보만 입력하는 화면이 따로
 * 있었고, 거길 저장해야만 상세 설명·신청서 문항까지 같이 보이는 수정
 * 화면으로 넘어갔다 — 이제는 처음부터 그 화면에서 편집하도록, 상세
 * 설명 에디터와 신청서 문항 관리가 필요로 하는 상품 id를 미리 만들어
 * 둔다. saveProduct의 새 상품 저장 분기와 똑같이 기본 문항 5개도 바로
 * 심는다.
 */
const DRAFT_PRODUCT_NAME = "새 상품";

export async function createDraftProduct() {
  await requireAdmin();

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("products")
    .insert({
      name: DRAFT_PRODUCT_NAME,
      slug: toSlug(DRAFT_PRODUCT_NAME),
      duration_min: 60,
      buffer_after_min: 0,
      price: 0,
      is_published: false,
    })
    .select("id")
    .single();

  if (error || !created) redirect("/admin/products");

  await seedDefaultCustomFields(supabase, created.id);

  revalidatePath("/admin/products");
  redirect(`/admin/products/${created.id}`);
}

/**
 * "저장 안 하고 나가기"를 눌렀을 때 부른다. createDraftProduct가 만든
 * 상품이 그 뒤로 정말 아무것도 안 건드려진 채(기본값 그대로, 기본
 * 문항 5개도 그대로) 그대로라면 — 즉 손님에게 보여줄 것도, 사장님이
 * 일부러 만든 내용도 전혀 없다면 — 상품관리 목록에 빈 "새 상품" 블럭만
 * 남기지 않도록 통째로 지운다. 설명을 저장했거나 문항을 건드렸거나
 * 기본정보 중 하나라도 실제로 저장된 값이 있으면(직접 저장 버튼을
 * 눌러야만 반영되니, 여기 있다는 건 곧 사장님이 뭔가 의도적으로 저장한
 * 것) 손댄 게 있는 것으로 보고 그대로 둔다.
 *
 * custom_fields.product_id는 on delete cascade라 상품만 지우면
 * 문항도 같이 사라진다(supabase/migrations/20260909000300).
 */
export async function discardDraftProduct(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!product) return;

  const isPristine =
    product.name === DRAFT_PRODUCT_NAME &&
    product.duration_min === 60 &&
    product.buffer_after_min === 0 &&
    product.price === 0 &&
    product.sale_price === null &&
    product.is_published === false &&
    !product.summary &&
    !product.description &&
    !product.cover_image &&
    (product.gallery ?? []).length === 0 &&
    product.max_people === null &&
    !product.tag_color;
  if (!isPristine) return;

  const { data: fields } = await supabase
    .from("custom_fields")
    .select("label, type, required, active, options")
    .eq("product_id", id);
  const fieldsMatchDefault =
    (fields ?? []).length === DEFAULT_CUSTOM_FIELDS.length &&
    DEFAULT_CUSTOM_FIELDS.every((expected) =>
      (fields ?? []).some(
        (field) =>
          field.label === expected.label &&
          field.type === expected.type &&
          field.required === expected.required &&
          field.active === true &&
          JSON.stringify(field.options ?? null) ===
            JSON.stringify(expected.options),
      ),
    );
  if (!fieldsMatchDefault) return;

  await supabase.from("products").delete().eq("id", id);
  revalidatePath("/admin/products");
}

export async function saveProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    durationMin: formData.get("durationMin"),
    bufferAfterMin: formData.get("bufferAfterMin"),
    price: formData.get("price"),
    salePrice: formData.get("salePrice"),
    maxPeople: formData.get("maxPeople"),
    summary: formData.get("summary"),
    description: formData.get("description"),
    deliveryNote: formData.get("deliveryNote"),
    isPublished: formData.get("isPublished") === "on",
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주시기 바랍니다.",
    };
  }

  const input = parsed.data;
  const id = String(formData.get("id") ?? "");
  const coverImage = String(formData.get("coverImage") ?? "") || null;
  const gallery = formData
    .getAll("gallery")
    .map(String)
    .filter((path) => path.length > 0);

  // 정해둔 팔레트 밖의 값(조작되거나 옛날 값)이 오면 그냥 태그 없음으로 —
  // DB 체크 제약에 걸려 저장 자체가 실패하게 두지 않는다.
  const tagColorRaw = String(formData.get("tagColor") ?? "");
  const tagColor =
    PRODUCT_TAG_COLORS.find((color) => color.key === tagColorRaw)?.key ?? null;

  const row = {
    name: input.name,
    slug: input.slug || toSlug(input.name),
    duration_min: input.durationMin,
    buffer_after_min: input.bufferAfterMin,
    price: input.price,
    sale_price: input.salePrice,
    max_people: input.maxPeople,
    summary: input.summary || null,
    description: input.description
      ? sanitizeDescriptionHtml(input.description)
      : null,
    delivery_note: input.deliveryNote || null,
    cover_image: coverImage,
    gallery,
    is_published: input.isPublished,
    tag_color: tagColor,
  };

  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) {
      if (error.code === "23505") {
        return {
          error: `주소 "${row.slug}" 는 이미 다른 상품이 쓰고 있습니다.`,
        };
      }
      return { error: `저장하지 못했습니다: ${error.message}` };
    }
  } else {
    const { data: created, error } = await supabase
      .from("products")
      .insert(row)
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") {
        return {
          error: `주소 "${row.slug}" 는 이미 다른 상품이 쓰고 있습니다.`,
        };
      }
      return { error: `저장하지 못했습니다: ${error.message}` };
    }
    if (created) await seedDefaultCustomFields(supabase, created.id);
  }

  revalidatePath("/admin/products");
  revalidatePath("/booking/[slug]", "page");
  redirect("/admin/products");
}

export async function togglePublished(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const next = formData.get("isPublished") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("products").update({ is_published: next }).eq("id", id);

  revalidatePath("/admin/products");
}

/**
 * 목록 카드에서 곧바로 태그 색만 바꾼다. 상품 수정 화면(saveProduct)에
 * 들어가지 않고도 색만 빠르게 바꿀 수 있게 하기 위한 별도 액션 —
 * 다른 상품 정보는 건드리지 않는다.
 */
export async function setProductTagColor(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const tagColorRaw = String(formData.get("tagColor") ?? "");
  const tagColor =
    PRODUCT_TAG_COLORS.find((color) => color.key === tagColorRaw)?.key ?? null;

  const supabase = await createClient();
  await supabase.from("products").update({ tag_color: tagColor }).eq("id", id);

  revalidatePath("/admin/products");
}

/**
 * 상품 복제. 상품 정보와 신청서 문항(custom_fields)을 전부 그대로
 * 복사해 새 상품을 하나 더 만든다 — 비슷한 상품을 매번 처음부터 다시
 * 만들 필요 없이, 복제한 뒤 몇 군데만 고쳐 쓰라는 용도다. 제목만
 * "-복사본"을 붙여 원본과 구분한다. 되돌릴 필요가 생기면 그냥 지우면
 * 되는 비파괴적 동작이라 삭제와 달리 확인 절차를 두지 않는다.
 */
export async function duplicateProduct(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();

  const { data: source } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!source) return;

  const name = `${source.name}-복사본`;
  const baseSlug = toSlug(name);

  let created: { id: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug =
      attempt === 0
        ? baseSlug
        : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

    const { data, error } = await supabase
      .from("products")
      .insert({
        name,
        slug,
        duration_min: source.duration_min,
        buffer_after_min: source.buffer_after_min,
        price: source.price,
        sale_price: source.sale_price,
        max_people: source.max_people,
        summary: source.summary,
        description: source.description,
        cover_image: source.cover_image,
        gallery: source.gallery,
        is_published: source.is_published,
        tag_color: source.tag_color,
      })
      .select("id")
      .single();

    if (!error) {
      created = data;
      break;
    }
    if (error.code !== "23505") break; // 주소(slug) 충돌이 아니면 재시도해도 소용없다.
  }

  if (!created) return;

  const { data: fields } = await supabase
    .from("custom_fields")
    .select("label, type, options, description, required, active, sort_order")
    .eq("product_id", id)
    .order("sort_order");

  if (fields && fields.length > 0) {
    await supabase
      .from("custom_fields")
      .insert(fields.map((field) => ({ ...field, product_id: created.id })));
  }

  revalidatePath("/admin/products");
}

export type ProductDeleteState = { error?: string; success?: boolean } | null;

/**
 * 상품 완전 삭제. products(id)를 참조하는 reservations.product_id에
 * cascade가 없어서, 예약 내역이 있는 상품을 지우려 하면 DB가 외래키
 * 위반(23503)으로 막는다 — 그 경우를 알아보기 쉬운 안내로 바꿔 보여준다.
 * 잘못 만들었거나 예약이 한 번도 없었던 상품만 지울 수 있는 셈이라,
 * 예약이 있는 상품은 비공개 전환으로 유도한다.
 */
export async function deleteProduct(
  _prev: ProductDeleteState,
  formData: FormData,
): Promise<ProductDeleteState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "상품을 찾을 수 없습니다." };

  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "이 상품으로 예약된 내역이 있어 삭제할 수 없습니다. 대신 비공개로 전환해 주시기 바랍니다.",
      };
    }
    return { error: `삭제하지 못했습니다: ${error.message}` };
  }

  revalidatePath("/admin/products");
  return { success: true };
}

const RESERVATION_STATUSES = [
  "requested",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;

export async function updateReservationStatus(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const rawStatus = String(formData.get("status") ?? "");
  const status = RESERVATION_STATUSES.find((value) => value === rawStatus);
  if (!id || !status) return;

  const supabase = await createClient();

  // 갱신 전에 미리 읽어둔다 — update 자체는 status 컬럼만 건드리니
  // 갱신 뒤에도 이 정보가 사라지지 않지만, 어차피 한 번 더 조회할
  // 이유가 없다. "확정"으로 바꾸려는 경우엔 shoot_start가 있는지
  // 판단하는 데도 이 값이 필요하고(바로 아래), 그 외의 모든 상태
  // 변경도 구글 시트 고객DB의 방문 집계를 다시 하려면 연락처가
  // 필요해 항상 읽는다.
  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      "code, customer_name, customer_phone, customer_email, gender, birth_date, shoot_start, product_id",
    )
    .eq("id", id)
    .single();
  if (!reservation) return;

  if (status === "confirmed") {
    // 아직 후보만 낸 채 시간이 정해지지 않은 예약(shoot_start가 없음)은
    // 이 버튼이 아니라 후보 중 하나를 골라 confirmReservationCandidate로
    // 확정해야 한다 — 그런 예약이면 아무것도 하지 않고 조용히 무시한다.
    // 반대로 한 번 확정됐다가 취소·완료·노쇼로 바뀐 예약은 그때 정해진
    // shoot_start·period가 그대로 남아있어, 이 버튼으로 다시 확정할 수
    // 있다(취소 → 재확정 등).
    if (!reservation?.shoot_start) return;
  }

  const { error } = await supabase
    .from("reservations")
    .update({ status })
    .eq("id", id);

  // EXCLUDE 제약(23P01): 취소됐던 예약을 다시 확정하려는데, 그사이 같은
  // 시간이 다른 예약으로 먼저 확정된 경우. 상태가 안 바뀌었으니 알림도
  // 보내지 않고 조용히 멈춘다 — 관리자가 다른 시간을 다시 확인해야 한다.
  if (error) return;

  revalidatePath("/admin/reservations");

  // 구글 시트 백업(예약 탭 + 고객DB 탭의 방문 집계)은 확정/취소뿐 아니라
  // 완료·노쇼로 바뀔 때도 남겨야 하니, 알림 여부와 무관하게 항상 부른다.
  after(async () => {
    await upsertCustomerFromReservation({
      phone: reservation.customer_phone,
      name: reservation.customer_name,
      gender: reservation.gender,
      birthDate: reservation.birth_date,
      email: reservation.customer_email,
    });
    await Promise.all([
      syncReservationToSheet(id),
      syncCustomerToSheet(reservation.customer_phone),
      syncReservationToCalendar(id),
    ]);
  });

  // 손님에게 알리는 건 확정/취소로 바뀔 때만(기존 동작 그대로) — 완료·
  // 노쇼는 별도 알림이 없다.
  const notifiable = status === "confirmed" || status === "cancelled";
  if (notifiable) {
    const { data: product } = await supabase
      .from("products")
      .select("name")
      .eq("id", reservation.product_id)
      .single();

    const base = {
      reservationId: id,
      customerName: reservation.customer_name,
      customerPhone: reservation.customer_phone,
      customerEmail: reservation.customer_email,
      productName: product?.name ?? "촬영",
      code: reservation.code,
    };

    // 알림 발송(SMS·이메일)은 응답을 붙잡지 않는다 — 관리자가 상태를
    // 바꾸는 버튼을 눌렀을 때 발송이 끝날 때까지 화면이 멈춰 있으면
    // 안 되니, after()로 응답 뒤에 보낸다.
    //
    // confirmed 경로는 위에서 이미 "후보 있는 예약이면 여기 안 옴"을
    // 보장했으므로 shoot_start가 항상 있다(레거시 예약만 도달).
    after(() =>
      status === "confirmed"
        ? notifyCustomerConfirmed({
            ...base,
            shootStart: new Date(reservation.shoot_start!),
          })
        : notifyCustomerCancelled({
            ...base,
            shootStart: reservation.shoot_start
              ? new Date(reservation.shoot_start)
              : null,
          }),
    );
  }
}

/**
 * 관리자가 손님의 후보(1~3지망) 중 하나를 골라 확정한다. 이 순간에야
 * 비로소 그 시간이 실제로 점유된다(EXCLUDE 제약이 confirmed 상태에서만
 * 걸리므로, 그사이 다른 예약이 같은 시간을 먼저 확정했으면 여기서
 * 23P01로 걸린다). 선택 안 된 나머지 후보는 지우지 않고
 * reservation_candidates에 이력으로 남긴다 — confirmed_candidate_rank로
 * 어느 게 선택됐는지 구분한다.
 */
export async function confirmReservationCandidate(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const rank = Number(formData.get("rank") ?? "");
  if (!id || !Number.isInteger(rank) || rank < 1 || rank > 3) {
    return { error: "잘못된 요청입니다." };
  }

  const supabase = await createClient();

  const { data: candidate } = await supabase
    .from("reservation_candidates")
    .select("shoot_start, shoot_end")
    .eq("reservation_id", id)
    .eq("rank", rank)
    .maybeSingle();

  if (!candidate) {
    return { error: "그 후보를 찾을 수 없습니다." };
  }

  const period = toTstzRange({
    start: new Date(candidate.shoot_start),
    end: new Date(candidate.shoot_end),
  });

  const { data: reservation, error } = await supabase
    .from("reservations")
    .update({
      status: "confirmed",
      period,
      shoot_start: candidate.shoot_start,
      shoot_end: candidate.shoot_end,
      confirmed_candidate_rank: rank,
    })
    .eq("id", id)
    .select(
      "code, customer_name, customer_phone, customer_email, gender, birth_date, product_id",
    )
    .single();

  revalidatePath("/admin/reservations");

  if (error) {
    // EXCLUDE 제약(23P01): 이 시간이 그사이 다른 예약으로 먼저 확정됐다.
    return {
      error:
        error.code === "23P01"
          ? "이 시간은 이미 다른 예약으로 확정되었습니다. 다른 후보를 선택해 주시기 바랍니다."
          : `확정에 실패했습니다: ${error.message}`,
    };
  }
  if (!reservation) return { error: "확정에 실패했습니다." };

  const { data: product } = await supabase
    .from("products")
    .select("name")
    .eq("id", reservation.product_id)
    .single();

  after(async () => {
    await upsertCustomerFromReservation({
      phone: reservation.customer_phone,
      name: reservation.customer_name,
      gender: reservation.gender,
      birthDate: reservation.birth_date,
      email: reservation.customer_email,
    });
    await Promise.all([
      notifyCustomerConfirmed({
        reservationId: id,
        customerName: reservation.customer_name,
        customerPhone: reservation.customer_phone,
        customerEmail: reservation.customer_email,
        productName: product?.name ?? "촬영",
        shootStart: new Date(candidate.shoot_start),
        code: reservation.code,
      }),
      syncReservationToSheet(id),
      syncCustomerToSheet(reservation.customer_phone),
      syncReservationToCalendar(id),
    ]);
  });

  return null;
}

export async function saveAdminMemo(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const adminMemo = String(formData.get("adminMemo") ?? "").trim();

  const supabase = await createClient();
  await supabase
    .from("reservations")
    .update({ admin_memo: adminMemo || null })
    .eq("id", id);

  revalidatePath("/admin/reservations");
  after(() => syncReservationToSheet(id));
}

/**
 * 예약 한 건의 촬영 원가(대관료, 소품, 외주 등). 매출 관리 화면의
 * 순이익 계산에 쓴다. 빈 값으로 저장하면 null(=원가 없음)로 되돌아간다
 * — "0원"과 "아직 입력 안 함"을 구분해야 나중에 빠뜨린 건을 알아볼 수 있다.
 */
export async function saveReservationCost(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const raw = String(formData.get("cost") ?? "").trim();
  const cost = raw === "" ? null : Number(raw);
  if (cost !== null && (!Number.isFinite(cost) || cost < 0)) return;
  const costMemo = String(formData.get("costMemo") ?? "").trim();

  const supabase = await createClient();
  await supabase
    .from("reservations")
    .update({ cost, cost_memo: costMemo || null })
    .eq("id", id);

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/revenue");
  after(() => syncReservationToSheet(id));
}

/** 촬영과 무관한 월별 지출(임대료, 장비, 마케팅 등) 한 항목 추가.
 * "기타지출"(kind="other")과 "고정지출"(kind="fixed")은 구성이
 * 완전히 같아서 같은 액션 하나로 둘 다 받는다 — 어느 쪽인지는 폼의
 * 숨은 kind 필드로 구분한다. 어느 달 집계에 들어갈지(month)는
 * 입력받은 일자(date)에서 그대로 뽑아낸다 — 따로 입력받지 않는다. */
export async function addMonthlyExpense(formData: FormData) {
  await requireAdmin();

  const kind = String(formData.get("kind") ?? "other");
  const date = String(formData.get("date") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const memo = String(formData.get("memo") ?? "").trim();

  if (kind !== "other" && kind !== "fixed") return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  if (!label) return;
  if (!Number.isFinite(amount) || amount < 0) return;

  const month = date.slice(0, 7);

  const supabase = await createClient();
  await supabase
    .from("monthly_expenses")
    .insert({ month, date, label, amount, memo: memo || null, kind });

  revalidatePath("/admin/revenue");
}

export async function deleteMonthlyExpense(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("monthly_expenses").delete().eq("id", id);

  revalidatePath("/admin/revenue");
}

/**
 * 예약 완전 삭제.
 *
 * "취소"와 다르다 — 행 자체를 지운다. 되돌릴 수 없고, 손님도 예약
 * 조회에서 더는 찾을 수 없게 된다. 그래서 이 액션 자체에는 확인 절차를
 * 두지 않는다 — "정말 삭제하시겠습니까?" → "삭제"를 직접 입력해야
 * 눌리는 2중 확인은 실수 방지가 목적이라 화면(delete-reservation-
 * button.tsx)에서 다루고, 여기서는 그 확인을 통과해 넘어온 요청을
 * 그대로 처리한다.
 */
export async function deleteReservation(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const month = String(formData.get("month") ?? "");
  const date = String(formData.get("date") ?? "");

  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from("reservations")
    .delete()
    .eq("id", id)
    .select("code, customer_phone, google_calendar_event_id")
    .maybeSingle();
  if (error) return;

  revalidatePath("/admin/reservations");
  if (deleted) {
    after(() =>
      Promise.all([
        markReservationDeletedInSheet(deleted.code),
        // 방문 집계(고객DB)는 삭제된 예약을 뺀 나머지로 다시 계산한다.
        syncCustomerToSheet(deleted.customer_phone),
        deleteReservationFromCalendar(deleted.google_calendar_event_id),
      ]),
    );
  }

  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (date) params.set("date", date);
  redirect(`/admin/reservations?${params.toString()}`);
}

/**
 * 스케줄 관리 (Phase 5).
 *
 * weekly_hours / date_overrides / blocks 세 테이블을 다룬다.
 * 계산 로직(무엇이 열려 있는가)은 항상 lib/availability에만 두고,
 * 여기 액션들은 그 테이블의 행을 쓰는 일만 한다.
 *
 * redirect()를 쓰지 않는다 — 다른 가벼운 토글 액션들(togglePublished,
 * setProductTagColor 등)과 같은 이유다. 지금 보고 있는 페이지에 그대로 남아
 * revalidatePath로만 갱신해야, 매 클릭마다 페이지 전체를 다시 내비게이션하며
 * 5개 쿼리를 처음부터 다시 부르는 지연이 없다. 특히 주간 캘린더는 한 칸
 * 클릭마다 이 액션이 불리므로 여기서의 딜레이가 그대로 체감된다.
 */

/**
 * 요일별 기본 운영시간 저장. 한 요일에는 항상 구간을 하나만 둔다
 * (점심시간을 나눠 쉬는 등은 이 화면의 대상이 아니다 — 필요하면
 * 그 시간만 개별 차단하면 된다). 그래서 저장할 때마다 그 요일의
 * 기존 행을 지우고 새로 넣는다.
 */
export async function saveWeeklyHours(formData: FormData) {
  await requireAdmin();

  const weekday = Number(formData.get("weekday"));
  const closed = formData.get("closed") === "on";
  const openTime = String(formData.get("openTime") ?? "");
  const closeTime = String(formData.get("closeTime") ?? "");
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return;

  const supabase = await createClient();
  await supabase.from("weekly_hours").delete().eq("weekday", weekday);
  if (!closed && openTime && closeTime) {
    await supabase
      .from("weekly_hours")
      .insert({ weekday, open_time: openTime, close_time: closeTime });
  }

  revalidatePath("/admin/schedule");
}

/**
 * 주간 캘린더의 칸 하나(1시간) 클릭 토글.
 *
 * "정확히 겹치는 차단이 있으면 지우고, 없으면 만든다"는 판단과 실행을
 * DB 함수(toggle_block_hour, migrations/20260904000400) 안에서 한 번에
 * 처리한다. 예전엔 select로 확인한 뒤 delete/insert를 또 불렀는데,
 * 클릭 한 번마다 Vercel↔Supabase 왕복이 두 번 생겨 그만큼 굼떴다.
 */
export async function toggleBlockHour(formData: FormData) {
  await requireAdmin();

  const date = String(formData.get("date") ?? "");
  const hour = String(formData.get("hour") ?? "");
  if (!date || !hour) return;

  const start = kstToInstant(date, hour);
  const end = new Date(start.getTime() + 60 * 60_000);

  const supabase = await createClient();
  await supabase.rpc("toggle_block_hour", {
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });

  revalidatePath("/admin/schedule");
}

/**
 * 날짜 단위 휴무/특별 운영시간을 여러 날에 한 번에 등록.
 * 시험기간처럼 "12/1 ~ 12/10 통째로 휴무" 같은 걸 한 번에 처리하려고
 * 범위로 받아 날짜 수만큼 행을 만든다. date_overrides.date가
 * unique라 upsert로 넣으면 이미 등록된 날짜는 덮어쓴다.
 */
export async function saveDateOverrideRange(formData: FormData) {
  await requireAdmin();

  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "") || startDate;
  const closed = formData.get("closed") === "on";
  const openTime = String(formData.get("openTime") ?? "");
  const closeTime = String(formData.get("closeTime") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!startDate || endDate < startDate) return;
  if (!closed && (!openTime || !closeTime)) return;

  const dayCount = diffDays(startDate as DateString, endDate as DateString);
  // 시험기간 등록 실수로 몇 달치가 밀리는 걸 막는 안전장치.
  if (dayCount > 90) return;

  const rows = Array.from({ length: dayCount + 1 }, (_, i) => ({
    date: addDays(startDate as DateString, i),
    is_closed: closed,
    open_time: closed ? null : openTime,
    close_time: closed ? null : closeTime,
    reason: reason || null,
  }));

  const supabase = await createClient();
  await supabase.from("date_overrides").upsert(rows, { onConflict: "date" });

  revalidatePath("/admin/schedule");
}

export async function removeDateOverride(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("date_overrides").delete().eq("id", id);

  revalidatePath("/admin/schedule");
}

/**
 * 수기 예약 등록 (Phase 7).
 *
 * 전화나 DM으로 받은 예약을 관리자가 직접 넣는다. isReservationTimeAvailable로
 * 다시 확인한다 — 관리자가 통화 중 착각해 이미 찬 시간이나 운영시간
 * 밖을 입력해도 이중예약으로 이어지지 않는다. 손님용 화면이 쓰는
 * loadAvailableSlots(격자 목록)가 아니라 이 함수를 쓰는 이유는, 시간을
 * 직접 타이핑하는 이 폼에서는 손님이 부른 시각(예: 14:07)이 슬롯
 * 간격의 배수가 아닐 수 있어서다 — 격자 목록에 없다고 해서 실제로
 * 겹치는 건 아닌데, 목록 포함 여부만 보면 "이미 찼다"고 잘못 거절하게
 * 된다. 이미 통화로 확인된 예약이라 개인정보 동의 체크박스는 없고,
 * 상태도 확인 대기(requested)가 아니라 바로 확정(confirmed)으로 넣는다.
 */
/** 상품의 활성 문항 목록을 클라이언트(수기 예약 다이얼로그)에서 불러올 때 쓴다. */
export async function getProductCustomFields(
  productId: string,
): Promise<CustomField[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_fields")
    .select(
      "id, product_id, label, type, options, option_prices, description, required, active, sort_order, created_at",
    )
    .eq("product_id", productId)
    .eq("active", true)
    .order("sort_order");
  return data ?? [];
}

export type ManualReservationState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; code: string };

export async function createManualReservation(
  _prev: ManualReservationState,
  formData: FormData,
): Promise<ManualReservationState> {
  await requireAdmin();

  const parsed = manualReservationSchema.safeParse({
    productId: formData.get("productId"),
    date: formData.get("date"),
    time: formData.get("time"),
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    peopleCount: formData.get("peopleCount"),
    memo: formData.get("memo"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      error:
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주시기 바랍니다.",
    };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const [{ data: product }, { data: customFieldRows }] = await Promise.all([
    supabase
      .from("products")
      .select("name, price, sale_price, duration_min, buffer_after_min")
      .eq("id", input.productId)
      .single(),
    supabase
      .from("custom_fields")
      .select(
        "id, product_id, label, type, options, option_prices, description, required, active, sort_order, created_at",
      )
      .eq("product_id", input.productId)
      .eq("active", true)
      .order("sort_order"),
  ]);

  if (!product) {
    return { status: "error", error: "상품을 찾을 수 없습니다." };
  }

  const customFields: CustomField[] = customFieldRows ?? [];

  // 커스텀 문항 답변 수집 — name/phone 타입은 이미 위 customerName/Phone 필드로
  // 처리되었으니 건너뛴다. multi_choice는 복수 체크박스로 들어온다.
  const customAnswers: { fieldId: string; value: string }[] = [];
  let extraGender: "male" | "female" | null = null;
  let extraBirthDate: string | null = null;
  let extraEmail: string | null = null;

  for (const field of customFields) {
    if (field.type === "name" || field.type === "phone") continue;
    const fname = fieldFormName(field.id);

    if (field.type === "gender") {
      const val = formData.get(fname);
      if (val === "male" || val === "female") extraGender = val;
      if (val) customAnswers.push({ fieldId: field.id, value: String(val) });
      continue;
    }
    if (field.type === "birth_date") {
      const val = String(formData.get(fname) ?? "").trim();
      if (val) {
        extraBirthDate = val;
        customAnswers.push({ fieldId: field.id, value: val });
      }
      continue;
    }
    if (field.type === "email") {
      const val = String(formData.get(fname) ?? "").trim();
      if (val) {
        extraEmail = val;
        customAnswers.push({ fieldId: field.id, value: val });
      }
      continue;
    }
    if (field.type === "multi_choice") {
      const values = formData.getAll(fname).map(String).filter(Boolean);
      if (values.length > 0) {
        customAnswers.push({ fieldId: field.id, value: JSON.stringify(values) });
      }
      continue;
    }
    if (field.type === "checkbox") {
      const checked = formData.get(fname) === "on";
      customAnswers.push({ fieldId: field.id, value: checked ? "true" : "false" });
      continue;
    }
    const val = String(formData.get(fname) ?? "").trim();
    if (val) customAnswers.push({ fieldId: field.id, value: val });
  }

  // 예상금액 계산 (기본가 + 유료 옵션)
  const basePrice = product.sale_price ?? product.price;
  const selectedLabels = selectedLabelsFromAnswers(
    customFields,
    customAnswers.map((a) => ({ fieldId: a.fieldId, value: a.value })),
  );
  const pricedItems = selectedPricedOptions(customFields, selectedLabels);
  const estimatedAmount =
    basePrice + pricedItems.reduce((sum, item) => sum + item.price, 0);

  const stillAvailable = await isReservationTimeAvailable({
    date: input.date,
    time: input.time,
    productId: input.productId,
  });
  if (!stillAvailable) {
    return {
      status: "error",
      error:
        "이 시간은 예약할 수 없습니다. 이미 다른 예약이 있거나 운영시간이 아닙니다.",
    };
  }

  const shootStart = kstToInstant(input.date, input.time);
  const shootEnd = new Date(
    shootStart.getTime() + product.duration_min * 60_000,
  );
  const occupiesEnd = new Date(
    shootEnd.getTime() + product.buffer_after_min * 60_000,
  );
  const period = toTstzRange({ start: shootStart, end: occupiesEnd });

  // 코드가 우연히 겹치면(극히 드묾) 새로 뽑아 다시 시도한다.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateReservationCode();

    const { data, error } = await supabase
      .from("reservations")
      .insert({
        code,
        product_id: input.productId,
        period,
        shoot_start: shootStart.toISOString(),
        shoot_end: shootEnd.toISOString(),
        status: "confirmed",
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
        customer_email: extraEmail,
        gender: extraGender,
        birth_date: extraBirthDate,
        people_count: input.peopleCount,
        memo: input.memo || null,
        estimated_amount: estimatedAmount,
      })
      .select("id")
      .single();

    if (!error) {
      const reservationId = data?.id ?? "";

      if (customAnswers.length > 0) {
        await supabase.from("reservation_answers").insert(
          customAnswers.map((a) => ({
            reservation_id: reservationId,
            field_id: a.fieldId,
            value: a.value,
          })),
        );
      }

      revalidatePath("/admin/reservations");

      after(async () => {
        await upsertCustomerFromReservation({
          phone: input.customerPhone,
          name: input.customerName,
          gender: extraGender,
          birthDate: extraBirthDate,
          email: extraEmail,
        });
        await Promise.all([
          notifyCustomerConfirmed({
            reservationId,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            productName: product.name,
            shootStart,
            code,
          }),
          syncReservationToSheet(reservationId),
          syncCustomerToSheet(input.customerPhone),
          syncReservationToCalendar(reservationId),
        ]);
      });

      return { status: "success", code };
    }

    if (error.code === "23505") continue; // 예약번호 충돌. 다시 시도.

    if (error.code === "23P01") {
      // EXCLUDE 제약. 위 재확인 이후 그사이에 진짜로 시간이 찬 경우.
      return {
        status: "error",
        error:
          "방금 그 시간이 다른 예약으로 찼습니다. 다시 선택해 주시기 바랍니다.",
      };
    }

    return { status: "error", error: `등록하지 못했습니다: ${error.message}` };
  }

  return {
    status: "error",
    error: "일시적인 오류로 등록하지 못했습니다. 다시 시도해 주시기 바랍니다.",
  };
}

/**
 * 확정된 예약의 일정(날짜·시간)을 관리자가 직접 바꾼다.
 *
 * 손님용 신청·수기 예약 등록과 달리 운영시간·리드타임을 확인하지
 * 않는다 — "내가 마음대로 바꿀 수 있어야 한다"는 요구에 따라, 형식만
 * 맞으면 관리자가 원하는 아무 날짜·시간이나 넣을 수 있다. 실제 다른
 * 예약과 겹치는지는 DB의 EXCLUDE 제약(confirmed 상태에서만 걸림)이
 * 막아준다 — 겹치면 23P01로 거절되고, 그 경우 상태는 그대로 두고
 * 에러만 보여준다(손님에게 잘못된 알림이 나가지 않게).
 *
 * 아직 후보만 낸 채 확정 전인 예약(shoot_start 없음)이나, 확정 이력이
 * 없는 예약은 바꿀 시간 자체가 없으므로 대상에서 제외한다.
 */
export async function rescheduleReservation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = rescheduleReservationSchema.safeParse({
    id: formData.get("id"),
    date: formData.get("date"),
    time: formData.get("time"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "입력값을 확인해 주시기 바랍니다.",
    };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      "code, status, shoot_start, customer_name, customer_phone, customer_email, gender, birth_date, product_id",
    )
    .eq("id", input.id)
    .single();

  if (!reservation) return { error: "예약을 찾을 수 없습니다." };
  if (reservation.status !== "confirmed") {
    return { error: "확정된 예약만 일정을 바꿀 수 있습니다." };
  }
  if (!reservation.shoot_start) {
    return { error: "아직 시간이 정해지지 않은 예약입니다." };
  }

  const { data: product } = await supabase
    .from("products")
    .select("name, duration_min, buffer_after_min")
    .eq("id", reservation.product_id)
    .single();
  if (!product) return { error: "상품을 찾을 수 없습니다." };

  const oldShootStart = new Date(reservation.shoot_start);
  const newShootStart = kstToInstant(input.date, input.time);
  const newShootEnd = new Date(
    newShootStart.getTime() + product.duration_min * 60_000,
  );
  const occupiesEnd = new Date(
    newShootEnd.getTime() + product.buffer_after_min * 60_000,
  );
  const period = toTstzRange({ start: newShootStart, end: occupiesEnd });

  const { error } = await supabase
    .from("reservations")
    .update({
      period,
      shoot_start: newShootStart.toISOString(),
      shoot_end: newShootEnd.toISOString(),
    })
    .eq("id", input.id);

  if (error) {
    if (error.code === "23P01") {
      return {
        error:
          "그 시간은 이미 다른 예약과 겹칩니다. 다른 시간을 입력해 주시기 바랍니다.",
      };
    }
    return { error: `일정을 바꾸지 못했습니다: ${error.message}` };
  }

  revalidatePath("/admin/reservations");

  after(async () => {
    await upsertCustomerFromReservation({
      phone: reservation.customer_phone,
      name: reservation.customer_name,
      gender: reservation.gender,
      birthDate: reservation.birth_date,
      email: reservation.customer_email,
    });
    await Promise.all([
      notifyCustomerRescheduled({
        reservationId: input.id,
        customerName: reservation.customer_name,
        customerPhone: reservation.customer_phone,
        customerEmail: reservation.customer_email,
        productName: product.name,
        oldShootStart,
        newShootStart,
        code: reservation.code,
      }),
      syncReservationToSheet(input.id),
      syncCustomerToSheet(reservation.customer_phone),
      syncReservationToCalendar(input.id),
    ]);
  });

  return null;
}

/**
 * 예약 설정 (Phase 7) — 리드타임/예약가능기간/취소기한/계좌/공지.
 * 지금까지는 이 값들을 바꾸려면 Supabase Table Editor를 열어야 했다.
 */
export type SettingsActionState = { error?: string; success?: boolean } | null;

export async function saveSettings(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

  const slotIntervalMin = Number(formData.get("slotIntervalMin"));
  const minLeadDays = Number(formData.get("minLeadDays"));
  const maxAdvanceDays = Number(formData.get("maxAdvanceDays"));
  const cancelDeadlineHours = Number(formData.get("cancelDeadlineHours"));
  const bankAccount = String(formData.get("bankAccount") ?? "").trim();
  const studioIntro = String(formData.get("studioIntro") ?? "").trim();
  const notice = String(formData.get("notice") ?? "").trim();
  const reservationSuccessHeading = String(
    formData.get("reservationSuccessHeading") ?? "",
  ).trim();
  const reservationSuccessMessage = String(
    formData.get("reservationSuccessMessage") ?? "",
  ).trim();
  const adminNotifyPhone = String(
    formData.get("adminNotifyPhone") ?? "",
  ).trim();
  const adminNotifyEmail = String(
    formData.get("adminNotifyEmail") ?? "",
  ).trim();
  const showProductThumbnails = formData.get("showProductThumbnails") === "on";

  if (
    !Number.isInteger(slotIntervalMin) ||
    slotIntervalMin <= 0 ||
    !Number.isInteger(minLeadDays) ||
    minLeadDays < 0 ||
    !Number.isInteger(maxAdvanceDays) ||
    maxAdvanceDays <= 0 ||
    !Number.isInteger(cancelDeadlineHours) ||
    cancelDeadlineHours < 0
  ) {
    return { error: "숫자 값을 다시 확인해 주시기 바랍니다." };
  }

  if (adminNotifyPhone && !/^01[0-9]{8,9}$/.test(adminNotifyPhone)) {
    return {
      error: "알림 받을 번호는 숫자만, 010으로 시작해 입력해 주시기 바랍니다.",
    };
  }

  if (adminNotifyEmail && !adminNotifyEmail.includes("@")) {
    return { error: "알림 받을 이메일 형식을 확인해 주시기 바랍니다." };
  }

  if (!reservationSuccessHeading || !reservationSuccessMessage) {
    return {
      error: "예약 완료 화면 제목과 설명은 비워둘 수 없습니다.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({
      slot_interval_min: slotIntervalMin,
      min_lead_days: minLeadDays,
      max_advance_days: maxAdvanceDays,
      cancel_deadline_hours: cancelDeadlineHours,
      bank_account: bankAccount || null,
      studio_intro: studioIntro || null,
      notice: notice || null,
      reservation_success_heading: reservationSuccessHeading,
      reservation_success_message: reservationSuccessMessage,
      admin_notify_phone: adminNotifyPhone || null,
      admin_notify_email: adminNotifyEmail || null,
      show_product_thumbnails: showProductThumbnails,
    })
    .eq("id", 1);

  if (error) {
    return { error: `저장하지 못했습니다: ${error.message}` };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/"); // 랜딩 페이지가 studio_intro를 보여준다.
  // 동적 세그먼트가 있는 경로는 파일 구조 패턴 + type을 함께 줘야 한다
  // (revalidatePath는 layout.tsx가 실제로 있는 세그먼트에서만 "layout"
  // 타입이 먹는다 — /booking 아래엔 layout.tsx가 없어 개별로 지정한다).
  revalidatePath("/booking"); // 리터럴 경로
  revalidatePath("/booking/[slug]", "page");
  revalidatePath("/booking/[slug]/apply", "page");

  return { success: true };
}

/**
 * 이메일 문구(제목/본문) 저장. 5개 목적(customer_requested 등) 중
 * 하나씩 고친다 — 화면(email-templates-section.tsx)이 한 번에 한
 * 템플릿만 보여주고 저장하는 구조라 이 액션도 한 건씩 받는다.
 *
 * 본문 안의 {{변수명}}은 검증하지 않는다 — 모르는 변수를 써도 발송
 * 시점에 그대로 남을 뿐(lib/notifications/email-templates-shared.ts의
 * renderEmailTemplate), 저장 자체를 막을 이유가 없다. 오타를 미리
 * 걸러주기보다는 화면에 "사용 가능한 변수" 목록을 보여주는 쪽을 택했다.
 */
export async function saveEmailTemplate(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

  const purpose = String(formData.get("purpose") ?? "");
  if (!EMAIL_TEMPLATE_PURPOSES.includes(purpose as EmailTemplatePurpose)) {
    return { error: "잘못된 요청입니다." };
  }

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!subject) return { error: "제목을 입력해 주시기 바랍니다." };
  if (!body) return { error: "본문을 입력해 주시기 바랍니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_templates")
    .upsert(
      { purpose: purpose as EmailTemplatePurpose, subject, body },
      { onConflict: "purpose" },
    );

  if (error) {
    return { error: `저장하지 못했습니다: ${error.message}` };
  }

  revalidatePath("/admin/settings");
  return { success: true };
}

/**
 * 예약별 실제 지불액. 할인 이벤트 등으로 예약마다 실제 받는 금액이
 * 다를 수 있어 상품 정가와 별도로 둔다. 기본가/옵션별로 각각 금액을
 * 수정할 수 있게 항목 배열(chargedAmountBreakdown)로 받고, 그 합계를
 * charged_amount에 저장한다 — 매출 계산은 지금처럼 charged_amount
 * 하나만 보면 되고, breakdown은 다음에 열었을 때 항목별로 이어서 고칠
 * 수 있도록 남겨두는 용도다.
 */
export async function saveReservationChargedAmount(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const breakdownRaw = String(formData.get("chargedAmountBreakdown") ?? "");
  let chargedAmountBreakdown: { label: string; amount: number }[] | null =
    null;
  if (breakdownRaw) {
    try {
      const parsed = JSON.parse(breakdownRaw);
      if (
        Array.isArray(parsed) &&
        parsed.every(
          (it) =>
            it &&
            typeof it.label === "string" &&
            typeof it.amount === "number" &&
            Number.isFinite(it.amount) &&
            it.amount >= 0,
        )
      ) {
        chargedAmountBreakdown = parsed;
      }
    } catch {
      // 형식이 이상하면 breakdown 없이 총액만 저장한다.
    }
  }

  const chargedAmount = chargedAmountBreakdown
    ? chargedAmountBreakdown.reduce((sum, it) => sum + it.amount, 0)
    : null;

  const chargedAmountMemo = String(
    formData.get("chargedAmountMemo") ?? "",
  ).trim();

  const supabase = await createClient();
  await supabase
    .from("reservations")
    .update({
      charged_amount: chargedAmount,
      charged_amount_memo: chargedAmountMemo || null,
      charged_amount_breakdown: chargedAmountBreakdown,
    })
    .eq("id", id);

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/revenue");
  after(() => syncReservationToSheet(id));
}

/**
 * 커스텀 신청 문항 — 상품별 예약 폼에 자유롭게 문항을 추가한다.
 * 상품/스케줄과 같은 이유로 순서는 sort_order, 위/아래 버튼으로 바꾼다.
 * 문항은 상품마다 따로 관리되므로(product_id), 정렬·다음 순번 계산도
 * 항상 그 상품 안에서만 이뤄진다.
 */
const CUSTOM_FIELD_TYPES = [
  "short_text",
  "long_text",
  "single_choice",
  "multi_choice",
  "checkbox",
  "name",
  "phone",
  "email",
  "gender",
  "birth_date",
] as const;

/**
 * 추가/수정 폼에서 공통으로 쓰는 값 읽기 + 검증. 실패하면 null —
 * 폼이 조작되지 않는 한 벌어질 일이 없어 별도 에러 메시지는 안 둔다
 * (다른 관리자 액션들도 같은 수준으로 조용히 무시한다).
 *
 * 보기(옵션)는 구글폼처럼 한 줄짜리 입력을 여러 개 늘어놓는 방식이라,
 * 같은 이름("option")으로 여러 번 들어온다 — getAll로 그대로 순서를 살린다.
 */
function parseCustomFieldForm(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  // 상세 설명은 굵게/기울임/줄바꿈을 쓸 수 있는 위지윅 에디터
  // (field-description-editor.tsx)가 HTML로 보낸다 — 상품 설명과
  // 같은 이유로 저장 전에 정화(sanitize)한다. 에디터를 비워두면
  // 빈 문단("<p></p>")만 남는데, 그건 "설명 없음"과 같은 뜻이라
  // 태그를 뺀 실제 글자가 하나도 없으면 null로 저장한다.
  const rawDescription = String(formData.get("description") ?? "")
    .trim()
    .slice(0, 2_000);
  const description = sanitizeDescriptionHtml(rawDescription);
  const descriptionText = description.replace(/<[^>]*>/g, "").trim();
  const required = formData.get("required") === "on";
  const active = formData.get("active") === "on";
  // option/optionPrice는 화면에서 같은 인덱스끼리 짝지어 보낸다(옵션
  // 한 줄 = 라벨 칸 + 가격 칸). 빈 라벨 행을 걸러낼 때 가격도 같이
  // 걸러내야 짝이 안 어긋난다 — 그래서 먼저 묶은 뒤에 거른다.
  const rawOptions = formData.getAll("option").map((v) => String(v).trim());
  const rawOptionPrices = formData
    .getAll("optionPrice")
    .map((v) => String(v).trim());
  const optionPairs = rawOptions
    .map((label, i) => ({ label, price: rawOptionPrices[i] ?? "" }))
    .filter((pair) => pair.label.length > 0);
  const options = optionPairs.map((pair) => pair.label);
  // 가격 칸을 하나도 안 건드렸으면(전부 빈 칸) 이 문항엔 가격이 없는
  // 거다 — option_prices를 null로 둬서 예전과 똑같이 동작한다. 하나라도
  // 채웠으면 나머지 빈 칸은 0원으로 채워 전체 배열을 만든다.
  const hasAnyOptionPrice = optionPairs.some((pair) => pair.price !== "");
  const optionPrices = hasAnyOptionPrice
    ? optionPairs.map((pair) =>
        Math.max(0, Math.round(Number(pair.price) || 0)),
      )
    : null;

  if (!productId || !label) return null;
  if (
    !CUSTOM_FIELD_TYPES.includes(type as (typeof CUSTOM_FIELD_TYPES)[number])
  ) {
    return null;
  }
  const needsOptions = type === "single_choice" || type === "multi_choice";
  if (needsOptions && options.length === 0) return null;

  return {
    product_id: productId,
    label,
    type: type as (typeof CUSTOM_FIELD_TYPES)[number],
    options: needsOptions ? options : null,
    option_prices: needsOptions ? optionPrices : null,
    description: descriptionText ? description : null,
    required,
    active,
  };
}

function revalidateCustomFieldPaths(productId: string) {
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/booking/[slug]/apply", "page");
}

export async function addCustomField(formData: FormData) {
  await requireAdmin();

  const row = parseCustomFieldForm(formData);
  if (!row) return;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("custom_fields")
    .select("sort_order")
    .eq("product_id", row.product_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (existing?.sort_order ?? -1) + 1;

  await supabase
    .from("custom_fields")
    .insert({ ...row, sort_order: nextOrder });

  revalidateCustomFieldPaths(row.product_id);
}

export async function updateCustomField(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const row = parseCustomFieldForm(formData);
  if (!row) return;

  const supabase = await createClient();
  await supabase.from("custom_fields").update(row).eq("id", id);

  revalidateCustomFieldPaths(row.product_id);
}

/**
 * 이름·연락처(LOCKED_FIELD_TYPES)는 UI(delete-field-button.tsx)에서
 * 삭제 버튼 자체를 안 보여주지만, 그것만으로는 화면을 거치지 않고
 * 조작된 요청까지 막지 못한다 — 그래서 여기서도 그 타입은 애초에
 * 조건에서 빼서, 지우려는 요청이 와도 실제로는 지워지지 않는다.
 */
export async function deleteCustomField(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const productId = String(formData.get("productId") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("custom_fields")
    .delete()
    .eq("id", id)
    .not("type", "in", `(${LOCKED_FIELD_TYPES.join(",")})`);

  if (productId) revalidateCustomFieldPaths(productId);
}

export async function moveCustomField(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const direction = formData.get("direction") === "up" ? -1 : 1;
  if (!id || !productId) return;

  const supabase = await createClient();
  const { data: fields } = await supabase
    .from("custom_fields")
    .select("id, sort_order")
    .eq("product_id", productId)
    .order("sort_order");

  if (!fields) return;

  const index = fields.findIndex((field) => field.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= fields.length) return;

  const reordered = [...fields];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  await Promise.all(
    reordered.map((field, order) =>
      supabase
        .from("custom_fields")
        .update({ sort_order: order })
        .eq("id", field.id),
    ),
  );

  revalidateCustomFieldPaths(productId);
}

/**
 * 비슷한 상품을 새로 만들 때마다 "추가옵션" 같은 문항을 손으로 다시
 * 만들지 않아도 되게, 다른 상품의 문항을 그대로 복사해 지금 상품
 * 끝에 이어 붙인다.
 *
 * 이름·연락처·이메일·성별·생년월일(SPECIAL_FIELD_TYPES)은 상품을 만들
 * 때마다 이미 하나씩 자동으로 생겨 있으므로(DEFAULT_CUSTOM_FIELDS)
 * 복사 대상에서 뺀다 — 안 그러면 "이름" 문항이 두 개가 된다. 비활성
 * 문항도 안 가져온다(보이지 않던 걸 굳이 옮길 이유가 없다).
 */
export async function importCustomFieldsFromProduct(formData: FormData) {
  await requireAdmin();

  const targetProductId = String(formData.get("targetProductId") ?? "");
  const sourceProductId = String(formData.get("sourceProductId") ?? "");
  if (
    !targetProductId ||
    !sourceProductId ||
    targetProductId === sourceProductId
  ) {
    return;
  }

  const supabase = await createClient();
  const [{ data: sourceFields }, { data: existing }] = await Promise.all([
    supabase
      .from("custom_fields")
      .select("label, type, options, option_prices, description, required")
      .eq("product_id", sourceProductId)
      .eq("active", true)
      .not("type", "in", `(${SPECIAL_FIELD_TYPES.join(",")})`)
      .order("sort_order"),
    supabase
      .from("custom_fields")
      .select("sort_order")
      .eq("product_id", targetProductId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!sourceFields || sourceFields.length === 0) return;

  let nextOrder = (existing?.sort_order ?? -1) + 1;
  await supabase.from("custom_fields").insert(
    sourceFields.map((field) => ({
      ...field,
      product_id: targetProductId,
      active: true,
      sort_order: nextOrder++,
    })),
  );

  revalidateCustomFieldPaths(targetProductId);
}

/**
 * 구글 시트 연동을 붙이기 전부터 있던 예약들을 한 번에 소급 반영.
 * 설정 화면에서 관리자가 명시적으로 누르는 일회성 버튼 — 예약이 바뀔
 * 때마다 자동으로 도는 syncReservationToSheet 등과 달리, 실패를
 * 삼키지 않고 화면에 에러 문구를 보여준다.
 */
export type BackfillGoogleSheetsState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; reservationCount: number; customerCount: number };

export async function backfillGoogleSheets(
  _prev: BackfillGoogleSheetsState,
): Promise<BackfillGoogleSheetsState> {
  await requireAdmin();

  try {
    const { reservationCount, customerCount } = await backfillAllToSheet();
    return { status: "success", reservationCount, customerCount };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "동기화에 실패했습니다.",
    };
  }
}

/**
 * 구글 캘린더 연동을 붙이기 전부터 있던(또는 그 사이 일시적으로 실패한)
 * 예약들을 한 번에 소급 반영. 설정 화면에서 관리자가 명시적으로 누르는
 * 일회성 버튼이다.
 */
export type BackfillGoogleCalendarState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | {
      status: "success";
      syncedCount: number;
      skippedCount: number;
      failedCount: number;
    };

export async function backfillGoogleCalendar(
  _prev: BackfillGoogleCalendarState,
): Promise<BackfillGoogleCalendarState> {
  await requireAdmin();

  try {
    const { syncedCount, skippedCount, failedCount } =
      await backfillAllToCalendar();
    return { status: "success", syncedCount, skippedCount, failedCount };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "동기화에 실패했습니다.",
    };
  }
}

/**
 * 고객DB 화면에서 손님 인적사항을 수기로 고친다. 연락처도 포함해
 * 전부 고칠 수 있다.
 *
 * 연락처는 예약 기록과 이 손님을 이어주는 식별자라, 바꿀 땐 그 손님의
 * 기존 예약들(reservations.customer_phone)도 함께 새 번호로 옮긴다 —
 * 안 옮기면 예약은 옛 번호에 남고 손님만 새 번호로 떨어져 나가
 * "방문 0회"인 새 손님처럼 보인다. 새 번호가 이미 다른 손님이 쓰는
 * 번호면(unique 제약) 거절한다 — 두 손님을 하나로 합치는 건 이
 * 기능의 범위가 아니다.
 */
export type UpdateCustomerState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export async function updateCustomer(
  _prev: UpdateCustomerState,
  formData: FormData,
): Promise<UpdateCustomerState> {
  await requireAdmin();

  const originalPhone = String(formData.get("originalPhone") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!originalPhone) return { status: "error", error: "잘못된 요청입니다." };
  if (!name) {
    return { status: "error", error: "이름을 입력해 주시기 바랍니다." };
  }

  const parsedPhone = phoneField.safeParse(formData.get("phone"));
  if (!parsedPhone.success) {
    return {
      status: "error",
      error:
        parsedPhone.error.issues[0]?.message ??
        "연락처를 확인해 주시기 바랍니다.",
    };
  }
  const phone = parsedPhone.data;

  const rawGender = String(formData.get("gender") ?? "");
  const gender =
    rawGender === "male" || rawGender === "female" ? rawGender : null;
  const birthDate = String(formData.get("birthDate") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;

  const supabase = await createClient();

  if (phone !== originalPhone) {
    const { data: conflict } = await supabase
      .from("customers")
      .select("phone")
      .eq("phone", phone)
      .maybeSingle();
    if (conflict) {
      return {
        status: "error",
        error: "이미 다른 고객이 사용 중인 연락처입니다.",
      };
    }

    const { error: reservationsError } = await supabase
      .from("reservations")
      .update({ customer_phone: phone })
      .eq("customer_phone", originalPhone);
    if (reservationsError) {
      return {
        status: "error",
        error: `예약 기록을 옮기지 못했습니다: ${reservationsError.message}`,
      };
    }
  }

  const { error } = await supabase
    .from("customers")
    .update({ phone, name, gender, birth_date: birthDate, email })
    .eq("phone", originalPhone);
  if (error) {
    return { status: "error", error: `저장하지 못했습니다: ${error.message}` };
  }

  revalidatePath("/admin/customers");
  revalidatePath("/admin/reservations");
  return { status: "success" };
}

/**
 * 고객DB 화면에서 선택한 손님(들)의 인적사항을 완전히 지운다. 나중에
 * 개인정보 보관기간이 지난 손님을 파기할 때 쓸 자리다 — 지금은 관리자가
 * 목록에서 체크박스로 고른 손님들을 한 번에 지우는 용도로만 쓰인다.
 *
 * customers 행만 지운다. reservations에는 손님 인적사항이 예약 시점의
 * 스냅샷으로 따로 저장돼 있어(customer_name/phone/email 등) 고객DB
 * 행을 지워도 예약 기록 자체는 그대로 남는다 — 이 기능의 범위는
 * "고객DB"이지 지난 예약 이력 파기가 아니다.
 */
export type DeleteCustomersState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; count: number };

export async function deleteCustomers(
  _prev: DeleteCustomersState,
  formData: FormData,
): Promise<DeleteCustomersState> {
  await requireAdmin();

  const phones = formData
    .getAll("phones")
    .map((v) => String(v))
    .filter(Boolean);
  if (phones.length === 0) {
    return { status: "error", error: "삭제할 고객을 선택해 주시기 바랍니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .delete()
    .in("phone", phones);
  if (error) {
    return { status: "error", error: `삭제하지 못했습니다: ${error.message}` };
  }

  revalidatePath("/admin/customers");
  return { status: "success", count: phones.length };
}

/**
 * 고객DB 화면의 "고객정보 업로드" 버튼. 예약이 바뀔 때마다 자동으로
 * 도는 동기화와 달리, customers 테이블을 수기로 고친 것만으로는 시트가
 * 곧바로 바뀌지 않으니(그 손님의 예약이 다시 움직여야 자동 동기화가
 * 돈다), 관리자가 명시적으로 눌러 지금 값을 "고객DB" 탭에 바로
 * 반영한다.
 */
export type UploadCustomersState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; count: number };

export async function uploadCustomersToSheet(
  _prev: UploadCustomersState,
): Promise<UploadCustomersState> {
  await requireAdmin();

  try {
    const count = await syncAllCustomersToSheet();
    return { status: "success", count };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "업로드에 실패했습니다.",
    };
  }
}

/**
 * 예약관리 화면의 "예약정보 업로드" 버튼. 예약은 바뀔 때마다 자동으로
 * 시트에 반영되지만, 시트를 손으로 건드렸거나 꼬였다 싶을 때 지금 DB
 * 상태 그대로 "예약" 탭을 통째로 다시 맞추는 수동 새로고침이다.
 */
export type UploadReservationsState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; count: number };

export async function uploadReservationsToSheet(
  _prev: UploadReservationsState,
): Promise<UploadReservationsState> {
  await requireAdmin();

  try {
    const count = await syncAllReservationsToSheet();
    return { status: "success", count };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "업로드에 실패했습니다.",
    };
  }
}

/**
 * 통계 화면(/admin/analytics)의 "통계 리셋" 버튼. 조회 기록
 * (booking_list_views/product_views) 행 자체는 지우지 않는다 —
 * 상세 로그에서 언제 조회가 있었는지 계속 볼 수 있어야 하기 때문이다.
 * 대신 지금 시점을 settings.analytics_reset_at에 기록해 두고,
 * 퍼널·동향·상품별 집계는 이 시점 이후 기록만 세도록 한다(0부터 다시
 * 세는 효과는 그대로 내면서 로그는 남긴다). 실제 예약(reservations)은
 * 진짜 업무 기록이라 이 리셋과 무관하게 항상 전체를 그대로 보여준다.
 */
export type ResetAnalyticsState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export async function resetAnalytics(
  _prev: ResetAnalyticsState,
): Promise<ResetAnalyticsState> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({ analytics_reset_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) {
    return { status: "error", error: `리셋하지 못했습니다: ${error.message}` };
  }

  revalidatePath("/admin/analytics");
  return { status: "success" };
}

/**
 * 기록표 양식 에디터(설정 화면)에서 "옵션" 태그 드롭다운에 보여줄
 * 선택지. 실제로 가격이 매겨진 옵션(문항편집에서 만든 single_choice/
 * multi_choice의 옵션들, 예: "대본추가")만 모은다 — 상품마다 따로
 * 관리되지만 기록표 양식은 상품 구분 없이 하나이므로, 전체 상품을
 * 통틀어 이름이 같은 옵션은 하나로 합친다(Set으로 중복 제거).
 */
export async function getPricedOptionLabels(): Promise<string[]> {
  await requireAdmin();

  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_fields")
    .select("options, option_prices")
    .not("option_prices", "is", null);

  const labels = new Set<string>();
  for (const row of data ?? []) {
    const options = row.options ?? [];
    const prices = row.option_prices ?? [];
    options.forEach((opt, i) => {
      if ((prices[i] ?? 0) > 0) labels.add(opt);
    });
  }
  return [...labels].sort();
}

/**
 * 기록표 양식(행 구성) 저장. 행 하나하나가 화면에 그대로 나가는
 * 레이아웃이라, 형식이 깨진 값을 그냥 저장해버리면 다음 인쇄
 * 미리보기가 통째로 망가진다 — parseRecordSheetRows로 다시 한 번
 * 검증한 뒤에만 저장한다(클라이언트가 이미 검증했더라도 서버에서
 * 믿지 않는다).
 */
export async function saveRecordSheetTemplate(
  rows: RecordSheetRow[],
): Promise<{ error?: string }> {
  await requireAdmin();

  const validated = parseRecordSheetRows(rows);
  if (!validated) {
    return { error: "행 구성이 올바르지 않습니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("record_sheet_template")
    .update({ rows: validated })
    .eq("id", 1);

  if (error) {
    return { error: `저장하지 못했습니다: ${error.message}` };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/reservations");
  return {};
}
