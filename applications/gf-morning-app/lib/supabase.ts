import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL    ?? "https://placeholder.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

// True only when real credentials are configured.
// Components check this first — if false they skip the network call entirely
// and use localStorage immediately (no 10-second timeout hang).
export const SUPABASE_ENABLED =
  url !== "https://placeholder.supabase.co" && key !== "placeholder-anon-key";

export const supabase = createClient(url, key);
