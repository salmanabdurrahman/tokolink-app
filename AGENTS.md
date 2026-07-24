# AGENTS.md

Project instructions for AI/coding agents working in this repository.

## Project Overview

Tokolink is an open-source, multi-tenant link-in-bio storefront for Indonesian UMKM/MSME merchants. It lets each merchant create one public store page with profile links, product catalog, product variants, client-side cart, and WhatsApp checkout.

Core flow:

1. User authenticates with Supabase Auth.
2. Session sync creates/updates Prisma `User` record.
3. User creates a `Tenant` store during onboarding.
4. Dashboard manages tenant settings, links, products, images, and variants.
5. Public `/$slug` storefront renders tenant data and builds WhatsApp order URLs.

## Non-Negotiable: Follow Existing Patterns

Every change MUST follow existing project patterns. This is mandatory.

Do not introduce new architecture, data flow, UI style, naming style, validation style, state pattern, or server pattern unless explicitly requested and justified by repo evidence.

Before adding or changing logic, inspect analogous files first. Before changing UI, inspect existing UI on the same surface first. Pattern compliance applies to all levels:

- business logic
- auth/session logic
- data access and Prisma queries
- Server Functions and middleware
- Zod validation and error messages
- Zustand store actions
- tests and mocks
- routes, loaders, and metadata
- components and composition
- Tailwind classes, spacing, colors, typography, radius, borders
- loading/empty/error states
- motion/animation behavior
- copy tone and Indonesian user-facing language

If existing pattern conflicts with desired change, stop and explain trade-off before editing.

## Tech Stack

- React 19
- TanStack Start + TanStack Router
- TanStack Start Server Functions
- TypeScript strict mode
- Zustand for client state
- Tailwind CSS v4 with CSS variable design tokens
- Framer Motion for small UI transitions
- Prisma ORM with PostgreSQL
- Supabase Auth
- Cloudflare R2 for media uploads via S3-compatible adapter
- Resend for email
- Cloudflare Turnstile helper/verifier (not enforced end-to-end until client token wiring is active)
- Vitest + Testing Library + jsdom

## Directory Map

```text
src/routes/             TanStack Router file routes and API routes
src/server/             Server Functions, auth middleware, email, upload, storage, provider clients
src/lib/                schemas, stores, utils, Supabase clients, OG helpers, types
src/components/ui/      local reusable UI primitives
src/components/layout/  shared navigation/layout components
src/components/landing/ marketing page sections
src/components/dashboard/ dashboard-specific UI
src/components/storefront/ public storefront UI
src/components/motion/  reusable animation helpers
src/hooks/              auth/session/mobile hooks
src/test/               test setup and factories
prisma/schema.prisma    DB schema and relations
```

## Data Model Pattern

Current domain models:

- `User` owns one optional `Tenant`.
- `Tenant` owns many `Product` and `Link` records.
- `Product` owns ordered `ProductVariantGroup` records.
- `ProductVariantGroup` owns ordered `ProductVariantOption` records.
- `sortOrder` controls display order for links, products, groups, and options.
- Prisma models use camelCase in TypeScript and snake_case DB names via `@map` / `@@map`.
- Tenant-owned data must always be scoped by `tenantId` for mutations.

## Routing Pattern

Follow existing route files in `src/routes`.

- Use `createFileRoute(...)`.
- Keep page-level component in same route file unless component is reused or large.
- Use route `loader` for data needed before render.
- Use route `head` for title, description, Open Graph, Twitter card, canonical links.
- Use `notFound()` for missing public storefront data.
- Do not manually edit `src/routeTree.gen.ts`; it is generated.

## Server Function Pattern

Follow `src/server/*.functions.ts`.

Required pattern:

```ts
export const actionName = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(schema)
  .handler(async ({ data, context }) => {
    // validate tenant context
    // verify ownership when mutating tenant-scoped rows
    // execute Prisma query/transaction
    // return typed data
  });
```

Rules:

- Use `GET` for read functions, `POST` for mutations.
- Validate all input with Zod.
- Put shared schemas in `src/lib/schemas.ts`.
- Protected writes must include `authMiddleware`.
- Never trust client-sent tenant/user IDs for ownership.
- Use `context.tenant?.id` from middleware for protected tenant writes.
- Check ownership with `findFirst({ where: { id, tenantId } })` before update/delete.
- Use Prisma transactions for multi-step relational replacement, especially variants.
- Throw explicit user-facing errors matching existing Indonesian style.

## Auth/Session Pattern

Follow current Supabase + Prisma split.

- Browser auth uses `src/lib/supabase.ts`.
- Server/admin auth uses `src/lib/supabase.server.ts`.
- `useSession()` syncs Supabase session to Prisma via `syncSession`.
- Session cookie name is `sb-access-token`.
- `authMiddleware` verifies Supabase token, loads Prisma user, includes tenant in context.
- Dashboard protection uses `useAuthGuard({ requireTenant: true })`.
- Do not bypass `authMiddleware` for protected dashboard mutations.

## State Pattern

Follow `src/lib/store.ts`.

- Zustand owns client auth, tenant, and cart state.
- Store actions call Server Functions and update state immutably.
- Keep cart as client-side state.
- Keep WhatsApp URL generation in shared store/helper logic.
- Avoid duplicating tenant mutation state in routes unless route-only UI state.

## UI Pattern

UI must match existing Tokolink design. Pixel-level consistency matters.

Use existing primitives first:

- `Button`
- `Input`
- `Textarea`
- `Field`
- `Badge`
- `Modal`
- `Sheet`
- `Spinner`
- `ImageUpload`

Styling rules:

- Use Tailwind CSS v4 classes and tokens from `src/styles.css`.
- Use semantic colors: `background`, `foreground`, `surface`, `card`, `muted`, `muted-foreground`, `border`, `accent`, `destructive`.
- Avoid hardcoded random colors when a token exists.
- Use `font-display` for headings and default sans for body.
- Preserve warm off-white background, black ink, lime accent, subtle border, rounded-card style.
- Keep mobile-first layouts.
- Use existing spacing/radius patterns: rounded-xl/2xl/full, `px-4/6`, `p-6`, `gap-3/4/6`, `space-y-*`.
- Use `cn()` from `src/lib/utils.ts` for conditional class composition.
- Use Lucide icons if icon needed.
- Use Framer Motion only for purposeful micro-interactions matching existing dashboard/storefront motion.
- Provide loading, empty, disabled, hover, focus, and error states when relevant.
- Preserve Indonesian product-facing and merchant-facing copy unless explicitly asked otherwise.

Bad:

- adding a new button style instead of `Button`
- using raw blue/gray/red palettes outside token system
- desktop-only layout for storefront/dashboard
- inconsistent border radius or typography
- new modal/sheet implementation when existing primitive/pattern fits

## Form Pattern

- Local form state uses React `useState` in current dashboard forms.
- Use UI primitives for fields.
- Use `ImageUpload` for image URL/upload behavior.
- Convert numeric values explicitly before submit.
- Keep validation mirrored server-side with Zod; client checks are UX only.
- Use Sonner `toast` for success/failure feedback where existing pages do.

## Testing Pattern

- Vitest tests live as `*.test.ts` / `*.test.tsx` near source.
- Shared factories live in `src/test/factories.ts`.
- Global setup lives in `src/test/setup.ts`.
- Mock Prisma and external services in server-function tests.
- Test ownership guards, validation failures, transaction behavior, image validation, URL safety, and store/cart helpers.
- When changing behavior, add/update targeted tests.

Preferred checks:

```bash
bun run typecheck
bun run lint
bun run test
```

Use coverage for broad server/data/state changes:

```bash
bun run test:coverage
```

## Security Rules

- Never hardcode secrets.
- Never commit `.env` with real values.
- Keep service-role keys server-only.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `R2_SECRET_ACCESS_KEY`, `PAKASIR_API_KEY`, `RAJAONGKIR_API_KEY`, `RESEND_API_KEY`, `OTP_HASH_SECRET`, or Turnstile secret to browser code.
- Keep upload validation: magic bytes, size limit, safe blob path.
- Keep OG image SSRF guard and host allowlist.
- Keep OTP expiry and attempt limits.
- Keep tenant ownership checks on all update/delete operations.

## Change Discipline

- Small scoped diffs only.
- No unrelated refactors.
- No broad formatting churn.
- No dependency upgrades unless explicitly requested.
- No public contract changes without updating callers/tests/docs.
- Inspect current implementation before editing.
- Verify with narrowest useful command.
- Summarize changed files and checks run.
