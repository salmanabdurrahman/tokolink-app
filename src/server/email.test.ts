import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn(async () => ({ data: { id: "email-1" }, error: null })));

vi.mock("resend", () => ({
  Resend: vi.fn(function Resend() {
    return { emails: { send: sendMock } };
  }),
}));

const sender = "Tokolink Test <test@example.com>";

async function loadEmail() {
  vi.resetModules();
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.RESEND_SENDER_EMAIL = sender;
  return import("./email");
}

describe("email payloads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends OTP email payload", async () => {
    const { sendVerificationEmail } = await loadEmail();

    await sendVerificationEmail("user@example.com", "123456");

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: sender,
        to: "user@example.com",
        subject: "Kode Verifikasi Tokolink: 123456",
        text: expect.stringContaining("KODE VERIFIKASI: 123456"),
        html: expect.stringContaining("123456"),
      }),
    );
  });

  it("sends welcome email payload", async () => {
    const { sendWelcomeEmail } = await loadEmail();

    await sendWelcomeEmail("user@example.com", "Budi");

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: sender,
        to: "user@example.com",
        subject: "Selamat Datang di Tokolink! 🚀",
        text: expect.stringContaining("Halo Budi"),
      }),
    );
  });

  it("sends order paid receipt payload", async () => {
    const { sendOrderReceiptEmail } = await loadEmail();

    await sendOrderReceiptEmail("buyer@example.com", "TL1", 36000);

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "buyer@example.com",
        subject: "Receipt Tokolink TL1",
        text: expect.stringContaining("Rp36.000"),
      }),
    );
  });

  it("sends tenant order notification payload", async () => {
    const { sendTenantOrderNotificationEmail } = await loadEmail();

    await sendTenantOrderNotificationEmail("tenant@example.com", "TL1", 36000);

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "tenant@example.com",
        subject: "Order baru dibayar: TL1",
        text: expect.stringContaining("Silakan proses fulfillment"),
      }),
    );
  });

  it("sends withdrawal request payload", async () => {
    const { sendWithdrawalRequestEmail } = await loadEmail();

    await sendWithdrawalRequestEmail("tenant@example.com", 50000);

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "tenant@example.com",
        subject: "Request pencairan Tokolink diterima",
        text: expect.stringContaining("Rp50.000"),
      }),
    );
  });

  it("sends withdrawal status payload", async () => {
    const { sendWithdrawalStatusEmail } = await loadEmail();

    await sendWithdrawalStatusEmail("tenant@example.com", 50000, "PAID");

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "tenant@example.com",
        subject: "Status pencairan Tokolink: dibayar",
        text: expect.stringContaining("sekarang dibayar"),
      }),
    );
  });
});
