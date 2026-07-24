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

### Server Functions

Mock external boundaries and assert public behavior:

- auth/session sync
- tenant creation/update
- product/link ownership guards
- checkout order creation
- shipping cost validation
- order dashboard actions
- withdrawal requests

Cover validation failures, tenant isolation, transaction rollback, provider errors, and user-facing error messages.

### Provider clients

Provider clients should be tested with mocked `fetch`/SDK calls:

- R2/S3 storage adapter
- Turnstile Siteverify
- Pakasir transaction create/detail/cancel
- RajaOngkir destination/cost/waybill
- Resend email payloads

### UI/components

Use Testing Library for components where behavior matters:

- form validation display
- cart controls
- modal/sheet interactions
- loading/empty/error states

Prefer behavior assertions over implementation details.

## Factories and mocks

Use `src/test/factories.ts` for stable objects: user, tenant, product, link, variant, cart item, order, payment, ledger, and withdrawal data.

Keep mocks local to test files unless reused by many tests. Reset mocks between tests.

## Coverage

Coverage threshold starts pragmatic so critical flows can be covered first. Add targeted coverage when behavior changes. Do not chase coverage with brittle implementation tests.

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
