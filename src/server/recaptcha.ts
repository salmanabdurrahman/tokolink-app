export async function verifyRecaptcha(token: string, expectedAction: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.warn("RECAPTCHA_SECRET_KEY is missing on server, bypassing validation in development");
    return true;
  }

  if (token === "disabled" || token === "not-loaded" || token === "failed") {
    if (process.env.NODE_ENV === "production") {
      console.error("reCAPTCHA bypass token rejected in production environment.");
      return false;
    }
    console.warn(`reCAPTCHA server verification bypassed because client token status is: ${token}`);
    return true;
  }

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await res.json();
    return !!(data.success && data.score >= 0.5 && data.action === expectedAction);
  } catch (err) {
    console.error("reCAPTCHA server-side request failed:", err);
    return false;
  }
}
