import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() =>
  vi.fn(async (): Promise<{ data: { id: string } | null; error: { message: string } | null }> => ({
    data: { id: "email-1" },
    error: null,
  })),
);

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
        subject: "Status pencairan Tokolink: Dibayar",
        text: expect.stringContaining("sekarang Dibayar"),
      }),
    );
  });

  it("falls back to raw status when withdrawal status has no label", async () => {
    const { sendWithdrawalStatusEmail } = await loadEmail();

    await sendWithdrawalStatusEmail("tenant@example.com", 50000, "UNKNOWN_STATUS");

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Status pencairan Tokolink: UNKNOWN_STATUS",
      }),
    );
  });
});

describe("email error paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws Indonesian error when OTP send fails", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "provider down" } });
    const { sendVerificationEmail } = await loadEmail();

    await expect(sendVerificationEmail("user@example.com", "123456")).rejects.toThrow(
      "Gagal mengirim kode verifikasi email: provider down",
    );
  });

  it("throws Indonesian error when order receipt send fails", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "provider down" } });
    const { sendOrderReceiptEmail } = await loadEmail();

    await expect(sendOrderReceiptEmail("buyer@example.com", "TL1", 36000)).rejects.toThrow(
      "Gagal mengirim receipt order: provider down",
    );
  });

  it("throws Indonesian error when tenant order notification send fails", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "provider down" } });
    const { sendTenantOrderNotificationEmail } = await loadEmail();

    await expect(
      sendTenantOrderNotificationEmail("tenant@example.com", "TL1", 36000),
    ).rejects.toThrow("Gagal mengirim notifikasi order: provider down");
  });

  it("throws Indonesian error when withdrawal request send fails", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "provider down" } });
    const { sendWithdrawalRequestEmail } = await loadEmail();

    await expect(sendWithdrawalRequestEmail("tenant@example.com", 50000)).rejects.toThrow(
      "Gagal mengirim email pencairan: provider down",
    );
  });

  it("throws Indonesian error when withdrawal status send fails", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "provider down" } });
    const { sendWithdrawalStatusEmail } = await loadEmail();

    await expect(sendWithdrawalStatusEmail("tenant@example.com", 50000, "PAID")).rejects.toThrow(
      "Gagal mengirim email status pencairan: provider down",
    );
  });

  it("logs instead of throwing when welcome email send fails", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "provider down" } });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { sendWelcomeEmail } = await loadEmail();

    await expect(sendWelcomeEmail("user@example.com", "Budi")).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Gagal mengirim welcome email ke user@example.com:",
      "provider down",
    );
    consoleErrorSpy.mockRestore();
  });
});

describe("email dev fallback (no RESEND_API_KEY)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function loadEmailWithoutResend() {
    vi.resetModules();
    delete process.env.RESEND_API_KEY;
    return import("./email");
  }

  it("logs and skips sending OTP email when Resend is not configured", async () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sendVerificationEmail } = await loadEmailWithoutResend();

    await expect(sendVerificationEmail("user@example.com", "123456")).resolves.toBeUndefined();

    expect(sendMock).not.toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  it("logs and skips sending order receipt email when Resend is not configured", async () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sendOrderReceiptEmail } = await loadEmailWithoutResend();

    await expect(sendOrderReceiptEmail("buyer@example.com", "TL1", 36000)).resolves.toBeUndefined();

    expect(sendMock).not.toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  it("logs and skips sending tenant order notification when Resend is not configured", async () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sendTenantOrderNotificationEmail } = await loadEmailWithoutResend();

    await expect(
      sendTenantOrderNotificationEmail("tenant@example.com", "TL1", 36000),
    ).resolves.toBeUndefined();

    expect(sendMock).not.toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  it("logs and skips sending withdrawal request email when Resend is not configured", async () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sendWithdrawalRequestEmail } = await loadEmailWithoutResend();

    await expect(sendWithdrawalRequestEmail("tenant@example.com", 50000)).resolves.toBeUndefined();

    expect(sendMock).not.toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  it("logs and skips sending withdrawal status email when Resend is not configured", async () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sendWithdrawalStatusEmail } = await loadEmailWithoutResend();

    await expect(
      sendWithdrawalStatusEmail("tenant@example.com", 50000, "PAID"),
    ).resolves.toBeUndefined();

    expect(sendMock).not.toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  it("logs and skips sending welcome email when Resend is not configured", async () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sendWelcomeEmail } = await loadEmailWithoutResend();

    await expect(sendWelcomeEmail("user@example.com", "Budi")).resolves.toBeUndefined();

    expect(sendMock).not.toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });
});
