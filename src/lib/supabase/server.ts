// Server-side Supabase clients.
//
// getSupabaseServer()  - bound to the logged-in teacher's cookies. Use in
//                        Server Components and Route Handlers when acting AS
//                        the teacher. ASYNC in Next.js 15 because cookies()
//                        is now async.
// getSupabaseAdmin()   - uses the secret key. Bypasses RLS. Use ONLY
//                        in route handlers and never expose to the client.
//                        Required for student-facing operations (creating
//                        sessions, saving answers) since students aren't auth'd.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Calling set in Server Components throws; route handlers are fine.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // see above
          }
        },
      },
    }
  );
}

let _admin: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdmin() {
  if (!_admin) {
    _admin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return _admin;
}
