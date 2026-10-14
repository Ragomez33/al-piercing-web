/**
 * Clean Supabase Database types for ALPIERCING.
 *
 * Mirrors the SQL applied to the Supabase project (migrations 0001–0008):
 *   - bookings     (booking_date, time_slot, …)
 *   - products     (category, price_cents, stock, published, …)
 *   - time_blocks  (legacy fixed-slot blocks — table kept, no code reads it since 017)
 *   - services     (category, price_cents, duration_minutes, active, …)
 *   - team_members (name, role, avatar_url, bio, instagram_handle, is_active)
 *   - gallery_items (title, category, image_url, is_active, created_at)
 *   - availability_blocks (start_datetime, end_datetime, reason, is_full_day)
 *   - studio_schedule (weekday, is_open, open_time, close_time)
 *   - payment_methods (type, title, details, instructions, is_active)
 *   - booking_events (booking_id, from_status, to_status, created_at)
 *
 * Regenerate with the Supabase CLI once an access token is available:
 *   SUPABASE_ACCESS_TOKEN=... supabase gen types typescript --project-id <ref> > src/types/supabase.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      bookings: {
        Row: {
          id: string;
          created_at: string;
          client_name: string;
          client_whatsapp: string;
          client_email: string;
          service_id: string | null;
          service_name: string;
          price_cents: number;
          deposit_cents: number;
          booking_date: string;
          time_slot: string;
          status: string;
          notes: string | null;
          payment_method_id: string | null;
          payment_method_name: string;
          payment_reference: string;
          payment_proof_url: string;
          /** Generated (`deposit_cents / 100`); read-only. */
          deposit_amount: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          client_name: string;
          client_whatsapp: string;
          service_id: string;
          service_name: string;
          price_cents: number;
          deposit_cents: number;
          booking_date: string;
          time_slot: string;
          status?: string;
          notes?: string | null;
          client_email?: string;
          payment_method_id?: string | null;
          payment_method_name?: string;
          payment_reference?: string;
          payment_proof_url?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          client_name?: string;
          client_whatsapp?: string;
          service_id?: string | null;
          service_name?: string;
          price_cents?: number;
          deposit_cents?: number;
          booking_date?: string;
          time_slot?: string;
          status?: string;
          notes?: string | null;
          client_email?: string;
          payment_method_id?: string | null;
          payment_method_name?: string;
          payment_reference?: string;
          payment_proof_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_payment_method_id_fkey";
            columns: ["payment_method_id"];
            isOneToOne: false;
            referencedRelation: "payment_methods";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          name: string;
          category: string;
          price_cents: number;
          stock: number;
          image: string;
          published: boolean;
        };
        Insert: {
          id: string;
          name: string;
          category: string;
          price_cents: number;
          stock: number;
          image?: string;
          published?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          price_cents?: number;
          stock?: number;
          image?: string;
          published?: boolean;
        };
        Relationships: [];
      };
      time_blocks: {
        Row: {
          id: string;
          created_at: string;
          block_date: string;
          time_slot: string;
          duration_minutes: number;
          label: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          block_date: string;
          time_slot: string;
          duration_minutes: number;
          label: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          block_date?: string;
          time_slot?: string;
          duration_minutes?: number;
          label?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          name: string;
          category: string;
          description: string;
          price_cents: number;
          duration_minutes: number;
          requires_deposit: boolean;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          description?: string;
          price_cents: number;
          duration_minutes: number;
          requires_deposit?: boolean;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          description?: string;
          price_cents?: number;
          duration_minutes?: number;
          requires_deposit?: boolean;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          id: string;
          name: string;
          role: string;
          avatar_url: string;
          bio: string;
          instagram_handle: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          role: string;
          avatar_url?: string;
          bio?: string;
          instagram_handle?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          role?: string;
          avatar_url?: string;
          bio?: string;
          instagram_handle?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      gallery_items: {
        Row: {
          id: string;
          title: string;
          category: string;
          image_url: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title?: string;
          category?: string;
          image_url: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          category?: string;
          image_url?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      availability_blocks: {
        Row: {
          id: string;
          created_at: string;
          start_datetime: string;
          end_datetime: string;
          reason: string;
          is_full_day: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          start_datetime: string;
          end_datetime: string;
          reason?: string;
          is_full_day?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          start_datetime?: string;
          end_datetime?: string;
          reason?: string;
          is_full_day?: boolean;
        };
        Relationships: [];
      };
      studio_schedule: {
        Row: {
          weekday: number;
          is_open: boolean;
          open_time: string | null;
          close_time: string | null;
        };
        Insert: {
          weekday: number;
          is_open?: boolean;
          open_time?: string | null;
          close_time?: string | null;
        };
        Update: {
          weekday?: number;
          is_open?: boolean;
          open_time?: string | null;
          close_time?: string | null;
        };
        Relationships: [];
      };
      payment_methods: {
        Row: {
          id: string;
          created_at: string;
          type: string;
          title: string;
          details: Json;
          instructions: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          type: string;
          title: string;
          details?: Json;
          instructions?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          type?: string;
          title?: string;
          details?: Json;
          instructions?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      booking_events: {
        Row: {
          id: string;
          booking_id: string;
          from_status: string | null;
          to_status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          from_status?: string | null;
          to_status: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          from_status?: string | null;
          to_status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}