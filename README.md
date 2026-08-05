# ASCII Banner

A static Astro + React developer tool that renders one input across the complete English-capable FIGlet font catalog. It exports raw text, ANSI Truecolor, Markdown fences, C-style comments, hash comments, and HTML comments without sending banner text to a server.

## Local development

The project pins pnpm 11.15.1 through the `packageManager` field so Corepack-compatible tools and CI use the same package manager version.

```sh
pnpm install
cp .env.example .env
pnpm dev
```

Set `SITE_URL`, `CONTACT_EMAIL`, `GA_MEASUREMENT_ID`, and `CLARITY_PROJECT_ID` in `.env`. `SITE_URL` must be the public HTTPS origin without a path, such as `https://asciibanner.dev`. The build fails when any required value is missing or malformed. Analytics scripts are consent-gated and their identifiers are intentionally public in the generated HTML.

The font sync runs before development and production builds. It copies distributable `.flf` assets from the pinned `figlet` package, builds the typed manifest, verifies printable English output, rejects embedded header notices that conflict with redistribution, and removes fonts that fail the v1 ASCII compatibility check.

## Validation

```sh
pnpm test
pnpm build
pnpm test:e2e
```

The end-to-end suite uses an installed Google Chrome channel and serves the static `dist` output locally. The production build contains no server runtime and can be hosted on any static CDN.

## Deployment

Pushes to `main` run the GitHub Actions deployment workflow; it can also be started manually to republish the latest `main` commit. The workflow installs dependencies, runs unit tests, builds the site, verifies the complete output, and replaces the `gh-pages` branch with a single orphan snapshot containing the contents of `dist` at the branch root.

Configure the static hosting provider to publish from the root of `gh-pages`, and allow GitHub Actions to write that branch. The push uses `force-with-lease`, so an unexpected external branch update is preserved and causes the job to fail instead of being overwritten. To validate an existing local build without publishing it, run:

```sh
pnpm verify:deploy
```

The deploy verifier requires the canonical robots, sitemap, and EdgeOne configuration files, checks every indexed page and font asset, and rejects GitHub Pages-specific `CNAME` or `.nojekyll` files.

Before the first workflow run, create these GitHub Actions repository secrets under **Settings → Secrets and variables → Actions**:

- `SITE_URL` — the public HTTPS origin, for example `https://asciibanner.dev`
- `CONTACT_EMAIL`
- `GA_MEASUREMENT_ID` — the GA4 web stream measurement ID beginning with `G-`
- `CLARITY_PROJECT_ID` — the Microsoft Clarity project ID

Repository secrets protect values while the workflow runs. The site URL, contact address, and analytics identifiers are intentionally public in generated HTML, SEO files, or vendor requests.

## Site configuration

- `SITE_URL` is the single source for canonical links, structured data, `robots.txt`, and the single root-level `sitemap.xml`.
- Advertising is disabled by default. Keep `PUBLIC_ADS_ENABLED=false` until preparing a properly consented ad integration.
- Only the 20 editorially documented font pages enter the sitemap. Other generated font pages remain available with `noindex,follow`.
- `public/edgeone.json` is copied to the deployment root. It permanently redirects indexable extensionless routes to their canonical trailing-slash URLs without intercepting `.flf` assets, adds HSTS and baseline security headers, stages a report-only CSP, and serves fonts as cacheable, compressible `text/plain` resources.
- In the EdgeOne console, configure **Forced HTTPS** to use a permanent `301` redirect. Pages currently defaults to `302`, and protocol matching is not exposed by the repository-level redirects format.
- After deployment, confirm `.flf` responses use Brotli or Gzip and review browser CSP reports before promoting `Content-Security-Policy-Report-Only` to an enforced policy. The policy must continue to allow consented scripts and connections for Google Analytics and Microsoft Clarity.
- If moving to another host, reproduce the redirects, caching rules, HSTS, and response headers from `edgeone.json`.
- Cache hashed files under `/_astro/` for one year with `immutable`; cache HTML and sitemap files with revalidation so a new deploy is visible immediately.
- Verify the production origin in Google Search Console and Bing Webmaster Tools, submit `/sitemap.xml`, then request indexing for `/`, `/fonts/`, and `/zh/fonts/`. If a `site:` search is still empty after deployment, inspect those URLs in the webmaster consoles before changing page content again.

## Privacy

Banner text is processed inside the browser worker. Favorites and up to 10 recent text entries are device-local preferences stored in `localStorage`; history can be deleted from the generator, and the site has no backend or account system. Analytics consent and refusal choices expire after 15 days, after which the site asks again on the visitor's next visit.
