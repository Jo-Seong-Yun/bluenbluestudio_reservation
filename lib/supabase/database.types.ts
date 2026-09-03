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
          period: string;
          shoot_start: string;
          shoot_end: string;
          status: ReservationStatus;
          customer_name: string;
          customer_phone: string;
          people_count: number | null;
          memo: string | null;
          admin_memo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reservations"]["Row"]> & {
          code: string;
          product_id: string;
          period: string;
          shoot_start: string;
          shoot_end: string;
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
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["settings"]["Row"]>;
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
    };
  };
}
