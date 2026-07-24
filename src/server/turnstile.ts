type TurnstileSiteverifyResponse = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
  "error-codes"?: string[];
};

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function parseAllowedHostnames() {
  return (process.env.TURNSTILE_ALLOWED_HOSTNAMES || "")
    .split(",")
    .map((hostname) => hostname.trim())
    .filter(Boolean);
}

function isAllowedHostname(hostname: string | undefined) {
  const allowedHostnames = parseAllowedHostnames();
  if (allowedHostnames.length === 0) return true;
  return !!hostname && allowedHostnames.includes(hostname);
}

export async function verifyTurnstile(token: string, expectedAction: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  if (!secretKey) {
    if (isProduction) {
      console.error("TURNSTILE_SECRET_KEY is missing in production.");
      return false;
    }

    console.warn("TURNSTILE_SECRET_KEY is missing on server, bypassing validation in development");
    return true;
  }

  if (!token || token === "disabled") {
    console.error("Turnstile token missing or disabled.");
    return false;
  }

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    if (!res.ok) {
      console.error(`Turnstile server-side request failed with status ${res.status}`);
      return false;
    }

    const data = (await res.json()) as TurnstileSiteverifyResponse;
    if (!data.success) {
      console.error("Turnstile verification failed:", data["error-codes"] ?? []);
      return false;
    }

    if (data.action && data.action !== expectedAction) {
      console.error("Turnstile action mismatch.");
      return false;
    }

    if (!isAllowedHostname(data.hostname)) {
      console.error("Turnstile hostname mismatch.");
      return false;
    }

    return true;
  } catch (err) {
    console.error("Turnstile server-side request failed:", err);
    return false;
  }
}
