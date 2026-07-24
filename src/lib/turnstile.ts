export type TurnstileInstance = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      size?: "normal" | "compact" | "flexible" | "invisible";
      callback?: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
    },
  ) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId?: string) => void;
  remove?: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileInstance;
  }
}

let scriptPromise: Promise<void> | null = null;
let widgetId: string | null = null;
let widgetAction: string | null = null;
let widgetContainer: HTMLDivElement | null = null;

function loadTurnstileScript(maxWaitMs = 10_000): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Turnstile hanya tersedia di browser"));
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );

    const timeout = window.setTimeout(() => {
      reject(new Error("Turnstile script load timeout"));
    }, maxWaitMs);

    const done = () => {
      window.clearTimeout(timeout);
      resolve();
    };

    if (existing) {
      existing.addEventListener("load", done, { once: true });
      existing.addEventListener(
        "error",
        () => {
          window.clearTimeout(timeout);
          reject(new Error("Turnstile script gagal dimuat"));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = done;
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("Turnstile script gagal dimuat"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

function ensureWidgetContainer() {
  if (widgetContainer) return widgetContainer;

  widgetContainer = document.createElement("div");
  widgetContainer.setAttribute("aria-hidden", "true");
  widgetContainer.style.position = "fixed";
  widgetContainer.style.left = "-9999px";
  widgetContainer.style.bottom = "0";
  document.body.appendChild(widgetContainer);
  return widgetContainer;
}

export function resetTurnstileWidget() {
  if (typeof window === "undefined" || !window.turnstile || !widgetId) return;
  window.turnstile.reset(widgetId);
}

function removeTurnstileWidget(turnstile: TurnstileInstance) {
  if (!widgetId) return;
  turnstile.remove?.(widgetId);
  widgetId = null;
  widgetAction = null;
}

export async function getTurnstileToken(action: string): Promise<string> {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  if (!siteKey) {
    console.warn("Turnstile site key is missing, skipping client-side validation");
    return "disabled";
  }

  await loadTurnstileScript();

  const turnstile = window.turnstile;
  if (!turnstile) {
    throw new Error("Turnstile belum siap. Silakan coba lagi.");
  }

  return new Promise((resolve, reject) => {
    const rejectWithReset = (message: string) => {
      resetTurnstileWidget();
      reject(new Error(message));
    };

    try {
      if (widgetId && widgetAction !== action) {
        removeTurnstileWidget(turnstile);
      }

      if (!widgetId) {
        widgetAction = action;
        widgetId = turnstile.render(ensureWidgetContainer(), {
          sitekey: siteKey,
          size: "invisible",
          action,
          callback: (token) => resolve(token),
          "error-callback": () => rejectWithReset("Verifikasi Turnstile gagal. Silakan coba lagi."),
          "expired-callback": () =>
            rejectWithReset("Verifikasi Turnstile kedaluwarsa. Silakan coba lagi."),
        });
      } else {
        resetTurnstileWidget();
      }

      turnstile.execute(widgetId);
    } catch {
      rejectWithReset("Turnstile gagal dijalankan. Silakan coba lagi.");
    }
  });
}
