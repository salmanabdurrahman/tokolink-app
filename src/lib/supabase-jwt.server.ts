import { decodeProtectedHeader, importJWK, jwtVerify, type JWK } from "jose";

const SUPABASE_JWT_AUDIENCE = "authenticated";

// Supabase Auth signing keys are asymmetric (ES256 default, RS256 legacy option).
// HS256/none are intentionally excluded to avoid algorithm-confusion attacks.
const ALLOWED_ALGORITHMS = new Set(["ES256", "RS256"]);

// Matches Supabase's own JWKS edge cache duration; keeps this local verify path
// network-free on the hot path while still picking up key rotation quickly.
const JWKS_CACHE_TTL_MS = 10 * 60 * 1000;

function getSupabaseProjectUrl() {
  return process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
}

function getSupabaseIssuer() {
  const url = getSupabaseProjectUrl().replace(/\/+$/, "");
  return url ? `${url}/auth/v1` : "";
}

export function canVerifySupabaseAccessTokenLocally() {
  return Boolean(getSupabaseIssuer());
}

export interface VerifiedSupabaseSession {
  supabaseId: string;
}

let jwksCache: { issuer: string; keys: JWK[]; fetchedAt: number } | null = null;

async function getJwksKeys(issuer: string): Promise<JWK[]> {
  const now = Date.now();
  if (jwksCache && jwksCache.issuer === issuer && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.keys;
  }

  const res = await fetch(`${issuer}/.well-known/jwks.json`);
  if (!res.ok) {
    throw new Error(`Failed to fetch Supabase JWKS: ${res.status}`);
  }

  const data = (await res.json()) as { keys?: JWK[] };
  const keys = data.keys ?? [];
  jwksCache = { issuer, keys, fetchedAt: now };
  return keys;
}

/**
 * Verifies a Supabase access token (JWT) locally against the project's public
 * JWKS (asymmetric signing keys, e.g. ES256), avoiding a network round-trip
 * to Supabase Auth on every request. JWKS keys are cached in-memory with a
 * short TTL, so this stays network-free on the hot path.
 * Returns null when the project issuer cannot be resolved or verification
 * fails for any reason (expired, bad signature, wrong issuer/audience,
 * unsupported/mismatched algorithm, unknown key id, malformed).
 */
export async function verifySupabaseAccessTokenLocally(
  token: string,
): Promise<VerifiedSupabaseSession | null> {
  const issuer = getSupabaseIssuer();
  if (!issuer) return null;

  try {
    const header = decodeProtectedHeader(token);
    if (!header.kid || !header.alg || !ALLOWED_ALGORITHMS.has(header.alg)) return null;

    const keys = await getJwksKeys(issuer);
    const jwk = keys.find((key) => key.kid === header.kid);
    if (!jwk) return null;

    const key = await importJWK(jwk, header.alg);
    const { payload } = await jwtVerify(token, key, {
      issuer,
      audience: SUPABASE_JWT_AUDIENCE,
      algorithms: [header.alg],
    });

    if (typeof payload.sub !== "string" || !payload.sub) return null;

    return { supabaseId: payload.sub };
  } catch {
    return null;
  }
}
