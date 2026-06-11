import { createServerFn } from "@tanstack/react-start";
import { prisma } from "../db";
import { supabaseAdmin } from "../lib/supabase.server";
import { z } from "zod";

function parseCookie(cookieString: string, name: string): string | null {
  const match = cookieString.match(new RegExp("(^| )" + name + "=([^;]+)"));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

// Check active session and return User profile + Tenant if exists
export const getSessionUser = createServerFn({ method: "GET" }).handler(async ({ request }) => {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = parseCookie(cookieHeader, "sb-access-token");
  if (!token) return null;

  try {
    const {
      data: { user: supaUser },
      error,
    } = await supabaseAdmin.auth.getUser(token);
    if (error || !supaUser) return null;

    const user = await prisma.user.findUnique({
      where: { supabaseId: supaUser.id },
      include: { tenant: true },
    });
    return user;
  } catch (e) {
    console.error("Error fetching session user:", e);
    return null;
  }
});

// Synchronize Supabase user with local Prisma database
export const syncSession = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        name: z.string().optional(),
        avatarUrl: z.string().optional(),
      })
      .optional(),
  )
  .handler(async ({ data, request }) => {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const token = parseCookie(cookieHeader, "sb-access-token");
    if (!token) {
      throw new Error("Unauthorized: No session token");
    }

    const {
      data: { user: supaUser },
      error,
    } = await supabaseAdmin.auth.getUser(token);
    if (error || !supaUser) {
      throw new Error("Unauthorized: Invalid session token");
    }

    const name =
      data?.name || supaUser.user_metadata?.name || supaUser.user_metadata?.full_name || null;
    const avatarUrl = data?.avatarUrl || supaUser.user_metadata?.avatar_url || null;
    const provider = supaUser.app_metadata.provider || "email";

    const user = await prisma.user.upsert({
      where: { supabaseId: supaUser.id },
      create: {
        supabaseId: supaUser.id,
        email: supaUser.email!,
        name,
        avatarUrl,
        provider,
      },
      update: {
        email: supaUser.email!,
        name: name || undefined,
        avatarUrl: avatarUrl || undefined,
        provider,
      },
      include: {
        tenant: true,
      },
    });

    return user;
  });
