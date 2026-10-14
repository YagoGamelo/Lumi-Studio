"use client";
import { createBrowserClient } from "@supabase/ssr";

// Estas variáveis são públicas (publishable/anon); nunca usar service_role no browser.
export const authConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function browserDb() {
  if (!authConfigured) {
    throw new Error("Supabase não configurado. Define NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY antes de registar utilizadores.");
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
