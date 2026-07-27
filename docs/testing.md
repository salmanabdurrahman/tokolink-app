# Testing

Tokolink uses Vitest with Testing Library, jsdom, and V8 coverage.

## Commands

```bash
bun run test
bun run test:watch
bun run test:coverage
bun run typecheck
bun run lint
bun run build
```

Use `bun run test` for normal local checks. Use `bun run test:coverage` when changing server logic, data access, validation, stores, checkout, payment, shipping, or ledger behavior.

Targeted examples:

```bash
bun run test -- src/server/checkout.server.test.ts
bun run test -- src/server/shipping.functions.test.ts
bun run test -- src/routes/-api-contract.test.ts
bun run test -- src/components/storefront/floating-cart.test.tsx
bun run test -- src/hooks/use-session.test.tsx
```

Use targeted commands first while refactoring one layer, then run broader checks before finishing broad diffs.

## Test layout

- Tests live near source files as `*.test.ts` or `*.test.tsx`.
- Global setup lives in `src/test/setup.ts`.
- Shared factories live in `src/test/factories.ts`.
- Server Function tests mock Prisma, Supabase, provider clients, and TanStack Start helpers.

## Layers

### Pure logic

Use unit tests for helpers with no DB/network dependency:

- Zod schemas in `src/lib/schemas.ts`
- image validation in `src/lib/image-utils.ts`
- cookie parsing in `src/lib/cookies.ts`
- OG URL safety in `src/lib/og.ts`
- cart and WhatsApp helpers in `src/lib/store.ts`

### Server handlers and services

Mock external boundaries and assert public behavior:

- auth/session sync
- tenant creation/update
- product/link ownership guards
- checkout order creation and order item snapshots
- shipping quote revalidation and cost validation
- order dashboard actions
- withdrawal requests

Cover validation failures, tenant isolation, transaction rollback, provider errors, and user-facing error messages.

### API contracts

Use route-level tests for public HTTP shape:

- status codes and JSON response body
- rate-limit hook invocation for public endpoints
- validation error message shape
- no-store/cache headers for health and status endpoints

Keep business logic in server handler tests; API tests should prove HTTP contract stays stable.

### Provider clients

Provider clients should be tested with mocked `fetch`/SDK calls:

- R2/S3 storage adapter
- Turnstile Siteverify
- Pakasir transaction create/detail/cancel
- RajaOngkir destination/cost/waybill
- Resend email payloads

### Hooks and client stores

Use hook/store tests for client-side state boundaries:

- session sync, auth redirects, and route invalidation after OAuth/session sync
- dashboard tenant hydration via `useLoadedTenant(...)`
- tenant-backed dashboard pages render loading/error fallbacks instead of blank `null` states while loader data is temporarily unavailable
- split auth/tenant/cart store actions
- cart persistence and WhatsApp helper output

### UI behavior

Use Testing Library for components where behavior matters:

- form validation display
- cart controls
- checkout/search interactions
- modal/sheet interactions
- loading/empty/error states

Prefer behavior assertions over implementation details.

### Future DB integration and E2E

Add DB integration/E2E when local test DB and provider mocks are stable:

- Prisma migrations and unique constraints
- webhook idempotency under duplicate events
- signup/onboarding/storefront/checkout smoke flow
- tenant isolation across real DB records

## Factories and mocks

Use `src/test/factories.ts` for stable objects: user, tenant, product, link, variant, cart item, order, payment, ledger, and withdrawal data.

Keep mocks local to test files unless reused by many tests. Reset mocks between tests.

## Coverage

Coverage threshold starts pragmatic so critical flows can be covered first. Add targeted coverage when behavior changes. Do not chase coverage with brittle implementation tests.

## Refactor safety checklist

Before splitting or moving code:

1. Add/confirm focused test for behavior being moved.
2. Move one concern per diff.
3. Keep public API/Server Function inputs and Indonesian error messages stable.
4. Re-run targeted test for moved behavior.
5. Run `bun run typecheck` and `bun run lint` for broad route/server/store changes.
6. Run `bun run build` when route boundaries, server-only imports, or generated bundles may be affected.

## CI quality gate

GitHub Actions runs:

1. dependency install with Bun cache
2. lint
3. typecheck
4. coverage tests
5. production build
6. coverage artifact upload
7. basic secret scan

Pull requests should include verification notes with commands run locally.
