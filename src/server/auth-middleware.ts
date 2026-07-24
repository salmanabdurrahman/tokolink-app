import { createMiddleware } from "@tanstack/react-start";
import { supabaseAdmin } from "../lib/supabase.server";
import { prisma } from "../db";

function parseCookie(cookieString: string, name: string): string | null {
  const match = cookieString.match(new RegExp("(^| )" + name + "=([^;]+)"));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

export const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = parseCookie(cookieHeader, "sb-access-token");

  if (!token) {
    throw new Error("Unauthorized: No session token found");
  }

  const {
    data: { user: supaUser },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !supaUser) {
    throw new Error("Unauthorized: Invalid session");
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId: supaUser.id },
    include: { tenant: true },
  });

  if (!user) {
    throw new Error("Unauthorized: User not found in database");
  }

  return await next({
    context: {
      user,
      tenant: user.tenant,
    },
  });
});
