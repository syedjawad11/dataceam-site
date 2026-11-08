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

---

## T-009 — Home page v3: licensing brief, expandable examples, email dialog
Goal: Replace the homepage with `content/home.md` (v3, verbatim — copy every sentence exactly, including the typographic apostrophes ’). Audience: business owners in the US and Canada. No founder name.
Files to change:
- `src/pages/index.astro` — rebuild with ONLY these sections in order: (1) hero, (2) `id="examples"` expandable rows, (3) value section, (4) `id="how-it-works"` role, (5) `id="contact"` final CTA. Delete everything else from v2 (tool mosaic, 8 data cards, 4 steps, 3 tiers, privacy, who qualifies, about). Update title/description from the frontmatter. Keep Organization JSON-LD (update its description).
  - Hero: h1, supporting paragraph, short benefit line, primary button "Explore data examples" as `<a href="#examples">`.
  - Examples: native `<details>`/`<summary>`, three rows, first has `open`. Summary shows the category (as a heading-styled span) and the always-visible examples line; the body holds the expanded detail. Add a visible chevron/plus that rotates when open; full row is the click target; visible focus ring.
  - Value: separated from the previous section by a thin `<hr>`-style rule. Heading, then one ordinary paragraph with the two figures in `<strong>`. Then the link "See micro1’s published ranges" → `https://www.micro1.ai/data-partnerships` (`rel="noopener"`, opens in a new tab with `target="_blank"`; add visually-hidden text "(opens in a new tab)"). The figures must appear nowhere else on the site.
  - Role: heading, paragraph, then the disclosure line as a normal paragraph (not small/muted fine print).
  - Contact: heading, copy, "Get in touch" button that opens the email dialog.
- `src/components/Header.astro` — Dataceam wordmark (existing `site-name`) + two links "Data examples" → `/#examples`, "How it works" → `/#how-it-works`, plus a "Get in touch" button that opens the email dialog. Remove Home/Insights/FAQ from the header nav. Must fit at 375px without horizontal scroll (shrink gaps/fonts on small screens; the button stays visible).
- `src/components/Footer.astro` — add "FAQ" (`/faq/`) and "Insights" (`/insights/`) links so those pages stay reachable.
- New `src/components/EmailDialog.astro`, rendered once in `src/layouts/Base.astro` so the header button works on every page. Native `<dialog>` opened with `showModal()`:
  - `aria-labelledby` the title "Email Dataceam"; the dialog copy paragraph from `content/home.md`; a close button (aria-label "Close"); Escape closes (native).
  - Primary action "Open email draft" → `<a>` with `href="mailto:${site.email}?subject=Business%20data%20licensing%20inquiry"`.
  - The address as selectable text (`user-select: all` on a `<code>`-ish span) + "Copy email address" button using `navigator.clipboard.writeText`, falling back to selecting the text; announce "Email address copied" in an `aria-live="polite"` region.
  - When `site.email` is a placeholder (empty or starts with `TODO_`): show `[TO FILL: contact email]` in place of the address, render "Open email draft" and "Copy email address" as disabled buttons. Nothing else changes when the email is set.
  - Openers: any element with `data-email-dialog-open` (header button + final CTA button; use `<button type="button">`). On close, return focus to the exact opener. Clicking the backdrop closes. Small inline `<script>` (Astro bundles it); no dependencies. Without JS, openers fall back gracefully: render them as `<a href="/#contact" data-email-dialog-open>` styled as buttons, and the script calls `preventDefault()` and opens the dialog.
  - Mobile: width `min(32rem, calc(100vw - 2rem))`, scrolls internally if tall; respects `prefers-reduced-motion`.
- `src/components/EmailCta.astro` — delete if no longer used; remove references.
- `src/styles/global.css` — remove v2-only styles (mosaic, data cards, steps, tiers, etc.), add styles for the above in the existing tokens (ink/blue/grey). Clean, calm, generous whitespace; hero on dark ink as now. `html { scroll-behavior: smooth }` only under `prefers-reduced-motion: no-preference`; add `scroll-margin-top` to section anchors.
- `scripts/content-lint.mjs`:
  - Home disclosure becomes exactly: `There’s no charge to your business for an introduction. Dataceam may earn a referral fee from the program if a deal goes ahead and qualifies.` (FAQ unchanged.)
  - The buyer-name rule still applies everywhere, except that `micro1` (case-sensitive, exactly that token) is allowed in `dist/index.html` and `content/home.md` only. DataFactor/Lodex stay forbidden everywhere; micro1 stays forbidden on every other page.
  - Remove the now-unused allowed phrases `not a data broker` and `for a limited time before the software accounts are shut down` (keep `not a guarantee` harmlessly or remove it; update self-tests accordingly).
  - Update/extend self-tests: micro1 allowed on home, rejected on faq/privacy; new home disclosure required.
- New `tests/home.spec.ts` (Playwright, runs in `check:full` against the existing config): first `<details>` is open, the others closed and open on click; `#examples` link scrolls/targets; header "Get in touch" opens the dialog, Escape closes it and focus returns to the header button; final "Get in touch" opens the same dialog; source link has the exact micro1 href.
Acceptance:
- [ ] `npm run check` green (CC runs `check:full` + screenshots, since the sandbox can't run Chromium/linkinator).
- [ ] Copy matches `content/home.md` word for word; no v2 copy left on the home page; no founder name; no "$50K", "guarantee", "data broker", "partner" wording on home.
- [ ] No horizontal scroll at 375px; dialog usable by keyboard and on mobile.

---

## T-011 — Home v2: licensing hero + closed-company callout
Goal: Two copy edits on the live Home v2. Everything else on the page stays exactly as it is. Copy comes verbatim from `content/home.md` (use straight apostrophes, matching the rest of the page).
Files to change: `src/pages/index.astro`, `src/styles/global.css` (only if a new class is needed).
1. Hero (`#hero-heading` block):
   - h1 text becomes: `Could your company's records be licensed for AI?`
   - Directly below the h1 add a large answer line (class `home-hero-answer`; ~1.5rem desktop/1.25rem mobile, semibold, white on the dark hero): `Yes, and they can earn your company new revenue.`
   - Then an amount line (class `home-hero-amount`; slightly larger than body, muted-on-dark, figure in `<strong>` in white or blue-on-dark): `Depending on the data, a licensing deal may be worth <strong>$50K to $3M+</strong>.` Mind JSX whitespace: there must be a real space before `<strong>` (use `{' '}` if the line breaks).
   - Keep the existing lead paragraph, the "See what your data could be worth" button, the "Free to you…" line and the tool mosaic unchanged, in the same order after the new lines.
2. Replace the `.home-callout` paragraph under the data cards with: `<strong>It doesn't have to be a company that's still trading.</strong>` followed by `Records from a business that has shut down, closed, gone bankrupt or been liquidated can also qualify, as long as they meet the buyer's criteria and data-protection rules such as GDPR. In a bankruptcy or liquidation, the trustee or liquidator usually needs to approve the deal. These archives are often available for a limited time before the software accounts are shut down.` Keep it in the existing `.home-callout` box; again ensure a space after `</strong>`.
Do not change the page title/description, JSON-LD, any other section, components or content-lint.
Acceptance:
- [ ] `npm run check` green; built `dist/index.html` contains each new sentence exactly (with correct spaces around `<strong>`).
- [ ] No other text on the page changed (`git diff` touches only those two blocks plus any new CSS).
- [ ] No horizontal scroll at 375px.

## T-012 — Contact email `hello@dataceam.com` + Google Workspace
Goal: Replace every contact-email placeholder with `hello@dataceam.com` (Google Workspace). CC has already updated `content/faq.md` and `content/privacy.md`.
Files to change: `src/config/site.ts`, `src/pages/faq.astro`, `src/pages/privacy.astro`.
1. `src/config/site.ts`: set `email: 'hello@dataceam.com'`. Leave the other `TODO_` values alone.
2. `src/pages/faq.astro`: `content/faq.md` now says `Email hello@dataceam.com with a line…`. The "How do I start?" answer must still render the address as a `mailto:` link built from `site.email`. Update `emailNote` or simplify the replace/split logic so it works with the new copy. No `[TO FILL: …email…]` text may remain on the page.
3. `src/pages/privacy.astro`: replace `<span class="placeholder">[TO FILL: Cloudflare, email provider]</span>` with the plain text `Cloudflare and Google Workspace`. Replace `<span class="placeholder">[TO FILL: contact email]</span>` with `<a href={`mailto:${site.email}`}>{site.email}</a>` (import `site` if needed). Leave every other placeholder (retention, legal name, address, ICO, etc.) unchanged.
EmailCta.astro and Footer.astro already switch to `mailto:` once `site.email` is set, so don't change them. Don't touch any other copy.
Acceptance:
- [ ] `npm run check` green.
- [ ] `grep -rnE "TODO_EMAIL|TO FILL: (contact )?email|jawad@dataceam|email provider" dist/` returns nothing.
- [ ] `dist/index.html`, `dist/faq/index.html`, `dist/privacy/index.html` each contain `mailto:hello@dataceam.com`.
- [ ] `git diff` touches only the three files above.

## T-013 — Insights: three articles + SVG infographics + article SEO
Goal: Publish three original, SEO-optimised Insights articles with infographics, and upgrade the article template for Google Search. Codex writes both the article copy and the code. Branch `task/013-insights-articles`.

### A. Articles (`src/content/insights/<slug>.md`; delete `sample-draft.md`)
Shared brief for all three:
- 1,400–1,900 words. UK English. Plain, calm, practical. First person, as an independent scout: "I work with several vetted AI data buyers." Write original prose; don't copy any outside source.
- Open with a 40–60 word paragraph that answers the search query directly. Then use 6–9 H2s (several phrased as questions) with H3s where useful. Use short paragraphs, bullet lists, and at least one table.
- Embed 2 infographics per article as markdown images (`![alt](../../assets/insights/<slug>/<name>.svg)`). The alt text must be descriptive. Put a one-line italic caption under each.
- Internal links: `/` (home), `/faq/`, and both other articles (`/insights/<slug>/`). End with a short "Want to know if your records qualify?" section that links to `/#contact` ("Email me").
- Include this sentence verbatim once: "I'm paid a referral fee by the buyer. It costs you nothing."
- Frontmatter: `title` (≤60 chars), `description` (140–158 chars, containing the keyword), `pubDate: 2026-11-08`, `tags`, `keywords` (3–6), `heroImage` (relative path to the article's hero SVG), `heroAlt`, `ogImage: /og/<slug>.png`, `faq` (4–5 `{q, a}` items, each answer 1–3 sentences). The FAQ is rendered by the layout, so don't repeat it in the body.
- HARD RULES (content-lint enforces most; also check the rendered HTML):
  - Never name any buyer or vendor (no micro1, DataFactor, Lodex or others).
  - Never write "partner/agent/representative of/for/to …".
  - The word "guarantee"/"guaranteed" is allowed only inside "not a guarantee".
  - No urgency or get-rich wording ("act now", "limited time", "don't miss").
  - No LinkedIn.
  - Never "data broker".
  - Money only as ranges, with "may" and "depends on the data".
  - No invented statistics, studies, quotes or named sources.
  - Tool names (Slack, GitHub, Google Workspace, Microsoft 365, Jira, Confluence, Notion, Salesforce, HubSpot, Zendesk, QuickBooks) are fine as plain text.
  - Keep platform facts hedged ("usually", "on most paid plans", "check your plan").

1. `prepare-company-data-for-ai-licensing`
   - **Title:** "How to Prepare Company Data for AI Licensing: A Checklist"
   - **Keyword:** prepare company data for AI training
   - **Cover:**
     - what preparing actually involves (3 jobs: agree scope, export each tool, hand over / review)
     - **Step 1 — scope:**
       - list every tool, past and present, including retired systems and old archives
       - mark exclusions: client-owned systems, HR/payroll/medical, NDA-restricted material, national ID numbers
     - **Step 2 — export tool by tool.** For each tool, in a short subsection or a table row, cover who runs the export and what to watch out for:
       - Slack: free and lower plans may export public channels only
       - Microsoft 365: eDiscovery / admin export
       - Google Workspace: admin data export, which can take days and needs a super admin
       - Jira/Confluence: site export
       - GitHub: org repos with issues and PRs
       - Notion: workspace export
       - CRMs and help desks
     - **Step 3 — upload or hand to IT,** then review a cleaned sample before signing anything
     - **What not to do while preparing:**
       - don't delete old history
       - don't downgrade plans or cancel subscriptions before exports finish
       - don't scrub names by hand
       - don't shorten retention settings
     - **How client and employee data is protected:**
       - names, emails, phone numbers, addresses and account numbers are replaced with consistent placeholders within a thread
       - secrets and API keys are removed
       - no re-identification key is kept
       - a GDPR lawful basis is needed
     - **Typical timeline:** a few weeks
   - **Infographics:**
     - `hero.svg`: a "3 steps" process flow (Scope → Export → Review sample)
     - `dos-and-donts.svg`: a two-column checklist card
2. `license-company-data-before-selling-business`
   - **Title:** "Selling Your Business? License Its Data Before the LOI"
   - **Keyword:** license company data before selling business
   - **Cover:**
     - **The idea:** a non-exclusive licence over a de-identified copy. The company keeps its originals and the sale goes ahead as normal.
     - **Does it lower the sale price?**
       - Acquirers usually price on normalised/recurring earnings, so a one-off licence fee is treated as non-recurring and usually doesn't change the multiple.
       - The exception is businesses whose product is the data itself.
     - **When to do it,** stage by stage:
       - preparing to sell: best
       - first talks
       - LOI signed: needs the buyer's consent
       - due diligence: harder
       - after closing: it's the new owner's decision
       - Recommend before the LOI, disclosed openly.
     - **Due diligence:** what goes in the data room (licence agreement, DPA, exclusions list, sample sign-off, payment record)
     - **Warranties:** disclose against IP, material contracts and data-protection warranties
     - **Deal structure:**
       - share sale: the agreement stays with the company
       - asset sale: the agreement may need consent to transfer
     - **Who keeps the fee:** say so in the purchase agreement
     - **GDPR** for customer and employee data
     - **Checklist:** questions for your M&A adviser and lawyer
   - Include the sentence: "This is general information, not legal or tax advice."
   - **Infographics:**
     - `hero.svg`: a sale timeline with 5 stages, the "best window" highlighted before the LOI
     - `data-room-checklist.svg`: a checklist card
3. `what-business-data-ai-companies-buy`
   - **Title:** "What Business Data Do AI Companies Buy? And What It's Worth"
   - **Keyword:** what data do AI companies buy
   - **Cover:**
     - **Why AI developers want private work records:** public web text is largely used up, and they need worked examples of real tasks from request to outcome
     - **The 8 categories,** from `content/home.md`: Conversations, Code and engineering, Documents and files, Sales and CRM, Finance and accounting, Support and tickets, Operations and logistics, Legal and compliance (each with typical sources)
     - **What raises value:**
       - years of continuous history
       - full threads with outcomes
       - several connected tools
       - clear ownership
       - consistent structure
     - **What lowers value:**
       - short history
       - gaps
       - mostly client-owned data
       - heavy sensitive personal data
       - unclear rights
     - **What it may be worth:** use exactly this framing: "Depending on the data, a licensing deal may be worth $50K to $3M+. That range is not a guarantee; it depends on the data, its volume and the buyer." No other figures.
     - **Closed companies:** one neutral sentence saying records from a business that has closed can sometimes qualify. Don't mention trustees or liquidators.
     - **How a buyer evaluates a sample**
   - **Infographics:**
     - `hero.svg`: a 4×2 grid of the 8 categories with simple geometric icons
     - `value-drivers.svg`: raises vs lowers value, as qualitative meters/bars. No numbers.

### B. Infographics (`src/assets/insights/<slug>/*.svg`)
- Hand-authored SVG with `viewBox="0 0 1200 675"` for heroes and 1200×(600–900) for the others, plus explicit `width`/`height` attributes. Include `role="img"`, `<title>` and `<desc>`.
- Use the site palette only: near-black `#0B0F19`/`#111827`, blue `#2563EB` (with lighter tints `#3B82F6`/`#DBEAFE`), greys `#F3F4F6`/`#E5E7EB`/`#6B7280`, white.
- Modern SaaS look: rounded cards, clear hierarchy, big readable labels (≥22px at 1200 wide), and system font stack `font-family="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"`. Text must be real `<text>`, not paths.
- No logos, no buyer names, no fake numbers. A small "dataceam.com" wordmark in a corner is fine.

### C. Code
1. `src/content.config.ts`: switch the schema to `({ image }) => z.object({...})` and add these optional fields:
   - `heroImage: image()`
   - `heroAlt: z.string()`
   - `ogImage: z.string()`
   - `keywords: z.array(z.string())`
   - `faq: z.array(z.object({ q: z.string(), a: z.string() }))`
2. `src/components/Seo.astro`: add optional props:
   - `ogType` (default `'website'`)
   - `publishedTime`, `modifiedTime`: emit `article:published_time` / `article:modified_time` when set
   - `ogImageAlt`: emit `og:image:alt`
   - Also emit `og:image:width`=1200 and `og:image:height`=630.
   - Thread these props through `Base.astro` if needed.
3. `src/layouts/Article.astro` (take the full entry or its data + id):
   - **Header:** breadcrumb nav (Home › Insights › title), h1, the description as a lede, published/updated date, and reading time (words/220, rounded up, e.g. "7 min read").
   - **Hero image:** use `<Image>` from `astro:assets` with `heroAlt`, `loading="eager"` and `fetchpriority="high"`.
   - **Body:** wrapped in `.prose`. Add article prose styles in `global.css`:
     - h2/h3 spacing
     - tables: bordered, striped, horizontally scrollable on mobile
     - images: full width, rounded, with a light border
     - captions (`em` directly after an image paragraph): muted, small
     - links: blue, underlined
   - **FAQ:** render frontmatter `faq` as an "Frequently asked questions" h2 with `<details>`/`<summary>` items, matching the `/faq/` style.
   - **Related articles:** up to 2 other non-draft posts, as cards with title and description.
   - **Closing CTA band:** reuse `EmailCta.astro` (label "Email me about your records").
   - **JSON-LD array:**
     - Article: `headline`, `description`, `image` (absolute og URL), `datePublished`, `dateModified`, `mainEntityOfPage` (canonical URL), `keywords`, `publisher` Organization with a `logo` (`/favicon.svg` absolute URL), and the existing conditional author
     - BreadcrumbList with 3 items
     - FAQPage when `faq` exists
   - Pass `ogType="article"`, published/modified times, `ogImage` and `ogImageAlt` to the Seo component.
4. `src/pages/insights/[...slug].astro`: pass what the layout needs.
5. `src/pages/insights/index.astro`:
   - **Title:** "Insights: Licensing Company Data for AI | Dataceam"
   - **Meta description (140–158 chars):** "Practical guides for business owners on preparing, valuing and licensing company records to AI developers, including what to do before selling a business."
   - **h1:** Insights, with a short intro paragraph.
   - **Posts:** a responsive card grid (1 col mobile, 2–3 desktop). Each card has the hero thumbnail (`<Image>`, lazy), date, reading time, title (h2 link) and description.
   - Keep the "Coming soon" fallback for zero posts.
6. `scripts/build-og.mjs`: keep the default card. For each non-draft markdown file in `src/content/insights/`:
   - parse `title` from the frontmatter (simple regex is fine)
   - build a 1200×630 SVG on the brand background: near-black, blue accent bar, "INSIGHTS" eyebrow, the title wrapped to ≤3 lines at ~64px bold white, and "dataceam.com"
   - render it with sharp to `public/og/<slug>.png`
   - Escape XML. Run `npm run og` and commit the PNGs.
7. Sitemap: in `astro.config.mjs`, keep `sitemap()` as-is unless adding `lastmod` is trivial. Don't add a dependency.

Acceptance:
- [ ] `npm run check` green. Prettier-format the new md/astro/mjs files.
- [ ] For each `dist/insights/<slug>/index.html`, check:
  - exactly one `<h1>`
  - `<title>` = frontmatter title + " | Dataceam"
  - meta description of 140–158 chars
  - canonical URL
  - `og:type` article
  - `og:image` = `https://dataceam.com/og/<slug>.png`
  - JSON-LD parses and contains Article, BreadcrumbList and FAQPage
  - every `<img>` has a non-empty alt
- [ ] `public/og/<slug>.png` exists for all 3.
- [ ] `dist/insights/index.html` lists 3 cards. `dist/rss.xml` has 3 items. The sitemap lists the 3 URLs.
- [ ] `sample-draft.md` removed.
- [ ] The rendered article HTML passes content-lint rules (the lint scans dist).
