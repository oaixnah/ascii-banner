# AGENTS.md

## Setup and commands

- Use `pnpm` (pinned `11.15.1`; CI uses Node 22), not npm or yarn.
- `pnpm install`, then create `.env` from `.env.example`. `astro.config.mjs` throws unless `SITE_URL` is an HTTPS origin with no path; `CONTACT_EMAIL`, `GA_MEASUREMENT_ID` (`G-...`), and `CLARITY_PROJECT_ID` are validated at build time too.
- `pnpm dev` runs `fonts:sync` before Astro.
- `pnpm test` runs Vitest unit tests in Node (`tests/**/*.test.ts`). Run one file with `pnpm test tests/export.test.ts`.
- `pnpm build` is the typecheck/lint gate (`astro check` + static build; there is no ESLint/Prettier). `prebuild` re-runs font sync. Typecheck only: `pnpm exec astro check`.
- `pnpm test:e2e` rebuilds and serves `dist/` via `python3 -m http.server 4321`; it requires an installed Google Chrome (`channel: "chrome"`), not the dev server. One spec: `pnpm build && pnpm exec playwright test tests/e2e/generator.spec.ts`. Playwright reuses an existing process on port 4321, so kill stale servers or you may test an old build.
- `pnpm verify:deploy` inspects an existing `dist/` and reads `SITE_URL` from the shell, not `.env`: `SITE_URL=https://example.com pnpm verify:deploy`.

## Font pipeline and generated data

- `public/fonts/*.flf` and `src/data/font-manifest.generated.json` are generated and committed by `pnpm fonts:sync` from `node_modules/figlet/fonts`. Do not hand-edit them; change `scripts/sync-fonts.ts` or the pinned `figlet` version.
- Sync removes stale `.flf` files, rejects fonts with conflicting license headers or no printable ASCII, and marks only the 20 names in `popularFonts` as `indexed`.
- Indexed fonts are the only fonts with `/fonts/<slug>/` and `/zh/fonts/<slug>/` pages, sitemap entries, and localized detail links. Other fonts get English-only `noindex` detail pages.
- Adding/removing an indexed font also requires updates to `src/data/font-copy.ts`, `src/data/font-copy-zh.ts`, `public/edgeone.json`, and hardcoded test expectations (`tests/fonts.test.ts` and e2e expect 20; `tests/edgeone-config.test.ts` expects 34 redirects).
- The manifest is packed into a tab-separated client catalog in `src/lib/gallery-fonts.ts`; if you add a manifest field, update pack/unpack and `tests/gallery-fonts.test.ts`.

## Architecture and invariants

- Static Astro output with a React island. `src/components/BannerGallery.tsx` is the interactive UI; FIGlet rendering happens in `src/workers/render.worker.ts` by fetching `/fonts/*.flf`. Do not render fonts on the main thread or introduce a server runtime.
- English routes live at `/`, Chinese at `/zh/`; pages are mirrored. `src/lib/sitemap.ts` contains a manually maintained static path list. Add both locale pages and sitemap entries together, and keep `src/i18n/ui.ts` copy in sync with e2e selectors (tests use accessible names).
- Banner text must never be uploaded or included in analytics. Sharing intentionally puts it in the URL query; Clarity is skipped on `?text=` pages.
- `scripts/verify-deploy.ts` enforces SEO on every sitemap page: canonical URL, meta description, JSON-LD, exactly one `h1`, matching hreflang pairs, no broken internal links, and no `CNAME`/`.nojekyll`.
- `public/edgeone.json` is the production host config for redirects, caching, security headers, and report-only CSP. Keep `tests/edgeone-config.test.ts` green when editing it.

## Deploy

- Pushes to `main` run install -> test -> build -> `verify:deploy` -> `scripts/publish-dist.sh`. That script force-with-lease publishes a single orphan snapshot of `dist/` to `gh-pages`; do not rely on a server or build artifacts outside `dist/`.
- `README.md` holds operator-facing deployment and EdgeOne details; keep it accurate when deploy behavior changes.
