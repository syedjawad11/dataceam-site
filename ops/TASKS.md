# Tasks

Status: `todo` · `in-progress` · `review` · `blocked` · `done`

| ID | Title | Status | Branch | PR |
|---|---|---|---|---|
| T-000 | Tooling, quality gates, hello world | done | task/000-tooling | #1 |
| T-001 | Base layout, header, footer, tokens, SEO head | done | task/001-layout | #2 |
| T-002 | Home page (placeholders live) | done | task/002-home | #5 |
| T-003 | FAQ page (placeholders live) | done | task/003-faq | #6 |
| T-004 | Privacy page (placeholders live) | done | task/004-privacy | #7 |
| T-005 | 404, robots.txt, sitemap, OG image | done | task/005-seo-basics | #3 |
| T-006 | Insights skeleton + RSS | done | task/006-insights | #4 |
| T-007 | Blue/grey/black restyle + email-only contact | review | task/007-restyle-email-only | #8 |

---

## T-000 — Tooling, quality gates, hello world
Goal: Every later task can be verified with `npm run check` (fast) and `npm run check:full` (everything).
Files to create / change:
- `package.json` (scripts only; deps are pre-installed by CC)
- `eslint.config.js`, `.prettierrc.json`, `.prettierignore`
- `scripts/content-lint.mjs`
- `lighthouserc.json`
- `tests/a11y.spec.ts`, `playwright.config.ts`
- `src/pages/index.astro` (hello world)
- `astro.config.mjs` (add `site: 'https://dataceam.com'`, keep existing integrations)
Acceptance criteria:
- [ ] `npm run lint` = `eslint . && prettier --check .`; `npm run format` = `prettier --write .`
- [ ] `npm run content-lint` runs `scripts/content-lint.mjs` over built `dist/**/*.html` and `content/**/*.md`, case-insensitive, and exits 1 with file + match on any of:
  - `linkedin`
  - buyer names: `micro1`, `datafactor`, `lodex`
  - `data broker`
  - `guarantee`, `guaranteed`
  - claim patterns: `(partner|agent|representative) (of|for|to) ` followed by any word, and `official partner`
  - urgency words: `act now`, `limited time`, `don't miss`, `get rich`
  - Allow-list: the sentence "I work with several vetted AI data buyers." must not trigger.
- [ ] content-lint also requires the exact disclosure text `I'm paid a referral fee by the buyer. It costs you nothing.` in `dist/index.html` and `dist/faq/index.html` **when those files contain `data-page="home"` / `data-page="faq"`** (so hello world passes; real pages are enforced).
- [ ] `npm run links` = `linkinator dist --recurse --skip "^https?://(?!localhost)"` (internal links only).
- [ ] `npm run check` = `astro check && astro build && npm run lint && npm run content-lint && npm run links`.
- [ ] `lighthouserc.json`: `staticDistDir: ./dist`, assertions perf ≥ 0.9, a11y ≥ 0.95, best-practices ≥ 0.95, seo ≥ 0.95.
- [ ] `tests/a11y.spec.ts`: Playwright + `@axe-core/playwright`, visits every HTML page in `dist` via `astro preview` (`webServer` in config), fails on any `serious` or `critical` violation.
- [ ] `npm run check:full` = `npm run check && lhci autorun && playwright test && gitleaks detect --no-banner --redact`.
- [ ] Hello world `index.astro`: `<html lang="en">`, title "Dataceam", meta description, one `<h1>`, imports `../styles/global.css`. Passes Lighthouse SEO.
Out of scope: layout components, real copy.
Copy / content source: none.

## T-001 — Base layout, header, footer, design tokens, SEO head
Goal: Shared shell so every page only supplies content + SEO props.
Files: `src/layouts/Base.astro`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/components/Seo.astro`, `src/styles/global.css` (`@theme` tokens), `src/config/site.ts` (name, url, X handle, email, Cal.com URL — placeholders `TODO_*`).
Acceptance criteria:
- [ ] `Seo.astro` props: `title`, `description`, `canonical` (default from `Astro.url` + `site`), `ogImage`, `jsonLd?`; renders title, description, canonical, OG + Twitter card tags.
- [ ] Base layout: skip-to-content link, `<header>`, `<main id="main">`, `<footer>`; visible focus ring token.
- [ ] Nav: Home, Insights, FAQ. Footer: email, X link, Privacy link, © year. **No LinkedIn.**
- [ ] Organization + Person JSON-LD emitted on Home only (via prop).
- [ ] Colour tokens meet WCAG AA on both text/background pairs used.
- [ ] Cloudflare Web Analytics snippet included only when `PUBLIC_CF_BEACON_TOKEN` is set at build.
- [ ] `npm run check` passes.
Out of scope: page copy.

## T-002 — Home (`/`)
Goal: Service page cold emails link to. Copy source: `content/home.md` (approved).
Acceptance: all sections in `content/home.md` in order; `<body data-page="home">`; disclosure visible in body text (not footer fine print); CTA = Cal.com link + mailto; Person/Org JSON-LD; photo via `<Image>` with alt; `npm run check:full` passes.

## T-003 — FAQ (`/faq`)
Copy source: `content/faq.md`. Use `<details>/<summary>` (no JS); `data-page="faq"`; disclosure present; FAQPage JSON-LD; `check:full` passes.

## T-004 — Privacy (`/privacy`)
Copy source: `content/privacy.md`. Placeholders rendered visibly as `[TO FILL: …]`; "last updated" date; `check:full` passes.

## T-005 — 404 + SEO basics
Files: `src/pages/404.astro`, `public/robots.txt` (allow all, `Sitemap: https://dataceam.com/sitemap-index.xml`), `public/og-default.png` (1200×630, generated from an SVG in `src/assets/og.svg` via a build-time script or committed PNG), verify sitemap output. Acceptance: 404 has link home; unique title/description on every page (add a content-lint check for duplicate `<title>`); `check:full` passes.

## T-006 — Insights skeleton + RSS
Files: `src/content.config.ts` (collection `insights`: title, description, pubDate, updatedDate?, draft, tags), `src/content/insights/.gitkeep`, `src/pages/insights/index.astro`, `src/pages/insights/[...slug].astro`, `src/layouts/Article.astro`, `src/pages/rss.xml.ts` (`@astrojs/rss`). Acceptance: index shows "coming soon" when no non-draft posts; one `draft: true` sample post excluded from build, index and RSS; Article JSON-LD on posts; `check:full` passes.

## T-007 — Blue/grey/black restyle + email-only contact
Goal: Jawad doesn't do calls. All contact is by email. New visual direction: blue, grey and black, modern and clean.
Copy source: updated `content/home.md`, `content/faq.md`, `content/privacy.md` (all booking/call wording removed).
Acceptance: no "call", "Cal.com" or booking link anywhere in `dist`; `calUrl` removed from `src/config/site.ts`; tokens in `@theme` switched to the palette below with AA contrast; OG image regenerated in the new palette; `check:full` passes.
