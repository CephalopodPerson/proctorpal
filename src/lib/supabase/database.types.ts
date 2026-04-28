// Placeholder Database type. Replace with generated types via:
//   npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
//
// Until then, `any` gives us the permissive defaults the SDK had pre-2.46.
// Keeping this in source means the runtime still gets full table access; we
// just lose row-level type safety, which is acceptable for v0.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
