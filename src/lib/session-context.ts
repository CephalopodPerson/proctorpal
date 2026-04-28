// Helpers for resolving the current student session from the cookie.
// Used by all /api/student/* and /api/session/* routes.

import { cookies } from "next/headers";
import { verifySessionToken } from "./session-token";

export const SESSION_COOKIE = "pt_session";

export async function getStudentSessionContext() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  return payload;
}
