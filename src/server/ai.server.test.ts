import { beforeEach, describe, expect, it, vi } from "vitest";
import { createJsonChatCompletion } from "./ai.server";

const originalEnv = process.env;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("ai server client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "secret-key",
      OPENAI_BASE_URL: "https://ai.test/v1",
      OPENAI_MODEL: "test-model",
    };
    global.fetch = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: '{"ok":true}' } }] }),
    ) as any;
  });

  it("throws when API key missing", async () => {
    process.env.OPENAI_API_KEY = "";
    await expect(createJsonChatCompletion({ system: "s", user: "u" })).rejects.toThrow(
      "Konfigurasi AI belum lengkap",
    );
  });

  it("sends chat completion request with model/auth and returns content", async () => {
    await expect(createJsonChatCompletion({ system: "sys", user: "usr" })).resolves.toBe(
      '{"ok":true}',
    );

    expect(fetch).toHaveBeenCalledWith(
      "https://ai.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer secret-key" }),
      }),
    );
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe("test-model");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0]).toEqual({ role: "system", content: "sys" });
  });

  it("maps unauthorized status to readable message", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, 401));
    await expect(createJsonChatCompletion({ system: "s", user: "u" })).rejects.toThrow(
      "Kunci API AI tidak valid",
    );
  });

  it("maps rate limit status to readable message", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, 429));
    await expect(createJsonChatCompletion({ system: "s", user: "u" })).rejects.toThrow(
      "Terlalu banyak permintaan",
    );
  });

  it("maps server error status to readable message", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, 502));
    await expect(createJsonChatCompletion({ system: "s", user: "u" })).rejects.toThrow(
      "Layanan AI sedang bermasalah",
    );
  });

  it("throws readable error when response has no content", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ choices: [{ message: {} }] }));
    await expect(createJsonChatCompletion({ system: "s", user: "u" })).rejects.toThrow(
      "AI tidak memberikan jawaban",
    );
  });

  it("times out and throws readable message", async () => {
    global.fetch = vi.fn(
      () =>
        new Promise((_resolve, reject) => {
          setTimeout(() => reject(new DOMException("aborted", "AbortError")), 5);
        }),
    ) as any;
    await expect(createJsonChatCompletion({ system: "s", user: "u" })).rejects.toThrow(
      "AI terlalu lama merespons",
    );
  });
});
