declare global {
  interface Window {
    grecaptcha: any;
  }
}

export async function getRecaptchaToken(action: string): Promise<string> {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    console.warn("reCAPTCHA site key is missing, skipping client-side validation");
    return "disabled";
  }

  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.grecaptcha) {
      console.warn("window.grecaptcha not loaded yet, skipping");
      resolve("not-loaded");
      return;
    }

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
