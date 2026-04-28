// Signed, short-lived tokens for student sessions.
//
// Students don't have Supabase Auth accounts. After they enter a valid
// access code + student ID, the API issues a token that scopes their
// subsequent requests to a single session_id. The token is HMAC-signed
// with SESSION_SIGNING_SECRET and stored in an httpOnly cookie.
//
// Edge runtime supported - we use Web Crypto + atob/btoa, not Node Buffer.

const ENC = new TextEncoder();
const DEC = new TextDecoder();

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Returns a Uint8Array whose underlying buffer is concretely an ArrayBuffer
// (not SharedArrayBuffer / ArrayBufferLike), which is what Web Crypto's
// BufferSource parameter requires under TypeScript 5.7+.
function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const buffer = new ArrayBuffer(bin.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function key() {
  const secret = process.env.SESSION_SIGNING_SECRET;
  if (!secret) throw new Error("SESSION_SIGNING_SECRET not set");
  return crypto.subtle.importKey(
    "raw",
    ENC.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export interface SessionTokenPayload {
  sid: string;             // session id
  aid: string;             // assignment id
  iat: number;             // issued-at (seconds)
  exp: number;             // expires (seconds)
  fp: string;              // device fingerprint hash, opaque
}

export async function signSessionToken(payload: SessionTokenPayload): Promise<string> {
  const json = JSON.stringify(payload);
  const body = b64urlEncode(ENC.encode(json));
  const sig = await crypto.subtle.sign("HMAC", await key(), ENC.encode(body));
  return body + "." + b64urlEncode(new Uint8Array(sig));
}

export async function verifySessionToken(
  token: string
): Promise<SessionTokenPayload | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify(
    "HMAC",
    await key(),
    b64urlDecode(sig),
    ENC.encode(body)
  );
  if (!ok) return null;
  try {
    const payload = JSON.parse(DEC.decode(b64urlDecode(body))) as SessionTokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function deviceFingerprintFromHeaders(
  userAgent: string,
  ip: string
): string {
  // Cheap, stable enough fingerprint. We're not trying to defeat a
  // determined attacker - we only want to detect "different machine".
  // The real IP comes from x-forwarded-for in production.
  return userAgent + "::" + ip;
}
