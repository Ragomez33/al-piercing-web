/**
 * Clean Supabase Database types for ALPIERCING.
 *
 * Mirrors the SQL applied to the Supabase project (migrations 0001–0005):
 *   - bookings    (booking_date, time_slot, …)
 *   - products    (category, price_cents, stock, published, …)
 *   - time_blocks (block_date, time_slot, duration_minutes, label)
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
          service_id: string | null;
          service_name: string;
          price_cents: number;
          deposit_cents: number;
          booking_date: string;
          time_slot: string;
          status: string;
          notes: string | null;
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
        };
        Relationships: [
          {
            foreignKeyName: "bookings_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}