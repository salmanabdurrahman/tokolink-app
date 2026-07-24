import { createMiddleware } from "@tanstack/react-start";
import { supabaseAdmin } from "../lib/supabase.server";
import { prisma } from "../db";
import { parseCookie } from "../lib/cookies";

export const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = parseCookie(cookieHeader, "sb-access-token");

  if (!token) {
    throw new Error("Tidak terautentikasi: Tidak ada token sesi");
  }

  const {
    data: { user: supaUser },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !supaUser) {
    throw new Error("Tidak terautentikasi: Sesi tidak valid");
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId: supaUser.id },
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
