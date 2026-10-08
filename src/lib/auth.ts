/**
 * Auth helpers for the admin module (feature 005).
 * Thin typed wrappers over Supabase Auth; components never touch the SDK directly.
 * Error copy is mapped per contracts/auth-contract.md §3 (ERR-01).
 */
import { getSupabaseClient } from "./data/supabase-client";
import { DataError } from "./types/domain";

export interface ActiveSession {
  email: string;
}

/** Returns the active session identity, or null when signed out (FR-001/FR-006). */
export async function getActiveSession(): Promise<ActiveSession | null> {
  const client = getSupabaseClient();
  const { data } = await client.auth.getSession();
  const email = data.session?.user?.email;
  return email ? { email } : null;
}

/** Signs in with email + password (FR-002); throws a typed, user-facing DataError (FR-003). */
export async function signInWithEmailPassword(email: string, password: string): Promise<ActiveSession> {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new DataError(authErrorMessage(error));
  const sessionEmail = data.user?.email ?? data.session?.user?.email;
  if (!sessionEmail) throw new DataError("Error de autenticación");
  return { email: sessionEmail };
}

/** Ends the session (FR-007/FR-008). */
export async function signOut(): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.auth.signOut();
  if (error) throw new DataError(authErrorMessage(error));
}

/** Subscribes to auth changes; returns an unsubscribe function. */
export function onAuthStateChange(handler: (email: string | null) => void): () => void {
  const client = getSupabaseClient();
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    handler(session?.user?.email ?? null);
  });
  return () => data.subscription.unsubscribe();
}

function authErrorMessage(error: { code?: string; message?: string }): string {
  const code = error?.code ?? "";
  const message = (error?.message ?? "").toLowerCase();
  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return "Credenciales incorrectas";
  }
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout") ||
    message.includes("offline")
  ) {
    return "No se pudo conectar. Intentalo de nuevo";
  }
  return "Error de autenticación";
}