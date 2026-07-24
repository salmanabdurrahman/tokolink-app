# Performance Baseline

Baseline dibuat dari production build lokal supaya ukuran bundle landing/storefront bisa dipantau sebelum deploy.

## Build baseline

Command:

```bash
bun run build
```

Current client chunks to watch:

| Area                  | Baseline                                                               |
| --------------------- | ---------------------------------------------------------------------- |
| Storefront route      | `/_slug-*` chunk ~17 kB minified                                       |
| Landing route         | `/index-*` chunk ~19 kB minified                                       |
| Shared router/runtime | split into `tanstack`, `react`, `vendor`, `motion`, and `icons` chunks |

## Lighthouse baseline

Run against a production build preview or Vercel preview URL:

```bash
bun run build
bun run preview
```

Then run Lighthouse for:

- `/`
- `/{store-slug}`

Record mobile Performance, Accessibility, Best Practices, SEO, LCP, CLS, and INP before broad UI/performance work.
