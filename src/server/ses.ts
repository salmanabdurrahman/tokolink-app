import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function sendVerificationEmail(email: string, code: string) {
  const subject = `Kode Verifikasi Tokolink: ${code}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Space Grotesk', 'Inter', -apple-system, sans-serif;
            background-color: #0A0A0A;
            color: #FFFFFF;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 500px;
            margin: 40px auto;
            padding: 40px 32px;
            background-color: #121212;
            border: 1px solid #1F1F1F;
            border-radius: 24px;
            text-align: center;
          }
          .logo {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 32px;
            letter-spacing: -0.05em;
            color: #FFFFFF;
          }
          .logo span {
            color: #555555;
          }
          h1 {
            font-size: 22px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #FFFFFF;
            letter-spacing: -0.02em;
          }
          p {
            font-size: 14px;
            line-height: 22px;
            color: #8C8C8C;
            margin-bottom: 24px;
          }
          .code-box {
            display: inline-block;
            background-color: #1A1A1A;
            border: 1px solid #2A2A2A;
            padding: 18px 36px;
            border-radius: 16px;
            font-family: monospace;
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 8px;
            color: #D4FF33;
            margin-bottom: 28px;
          }
          .footer {
            font-size: 11px;
            color: #444444;
            margin-top: 40px;
            border-top: 1px solid #1F1F1F;
            padding-top: 20px;
            line-height: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">tokolink<span>/</span></div>
          <h1>Verifikasi email kamu</h1>
          <p>Terima kasih telah bergabung di Tokolink! Gunakan kode verifikasi di bawah ini untuk menyelesaikan pendaftaran akun kamu:</p>
          <div class="code-box">${code}</div>
          <p>Kode ini berlaku selama <strong>10 menit</strong>. Harap tidak membagikan kode ini kepada siapapun.</p>
          <div class="footer">
            Email ini dikirim secara otomatis. Jika kamu tidak merasa mendaftar di Tokolink, abaikan email ini.<br>
            &copy; 2026 Tokolink.
          </div>
        </div>
      </body>
    </html>
  `;

  const textBody = `
Verifikasi Email Tokolink

Halo,
Terima kasih telah bergabung di Tokolink! Gunakan kode verifikasi di bawah ini untuk menyelesaikan pendaftaran:

KODE VERIFIKASI: ${code}

Kode ini berlaku selama 10 menit. Harap tidak membagikan kode ini kepada siapapun.

Jika Anda tidak mendaftar di Tokolink, silakan abaikan email ini secara aman.

Salam hangat,
Tim Tokolink
  `;

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.log("==================================================");
    console.log(`[DEV SES FALLBACK] Send verification email to: ${email}`);
    console.log(`[DEV SES FALLBACK] Subject: ${subject}`);
    console.log(`[DEV SES FALLBACK] Verification Code: ${code}`);
    console.log("==================================================");
    return;
  }

  const sender = process.env.SES_SENDER_EMAIL || "noreply@tokolink.app";

  const command = new SendEmailCommand({
    Source: sender,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: "UTF-8",
        },
        Text: {
          Data: textBody,
          Charset: "UTF-8",
        },
      },
    },
  });

  await sesClient.send(command);
}
