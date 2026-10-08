/**
 * Single shared Supabase client (feature 005, research §1).
 * Auth and the production data adapter use the SAME instance so every `bookings`/`products`
 * request carries the authenticated session (spec §3, FR-009).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DataError } from "../types/domain";

let client: SupabaseClient | null = null;

function envValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isSupabaseConfigured(): boolean {
  return (
    envValue(import.meta.env.PUBLIC_SUPABASE_URL).length > 0 &&
    envValue(import.meta.env.PUBLIC_SUPABASE_ANON_KEY).length > 0
  );
}

export function getSupabaseClient(): SupabaseClient {
  const url = envValue(import.meta.env.PUBLIC_SUPABASE_URL);
  const anon = envValue(import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anon) {
    throw new DataError("Supabase no está configurado");
  }
  if (!client) {
    client = createClient(url, anon);
  }
  return client;
}