import { createClient } from "@supabase/supabase-js";

// Fall back to placeholder values when env vars are absent (e.g. the
// organised-peen Vercel project which only has NEXT_PUBLIC_APP_PIN set).
// createClient throws synchronously on undefined/empty inputs, which would
// crash every page that imports this module.  With placeholders the client
// initialises fine; each component's own try/catch handles the resulting
// network errors and hides itself gracefully.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL    ?? "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key"
);
