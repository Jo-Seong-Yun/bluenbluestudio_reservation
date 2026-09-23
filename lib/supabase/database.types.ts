/**
 * Supabase 테이블 타입.
 *
 * 손으로 작성한 임시 타입이다. Supabase 프로젝트를 연결한 뒤에는
 *   npx supabase link --project-ref <ref>
 *   npm run db:types
 * 로 실제 스키마에서 다시 생성해 이 파일을 덮어쓴다.
 * (supabase/migrations 의 SQL이 항상 정답이고, 이 파일은 거기서 파생된 것이다)
 */

export type ReservationStatus =
  "requested" | "confirmed" | "completed" | "cancelled" | "no_show";

export type Gender = "male" | "female";

export type CustomFieldType =
  | "short_text"
  | "long_text"
  | "single_choice"
  | "multi_choice"
  | "checkbox"
  | "name"
  | "phone"
  | "email"
  | "gender"
  | "birth_date";

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          duration_min: number;
          buffer_after_min: number;
          price: number;
          sale_price: number | null;
          summary: string | null;
          description: string | null;
          cover_image: string | null;
          gallery: string[];
          max_people: number | null;
          is_published: boolean;
          sort_order: number;
          tag_color: string | null;
          /** 촬영 기록표의 "완성본 전달예정일" 칸(예: "7일"). */
          delivery_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["products"]["Row"]> & {
          name: string;
          slug: string;
          price: number;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>;
        Relationships: [];
      };
      product_views: {
        Row: {
          id: string;
          product_id: string;
          /** 링크에 붙어온 ?ref=... 값(유입경로). 없으면 null. */
          ref: string | null;
          /** 통계 화면 상세 로그에서 관리자가 남긴 메모. */
          memo: string | null;
          viewed_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["product_views"]["Row"]
        > & {
          product_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_views"]["Row"]>;
        Relationships: [];
      };
      booking_list_views: {
        Row: {
          id: string;
          ref: string | null;
          memo: string | null;
          viewed_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["booking_list_views"]["Row"]
        >;
        Update: Partial<
          Database["public"]["Tables"]["booking_list_views"]["Row"]
        >;
        Relationships: [];
      };
      apply_views: {
        Row: {
          id: string;
          product_id: string;
          ref: string | null;
          memo: string | null;
          viewed_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["apply_views"]["Row"]
        > & {
          product_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["apply_views"]["Row"]>;
        Relationships: [];
      };
      weekly_hours: {
        Row: {
          id: string;
          weekday: number; // 0=일 .. 6=토
          open_time: string; // "HH:MM:SS"
          close_time: string;
        };
        Insert: Partial<Database["public"]["Tables"]["weekly_hours"]["Row"]> & {
          weekday: number;
          open_time: string;
          close_time: string;
        };
        Update: Partial<Database["public"]["Tables"]["weekly_hours"]["Row"]>;
        Relationships: [];
      };
      date_overrides: {
        Row: {
          id: string;
          date: string; // "YYYY-MM-DD"
          is_closed: boolean;
          open_time: string | null;
          close_time: string | null;
          reason: string | null;
        };
        Insert: Partial<
          Database["public"]["Tables"]["date_overrides"]["Row"]
        > & {
          date: string;
        };
        Update: Partial<Database["public"]["Tables"]["date_overrides"]["Row"]>;
        Relationships: [];
      };
      blocks: {
        Row: {
          id: string;
          period: string; // Postgres tstzrange 텍스트 표현, 예: '["2026-09-05 14:00:00+09","2026-09-05 16:00:00+09")'
          reason: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["blocks"]["Row"]> & {
          period: string;
        };
        Update: Partial<Database["public"]["Tables"]["blocks"]["Row"]>;
        Relationships: [];
      };
      reservations: {
        Row: {
          id: string;
          code: string;
          product_id: string;
          // 접수(requested) 직후엔 아직 후보 중 하나로 확정되지 않아 null —
          // confirmed로 바뀌는 순간 선택된 후보 값으로 채워진다.
          // (마이그레이션 이전 방식으로 들어온 requested 예약은 예외적으로
          // 처음부터 값이 있다 — reservation_candidates.sql 참고)
          period: string | null;
          shoot_start: string | null;
          shoot_end: string | null;
          status: ReservationStatus;
          customer_name: string;
          customer_phone: string;
          customer_email: string | null;
          people_count: number | null;
          memo: string | null;
          admin_memo: string | null;
          cost: number | null;
          cost_memo: string | null;
          charged_amount: number | null;
          charged_amount_memo: string | null;
          /** 실제 지불액을 기본가/옵션별로 나눈 구성. charged_amount는
           * 이 배열의 합계다. */
          charged_amount_breakdown: { label: string; amount: number }[] | null;
          /** 신청 시점에 계산한 예상 금액(기본가+유료 옵션) 스냅샷. */
          estimated_amount: number | null;
          gender: Gender | null;
          birth_date: string | null; // "YYYY-MM-DD"
          reminded_at: string | null;
          /** 확정할 때 고른 후보의 rank(1~3). 확정 전엔 null. */
          confirmed_candidate_rank: number | null;
          /** 구글 캘린더에 만든 이벤트 id. 동기화된 적 없으면 null. */
          google_calendar_event_id: string | null;
          /** 신청 시점에 링크에 붙어 있던 ?ref=... 값(유입경로). */
          ref: string | null;
          /** 관리자가 예약 상세에서 직접 입력하는 촬영 장소. */
          shoot_location: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reservations"]["Row"]> & {
          code: string;
          product_id: string;
          customer_name: string;
          customer_phone: string;
        };
        Update: Partial<Database["public"]["Tables"]["reservations"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "reservations_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      reservation_candidates: {
        Row: {
          id: string;
          reservation_id: string;
          rank: number; // 1~3, 1지망~3지망
          shoot_start: string;
          shoot_end: string;
          period: string;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["reservation_candidates"]["Row"]
        > & {
          reservation_id: string;
          rank: number;
          shoot_start: string;
          shoot_end: string;
          period: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["reservation_candidates"]["Row"]
        >;
        Relationships: [
          {
            foreignKeyName: "reservation_candidates_reservation_id_fkey";
            columns: ["reservation_id"];
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          id: number;
          slot_interval_min: number;
          min_lead_days: number;
          max_advance_days: number;
          cancel_deadline_hours: number;
          bank_account: string | null;
          studio_intro: string | null;
          notice: string | null;
          /** 예약 신청 완료 화면의 제목/설명 문구. */
          reservation_success_heading: string;
          reservation_success_message: string;
          admin_notify_phone: string | null;
          admin_notify_email: string | null;
          show_product_thumbnails: boolean;
          /** "통계 리셋" 버튼을 마지막으로 누른 시점. 집계는 이 시점 이후
           * 기록만 센다(로그 자체는 지우지 않는다). 누른 적 없으면 null. */
          analytics_reset_at: string | null;
          /** lib/booking-style.ts의 BookingStyle 그대로. */
          booking_style: {
            accentColor: string;
            saleColor: string;
            textColor: string;
            textSize: string;
            cardRadius: string;
            cardSize: string;
          };
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["settings"]["Row"]>;
        Relationships: [];
      };
      record_sheet_template: {
        Row: {
          id: number;
          /** RecordSheetRow[](lib/record-sheet/schema.ts)를 그대로
           * 담은 JSON. 실제 계약은 그 타입이 정한다. */
          rows: unknown;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["record_sheet_template"]["Row"]
        >;
        Update: Partial<
          Database["public"]["Tables"]["record_sheet_template"]["Row"]
        >;
        Relationships: [];
      };
      monthly_expenses: {
        Row: {
          id: string;
          month: string; // "YYYY-MM"
          date: string | null; // "YYYY-MM-DD"
          label: string;
          amount: number;
          memo: string | null;
          /** "other"(기타지출) | "fixed"(고정지출). */
          kind: string;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["monthly_expenses"]["Row"]
        > & {
          month: string;
          label: string;
          amount: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["monthly_expenses"]["Row"]
        >;
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          phone: string;
          name: string;
          gender: Gender | null;
          birth_date: string | null; // "YYYY-MM-DD"
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["customers"]["Row"]> & {
          phone: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Row"]>;
        Relationships: [];
      };
      custom_fields: {
        Row: {
          id: string;
          product_id: string | null;
          label: string;
          type: CustomFieldType;
          options: string[] | null; // single_choice/multi_choice 보기 목록
          /** options[i]의 가격(원). 전부 null이거나 배열 자체가 null이면
           * 가격 없는(예전과 같은) 옵션이다. */
          option_prices: number[] | null;
          description: string | null;
          required: boolean;
          active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["custom_fields"]["Row"]
        > & {
          label: string;
          type: CustomFieldType;
        };
        Update: Partial<Database["public"]["Tables"]["custom_fields"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "custom_fields_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      reservation_answers: {
        Row: {
          id: string;
          reservation_id: string;
          field_id: string;
          value: string;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["reservation_answers"]["Row"]
        > & {
          reservation_id: string;
          field_id: string;
          value: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["reservation_answers"]["Row"]
        >;
        Relationships: [
          {
            foreignKeyName: "reservation_answers_reservation_id_fkey";
            columns: ["reservation_id"];
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservation_answers_field_id_fkey";
            columns: ["field_id"];
            referencedRelation: "custom_fields";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_logs: {
        Row: {
          id: string;
          channel: "sms" | "email" | "kakao";
          purpose: string;
          recipient: string;
          reservation_id: string | null;
          success: boolean;
          error: string | null;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["notification_logs"]["Row"]
        > & {
          channel: "sms" | "email" | "kakao";
          purpose: string;
          recipient: string;
          success: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["notification_logs"]["Row"]
        >;
        Relationships: [
          {
            foreignKeyName: "notification_logs_reservation_id_fkey";
            columns: ["reservation_id"];
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      email_rules: {
        Row: {
          id: string;
          name: string;
          enabled: boolean;
          recipient: "customer" | "admin";
          trigger_type:
            | "on_requested"
            | "on_confirmed"
            | "on_cancelled"
            | "on_rescheduled"
            | "on_admin_new_request"
            | "days_before_shoot"
            | "days_after_shoot";
          day_offset: number | null;
          product_id: string | null;
          subject: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["email_rules"]["Row"]> & {
          name: string;
          trigger_type:
            | "on_requested"
            | "on_confirmed"
            | "on_cancelled"
            | "on_rescheduled"
            | "on_admin_new_request"
            | "days_before_shoot"
            | "days_after_shoot";
          subject: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_rules"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "email_rules_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      lookup_reservation: {
        Args: { p_code: string; p_phone: string };
        Returns: Database["public"]["Tables"]["reservations"]["Row"][];
      };
      cancel_reservation: {
        Args: { p_code: string; p_phone: string };
        Returns: Database["public"]["Tables"]["reservations"]["Row"][];
      };
      lookup_reservations_by_phone: {
        Args: { p_phone: string };
        Returns: {
          code: string;
          status: ReservationStatus;
          // 아직 확정 안 된(후보만 낸) 예약은 null.
          shoot_start: string | null;
          shoot_end: string | null;
          customer_name: string;
          product_name: string;
        }[];
      };
      toggle_block_hour: {
        Args: { p_start: string; p_end: string };
        Returns: boolean;
      };
      create_reservation_with_candidates: {
        Args: {
          p_code: string;
          p_product_id: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_customer_email: string | null;
          p_gender: Gender | null;
          p_birth_date: string | null;
          p_candidate_starts: string[];
          p_candidate_ends: string[];
        };
        Returns: Database["public"]["Tables"]["reservations"]["Row"];
      };
    };
  };
}
