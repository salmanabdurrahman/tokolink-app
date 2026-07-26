import { createMiddleware } from "@tanstack/react-start";
import { supabaseAdmin } from "../lib/supabase.server";
import {
  canVerifySupabaseAccessTokenLocally,
  verifySupabaseAccessTokenLocally,
} from "../lib/supabase-jwt.server";
import { prisma } from "../db";
import { parseCookie } from "../lib/cookies";

async function resolveSupabaseUserId(token: string): Promise<string> {
  if (canVerifySupabaseAccessTokenLocally()) {
    const verified = await verifySupabaseAccessTokenLocally(token);
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

  if (error || !supaUser) {
    throw new Error("Tidak terautentikasi: Sesi tidak valid");
  }

  return supaUser.id;
}

export const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = parseCookie(cookieHeader, "sb-access-token");

  if (!token) {
    throw new Error("Tidak terautentikasi: Tidak ada token sesi");
  }

  const supabaseId = await resolveSupabaseUserId(token);

  const user = await prisma.user.findUnique({
    where: { supabaseId },
    include: { tenant: true },
  });

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
