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
| T-007 | Blue/grey/black restyle + email-only contact | done | task/007-restyle-email-only | #8 |
| T-008 | Home page v2: Jawad's new copy + tile design | review | task/008-home-copy-v2 | #10 |

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

## T-008 — Home page v2: new copy + tile/card design
Goal: Replace the whole Home page with Jawad's new copy (`content/home.md`, use it VERBATIM — do not reword, add or drop sentences) and give the page a modern tiled look: square/rounded cards and grids, still the blue / grey / black palette in `@theme`.
Files: `src/pages/index.astro`, `src/styles/global.css`, `src/components/EmailCta.astro` (button label + href props), `scripts/content-lint.mjs` (rules below). No new dependencies, no client JS.
Sections, in order (each a `<section>` with `aria-labelledby`; every section after the hero has a small blue uppercase eyebrow line above its h2 — the "Eyebrow:" lines in home.md; the eyebrow is a `<p>`, the "###" line is the `<h2>`):
1. **Hero** (dark band). Two columns on ≥64rem: left = h1, lead paragraph, primary button "See what your data could be worth" linking to `#contact`, small line under it. Right = decorative mosaic of ~9 square tiles (3×3 grid, aspect-ratio 1, rounded, subtle borders/blue tints of varying opacity) each showing a tool name: Slack, GitHub, Salesforce, Zendesk, Google Drive, QuickBooks, Jira, Notion, HubSpot. Mosaic is `aria-hidden="true"`; hide it below 48rem or show it below the text — your choice, no horizontal scroll at 360px.
2. **Why your data has value**: three paragraphs; on desktop a 2-column layout (heading left, text right) or three paragraphs as three tiles — keep readable.
3. **What kinds of data qualify**: 8 cards in a responsive grid (1 col mobile, 2 tablet, 4 desktop). Each card: title as `<h3>`, "What it covers" text, then a "Typical sources" line rendered as small grey pills/chips. Give each card a small decorative inline SVG or monogram square in the corner (aria-hidden). Then the "Closed or liquidated company?" line as a highlighted callout box.
4. **How it works**: 4 numbered step tiles (01–04) in a grid (1 / 2 / 4 columns), bold title + text, matching the existing `.home-steps` style.
5. **What it could be worth**: 3 pricing-style cards side by side (stack on mobile): name, large range figure, typical profile. "Established" card visually emphasised (blue border or dark fill). Under them the disclaimer line in muted text, visible (not hidden).
6. **Privacy and control**: intro paragraph, then the 6 protections as a 3×2 grid of tiles (1 col mobile, 2 tablet, 3 desktop), each with a small check/shield icon (inline SVG, aria-hidden), bold title + text. Keep the list semantics (`<ul role="list">`).
7. **Who qualifies**: the 5 criteria as tiles/rows (label bold), then "Not sure? Send us a short email and we'll tell you." where "Send us a short email" links to `#contact`.
8. **About Dataceam**: paragraph, then the "How we're paid" disclosure in a clearly visible bordered box (not fine print).
9. **Final CTA** (`id="contact"`, dark band, `tabindex="-1"` as now): h2, paragraph, primary button "Email us" (mailto when `site.email` is set, otherwise `#contact` + visible placeholder as today), and the "Or write directly to …" line showing the email or the visible `[TO FILL: contact email]` placeholder.
Remove the old sections entirely: liquidators, "Who I am", the standalone disclosure band. Keep Organization JSON-LD; drop the Person JSON-LD block (no person section any more). Update `title`/`description` from the home.md front matter.
Content-lint changes (`scripts/content-lint.mjs`, keep and extend the self-test):
- Home (`data-page="home"`) must now contain `The buyer pays us a referral fee when a deal closes. You pay nothing for our help.` instead of the old disclosure; FAQ still requires `I'm paid a referral fee by the buyer. It costs you nothing.`
- Allow-list (must not trigger) exactly these phrases: `not a data broker`, `not a guarantee`, `for a limited time before the software accounts are shut down`. Every other occurrence of those words still fails. Add self-test cases for both the allowed phrase and a still-forbidden variant.
Acceptance:
- [ ] All copy in home.md appears verbatim in `dist/index.html` in order; no old Home copy remains.
- [ ] No "call"/booking wording, no buyer names, no LinkedIn.
- [ ] Responsive: no horizontal scroll at 360px; grids collapse as described; AA contrast on all text pairs; visible focus states.
- [ ] `npm run check` passes (CC runs `check:full`).
Out of scope: FAQ, privacy, header/footer.
