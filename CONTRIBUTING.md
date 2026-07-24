# Contributing

Thanks for helping improve Tokolink.

## Local setup

```bash
bun install
cp .env.example .env
bun run db:generate
bun run db:push
bun run dev
```

Fill `.env` with local/sandbox credentials only. Never commit real secrets.

## Development rules

- Follow existing project patterns before adding new ones.
- Keep changes small and scoped to one concern.
- Use existing UI primitives and design tokens.
- Validate Server Function input with Zod.
- Protect tenant-owned writes with `authMiddleware` and `tenantId` ownership checks.
- Add/update tests when behavior changes.
- Do not edit `src/routeTree.gen.ts` manually.

## Quality checks

Run before opening a pull request:

```bash
bun run typecheck
bun run lint
bun run test
```

Run coverage for server/data/state changes:

```bash
bun run test:coverage
```

Run build when touching routes, config, server entrypoints, or deploy behavior:

```bash
bun run build
```

## Pull requests

Include:

- summary of user-facing or developer-facing change
- files/areas changed
- verification commands and results
- screenshots for UI changes
- notes for env, migration, or operational impact

Keep unrelated cleanup out of feature/fix PRs.

## Helpful docs

- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [Testing](docs/testing.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Payout policy](docs/payout-policy.md)
- [Preview deploy checklist](docs/preview-deploy-checklist.md)
