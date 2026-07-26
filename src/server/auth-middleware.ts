import { createMiddleware } from "@tanstack/react-start";
import { supabaseAdmin } from "../lib/supabase.server";
import {
  canVerifySupabaseAccessTokenLocally,
  verifySupabaseAccessTokenLocally,
} from "../lib/supabase-jwt.server";
import { parseCookie } from "../lib/cookies";
import { getCachedUserBySupabaseId } from "./user-cache.server";
import { recordMetric, withTiming } from "../lib/metrics.server";

// GoTrue is only ever hit on the network-verify fallback path (local JWKS
// verification never calls out). Logging which path ran per request tells us
// whether GoTrue was called without adding a separate flag.
async function resolveSupabaseUserId(token: string): Promise<string> {
  return withTiming("auth_verify", {}, async () => {
    if (canVerifySupabaseAccessTokenLocally()) {
      const verified = await verifySupabaseAccessTokenLocally(token);
      recordMetric("auth_verify_local");
      if (!verified) {
        throw new Error("Tidak terautentikasi: Sesi tidak valid");
      }
      return verified.supabaseId;
    }

    if (process.env.NODE_ENV === "production") {
      throw new Error("Tidak terautentikasi: Konfigurasi sesi tidak lengkap");
    }

    const {
      data: { user: supaUser },
      error,
    } = await supabaseAdmin.auth.getUser(token);
    recordMetric("auth_verify_network");

    if (error || !supaUser) {
      throw new Error("Tidak terautentikasi: Sesi tidak valid");
    }

    return supaUser.id;
  });
}

export const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = parseCookie(cookieHeader, "sb-access-token");

  if (!token) {
    throw new Error("Tidak terautentikasi: Tidak ada token sesi");
  }

  const supabaseId = await resolveSupabaseUserId(token);

  const user = await getCachedUserBySupabaseId(supabaseId);

  if (!user) {
    throw new Error("Tidak terautentikasi: Pengguna tidak ditemukan");
  }

  return await next({
    context: {
      user,
      tenant: user.tenant,
    },
  });
});
