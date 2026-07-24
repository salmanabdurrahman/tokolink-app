# Preview Deploy Checklist

Use this checklist before merging or promoting a preview deploy.

## Quality gate

- CI passes: lint, typecheck, tests, coverage, build, secret scan.
- No new bundle warning beyond documented performance baseline.
- No real secrets committed in source, docs, screenshots, or logs.

## Runtime checks

- Vercel install uses `bun install --frozen-lockfile` and build emits `.vercel/output`.
- Security headers exist on production responses: HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- API responses include `Cache-Control: no-store`; static `/assets/*` responses remain `public, max-age=31536000, immutable`.
- `/api/health` returns `200` with DB, env, and storage configured.
- `/sitemap.xml` includes landing page and public tenant pages.
- `/robots.txt` points to current sitemap URL.
- Public storefront loads, product search works, share/QR works, cart opens.
- Checkout creates pending order with mocked/sandbox Pakasir flow when available.
- Auth/onboarding abuse controls remain active via server-side rate limits; Turnstile enforcement is not required until client token wiring is enabled end-to-end.

## Manual smoke

- Signup/resend/verify OTP with local or sandbox email config.
- Onboarding creates tenant.
- Product image upload stores to R2 public URL.
- Storefront OG image renders for tenant slug.
- Tenant order and withdrawal screens load without cross-tenant data.
