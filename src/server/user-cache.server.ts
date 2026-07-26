import type { Prisma } from "@prisma/client";
import { prisma } from "../db";

// Short-lived in-memory cache for the authenticated Prisma user (+ tenant)
// lookup by Supabase id. Dashboard navigation resolves auth via multiple
// parent+child route loaders within the same short window, each running
// authMiddleware independently; this avoids re-querying Postgres for the
// same user on every one of those calls. Mirrors the JWKS TTL cache in
// `supabase-jwt.server.ts`. TTL is intentionally short so a user's own
// mutation (e.g. updating tenant settings) is invalidated explicitly via
// `invalidateCachedUser` rather than relying on staleness alone.
const USER_CACHE_TTL_MS = 15 * 1000;

export type CachedAuthUser = Prisma.UserGetPayload<{ include: { tenant: true } }>;

type CacheEntry = { user: CachedAuthUser; fetchedAt: number };

const userCache = new Map<string, CacheEntry>();

export async function getCachedUserBySupabaseId(
  supabaseId: string,
): Promise<CachedAuthUser | null> {
  const now = Date.now();
  const cached = userCache.get(supabaseId);
  if (cached && now - cached.fetchedAt < USER_CACHE_TTL_MS) {
    return cached.user;
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId },
    include: { tenant: true },
  });

  if (user) {
    userCache.set(supabaseId, { user, fetchedAt: now });
  } else {
    userCache.delete(supabaseId);
  }

  return user;
}

export function invalidateCachedUser(supabaseId: string | null | undefined) {
  if (!supabaseId) return;
  userCache.delete(supabaseId);
}

/** Test-only: clears the whole cache so unit tests stay isolated between cases. */
export function __clearUserCacheForTests() {
  userCache.clear();
}
