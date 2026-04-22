import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let singleton: SupabaseClient | null | undefined;

/**
 * Una sola instancia de cliente en el navegador evita la advertencia de
 * Supabase (múltiples GoTrueClient con la misma storage key) y problemas
 * con Realtime bajo React Strict Mode o re-renders.
 */
export function getBrowserSupabaseClient(): SupabaseClient | null {
  if (singleton !== undefined) return singleton;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    singleton = null;
    return null;
  }

  singleton = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return singleton;
}
