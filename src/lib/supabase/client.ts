// Browser-side Supabase client for teacher pages (uses logged-in user session).
// For student-facing pages we deliberately do NOT use this client; student
// requests go through /api routes that authenticate with a signed session token.
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function getSupabaseBrowser() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
