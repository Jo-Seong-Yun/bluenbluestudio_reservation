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
          summary: string | null;
          description: string | null;
          cover_image: string | null;
          gallery: string[];
          max_people: number | null;
          is_published: boolean;
          sort_order: number;
          tag_color: string | null;
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
          charged_amount: number | null;
          gender: Gender | null;
          birth_date: string | null; // "YYYY-MM-DD"
          reminded_at: string | null;
          /** 확정할 때 고른 후보의 rank(1~3). 확정 전엔 null. */
          confirmed_candidate_rank: number | null;
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
          admin_notify_phone: string | null;
          admin_notify_email: string | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["settings"]["Row"]>;
        Relationships: [];
      };
      monthly_expenses: {
        Row: {
          id: string;
          month: string; // "YYYY-MM"
          label: string;
          amount: number;
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
      custom_fields: {
        Row: {
          id: string;
          product_id: string | null;
          label: string;
          type: CustomFieldType;
          options: string[] | null; // single_choice/multi_choice 보기 목록
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
      email_templates: {
        Row: {
          purpose:
            | "customer_requested"
            | "customer_confirmed"
            | "customer_cancelled"
            | "customer_reminder"
            | "customer_rescheduled"
            | "admin_new_request";
          subject: string;
          body: string;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["email_templates"]["Row"]
        > & {
          purpose:
            | "customer_requested"
            | "customer_confirmed"
            | "customer_cancelled"
            | "customer_reminder"
            | "customer_rescheduled"
            | "admin_new_request";
          subject: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_templates"]["Row"]>;
        Relationships: [];
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
