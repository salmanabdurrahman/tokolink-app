declare global {
  interface Window {
    grecaptcha: any;
  }
}

function waitForGrecaptcha(maxWaitMs = 10_000, pollMs = 200): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.grecaptcha) {
      resolve();
      return;
    }

    const start = Date.now();

    const poll = () => {
      if (window.grecaptcha) {
        resolve();
        return;
      }
      if (Date.now() - start >= maxWaitMs) {
        reject(new Error("reCAPTCHA script load timeout"));
        return;
      }
      setTimeout(poll, pollMs);
    };

    poll();
  });
}

export async function getRecaptchaToken(action: string): Promise<string> {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    console.warn("reCAPTCHA site key is missing, skipping client-side validation");
    return "disabled";
  }

  try {
    await waitForGrecaptcha();
  } catch {
    console.warn("reCAPTCHA script not loaded within timeout, skipping");
    return "not-loaded";
  }

  return new Promise((resolve) => {
    window.grecaptcha.ready(() => {
      window.grecaptcha
        .execute(siteKey, { action })
        .then((token: string) => {
          resolve(token);
        })
        .catch((err: any) => {
          console.error("reCAPTCHA execution failed:", err);
          resolve("failed");
        });
    });
  });
}
