// Server-only OpenAI-compatible chat completion client. Shared by Phase 45
// (AI product copy) and Phase 46 (AI sales insight) so there is one place
// that owns the provider call, timeout, and error mapping.
type AiConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
// Cheap default model; tenants/deploys can override via OPENAI_MODEL.
const DEFAULT_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 20000;
// Cap prompt/response size to bound cost per call regardless of caller input.
const MAX_PROMPT_CHARS = 4000;
const MAX_OUTPUT_TOKENS = 700;

function getConfig(): AiConfig {
  const apiKey = process.env.OPENAI_API_KEY || "";
  const baseUrl = (process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    throw new Error("Konfigurasi AI belum lengkap");
  }

  return { apiKey, baseUrl, model };
}

function truncate(value: string, max = MAX_PROMPT_CHARS) {
  return value.length > max ? value.slice(0, max) : value;
}

function aiErrorMessage(status: number) {
  if (status === 401 || status === 403) {
    return "Kunci API AI tidak valid. Hubungi admin toko.";
  }
  if (status === 429) {
    return "Terlalu banyak permintaan ke layanan AI. Coba lagi nanti.";
  }
  if (status >= 500) {
    return "Layanan AI sedang bermasalah. Coba lagi beberapa saat lagi.";
  }
  return "Gagal menghubungi layanan AI. Coba lagi.";
}

// Calls the chat completion endpoint asking for a JSON object response and
// returns the raw JSON string content. Callers are responsible for
// `JSON.parse` + Zod validation of the shape they expect back.
export async function createJsonChatCompletion({
  system,
  user,
  maxOutputTokens = MAX_OUTPUT_TOKENS,
}: {
  system: string;
  user: string;
  maxOutputTokens?: number;
}): Promise<string> {
  const { apiKey, baseUrl, model } = getConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: truncate(system) },
          { role: "user", content: truncate(user) },
        ],
        max_tokens: maxOutputTokens,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(aiErrorMessage(response.status));
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("AI tidak memberikan jawaban. Coba lagi.");
    }

    return content;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("AI terlalu lama merespons. Coba lagi.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
