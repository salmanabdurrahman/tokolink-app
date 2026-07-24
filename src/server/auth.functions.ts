import { createServerFn } from "@tanstack/react-start";
import { prisma } from "../db";
import { supabaseAdmin } from "../lib/supabase.server";
import { sendVerificationEmail, sendWelcomeEmail } from "./email";
import crypto from "crypto";
import { z } from "zod";
import { parseCookie } from "../lib/cookies";
import { enforceAuthRateLimit, hashOtp, logAuthAbuse, normalizeEmail } from "./auth-abuse";
import { recordMetric } from "../lib/metrics.server";

type ServerFnRequestContext = { request?: Request };
type ServerFnDataContext<TData> = ServerFnRequestContext & { data: TData };

function withRequest<TContext>(context: TContext) {
  return context as TContext & ServerFnRequestContext;
}

const syncSessionSchema = z
  .object({
    name: z.string().optional(),
    avatarUrl: z.string().optional(),
  })
  .optional();

export const getSessionUser = createServerFn({ method: "GET" }).handler(async (context) => {
  const { request } = withRequest(context);
  const cookieHeader = request?.headers.get("cookie") ?? "";
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

export const syncSession = createServerFn({ method: "POST" })
  .validator(syncSessionSchema)
  .handler(async (context) => {
    const { data, request } = withRequest(context) as ServerFnDataContext<
      z.infer<typeof syncSessionSchema>
    >;
    const cookieHeader = request?.headers.get("cookie") ?? "";
    const token = parseCookie(cookieHeader, "sb-access-token");
    if (!token) {
      throw new Error("Tidak terautentikasi: Tidak ada token sesi");
    }

    const {
      data: { user: supaUser },
      error,
    } = await supabaseAdmin.auth.getUser(token);
    if (error || !supaUser) {
      throw new Error("Tidak terautentikasi: Token sesi tidak valid");
    }

    const name =
      data?.name || supaUser.user_metadata?.name || supaUser.user_metadata?.full_name || null;
    const avatarUrl = data?.avatarUrl || supaUser.user_metadata?.avatar_url || null;
    const provider = supaUser.app_metadata.provider || "email";

    if (provider === "email" && !supaUser.email_confirmed_at) {
      throw new Error("Email belum diverifikasi.");
    }

    const user = await prisma.user.upsert({
      where: { supabaseId: supaUser.id },
      create: {
        supabaseId: supaUser.id,
        email: normalizeEmail(supaUser.email!),
        name,
        avatarUrl,
        provider,
        emailVerified: provider !== "email" ? new Date() : null,
      },
      update: {
        email: normalizeEmail(supaUser.email!),
        name: name || undefined,
        avatarUrl: avatarUrl || undefined,
        provider,
        emailVerified: provider !== "email" ? new Date() : undefined,
      },
      include: {
        tenant: true,
      },
    });

    return user;
  });

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const resendSchema = z.object({
  email: z.string().email(),
});

async function generateAndSendOTP(email: string) {
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.verificationCode.upsert({
    where: { email },
    create: {
      email,
      codeHash: hashOtp(code),
      expiresAt,
      attempts: 0,
    },
    update: {
      codeHash: hashOtp(code),
      expiresAt,
      attempts: 0,
      createdAt: new Date(),
    },
  });

  await sendVerificationEmail(email, code);
}

export const registerUser = createServerFn({ method: "POST" })
  .validator(registerSchema)
  .handler(async (context) => {
    const { data, request } = withRequest(context) as ServerFnDataContext<
      z.infer<typeof registerSchema>
    >;
    const email = normalizeEmail(data.email);
    const { password } = data;

    await enforceAuthRateLimit({ event: "signup", email, request });

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.emailVerified) {
        throw new Error("Email sudah terdaftar. Silakan masuk.");
      }

      await supabaseAdmin.auth.admin.updateUserById(existingUser.supabaseId, {
        password,
      });

      await generateAndSendOTP(email);
      await logAuthAbuse({ event: "signup", email, request, outcome: "success" });
      recordMetric("signup_success");
      return { success: true, message: "Kode verifikasi telah dikirim ulang." };
    }

    try {
      const { data: supaUser, error: supaError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
      });

      if (supaError) {
        throw new Error(supaError.message);
      }

      if (!supaUser || !supaUser.user) {
        throw new Error("Gagal membuat akun.");
      }

      await prisma.user.create({
        data: {
          email,
          supabaseId: supaUser.user.id,
          provider: "email",
          emailVerified: null,
        },
      });

      await generateAndSendOTP(email);
      await logAuthAbuse({ event: "signup", email, request, outcome: "success" });
      recordMetric("signup_success");
      return { success: true, message: "Kode verifikasi telah dikirim." };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal melakukan registrasi.";
      recordMetric("signup_fail", { reason: message });
      throw new Error(message || "Gagal melakukan registrasi.");
    }
  });

export const verifySignUpCode = createServerFn({ method: "POST" })
  .validator(verifyCodeSchema)
  .handler(async (context) => {
    const { data, request } = withRequest(context) as ServerFnDataContext<
      z.infer<typeof verifyCodeSchema>
    >;
    const email = normalizeEmail(data.email);
    const { code } = data;

    await enforceAuthRateLimit({ event: "verify_signup_code", email, request });

    const record = await prisma.verificationCode.findUnique({
      where: { email },
    });

    if (!record) {
      throw new Error("Kode verifikasi tidak ditemukan. Silakan kirim ulang.");
    }

    if (new Date() > record.expiresAt) {
      throw new Error("Kode verifikasi telah kedaluwarsa. Silakan kirim ulang.");
    }

    const newAttempts = record.attempts + 1;
    if (newAttempts > 5) {
      await prisma.verificationCode.delete({ where: { email } });
      throw new Error("Terlalu banyak percobaan salah. Silakan minta kode baru.");
    }

    await prisma.verificationCode.update({
      where: { email },
      data: { attempts: newAttempts },
    });

    if (record.codeHash !== hashOtp(code)) {
      await logAuthAbuse({ event: "verify_signup_code", email, request, outcome: "failed" });
      recordMetric("otp_fail");
      throw new Error(`Kode verifikasi salah. Sisa percobaan: ${5 - newAttempts}`);
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("Pengguna tidak ditemukan.");
    }

    const { error: supaError } = await supabaseAdmin.auth.admin.updateUserById(user.supabaseId, {
      email_confirm: true,
    });

    if (supaError) {
      throw new Error(supaError.message);
    }

    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    await prisma.verificationCode.delete({
      where: { email },
    });

    await logAuthAbuse({ event: "verify_signup_code", email, request, outcome: "success" });

    sendWelcomeEmail(email, user.name || email).catch((err) => {
      console.error("Failed to send welcome email:", err);
    });

    return { success: true, message: "Email berhasil diverifikasi." };
  });

export const resendSignUpCode = createServerFn({ method: "POST" })
  .validator(resendSchema)
  .handler(async (context) => {
    const { data, request } = withRequest(context) as ServerFnDataContext<
      z.infer<typeof resendSchema>
    >;
    const email = normalizeEmail(data.email);

    await enforceAuthRateLimit({ event: "resend_signup_code", email, request });

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("Email tidak terdaftar.");
    }

    if (user.emailVerified) {
      throw new Error("Email sudah terverifikasi.");
    }

    const existing = await prisma.verificationCode.findUnique({
      where: { email },
    });

    if (existing) {
      const secondsElapsed = (Date.now() - new Date(existing.createdAt).getTime()) / 1000;
      if (secondsElapsed < 60) {
        throw new Error(`Tunggu ${Math.ceil(60 - secondsElapsed)} detik sebelum mengirim ulang.`);
      }
    }

    await generateAndSendOTP(email);
    await logAuthAbuse({ event: "resend_signup_code", email, request, outcome: "success" });
    return { success: true, message: "Kode verifikasi baru dikirim." };
  });
