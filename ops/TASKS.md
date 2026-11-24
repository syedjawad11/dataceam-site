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
| T-017 | Referrer-only relaunch + /experts/ page | done | task/017-referrer-relaunch | #20 |
| T-018 | Simpler hero + footer disclosure | review | task/018-simple-disclosure | — |

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

## T-014 — X handle @dataceam + privacy page rewrite
Goal: Go live with Jawad's X account and replace the privacy page with his approved copy (2026-11-08). Branch `task/014-x-handle-privacy`.

1. `src/config/site.ts`: set `xHandle: '@dataceam'`. The footer "X" link then points to https://x.com/dataceam, and `twitter:site` is `@dataceam`.
2. `src/pages/index.astro`: add `sameAs: ['https://x.com/dataceam']` to the Organization JSON-LD. Build the URL from `site.xHandle`.
3. `src/pages/privacy.astro`: replace the hard-coded copy so the page renders the body of `content/privacy.md` (use its `Content` export), keeping the `Base` layout, the `privacy-policy` article wrapper, and the `title`/`description` from the frontmatter. The markdown supplies the only h1. Turn the email address and `ico.org.uk` in the markdown into links (`mailto:hello@dataceam.com`, `https://ico.org.uk/make-a-complaint/`), either by editing the markdown links or in the page.
   - The rendered page must contain no `[TO FILL` placeholders, no "run by", and no name, postal address or ICO number.
   - Don't change any other copy in `content/privacy.md`.
4. `npm run check` must pass.

## T-016 — Home pricing: Starter tier company size "30+"
In `src/pages/index.astro` (pricing array, Starter row), change the description text `often a 20–50 person company` to `often a 30+ person company`. Change nothing else. `content/home.md` already updated by CC.

## T-017 — Referrer-only relaunch + /experts/ page
Status: **done** (PR #20, merged 2026-11-14) · Branch `task/017-referrer-relaunch` · Implemented directly by Claude (claude.ai cloud session, 2026-11-14) at Jawad's request in chat, not via Codex. Jawad chose "straight to live" once checks pass.
Goal: present Dataceam openly as a referrer only, run by a named person (Syed Jawad, Malta), with no buyer or platform names; add a job-referral side for experts.
Changes:
- New dark design ("plainly stated"): navy page, one blue signal colour, self-hosted Bricolage Grotesque headings, and a paper "Referral statement" card (`src/components/Ledger.astro`) on Home and /experts/.
- Home rewritten (`content/home.md` → `src/pages/index.astro`): referrer-only statement, published buyer tiers framed as the buyers' own ranges, "Get these in writing" checklist replaces the old protections list, "Who runs Dataceam" with name and fee disclosure.
- New `/experts/` (Jawad's decision: info and links only): work areas with typical pay from public listings (Nov 2026), a consent box that switches on the two referral links (`src/scripts/consent-links.ts`, nothing recorded), "Platform 1"/"Platform 2" cards using the general referral links in `src/config/site.ts`. No job list, no résumé collection.
- FAQ and privacy rewritten (controller named, experts page, referral links, legal basis, IDPC complaint line). Insights: "vetted buyers" and "$3M+" lines replaced.
- Header nav: For companies / For experts / Insights / FAQ. Footer: referrer-only disclosure. Security headers in `public/_headers`.
- content-lint: new disclosures, "referrer only" check on Home/experts/FAQ, Mercor and "vetted" added, URLs masked for the name rule.
- An earlier draft with an in-browser résumé matcher and a 59-role list was built and then removed at Jawad's request.
Waiting on Jawad: confirm hello@dataceam.com; fill FAQ timing placeholders.

## T-018 — Simpler hero + footer disclosure (like hkrefer.online)
Status: **done** (PR #21, merged) · Branch `task/018-simple-disclosure` · Implemented directly by Claude (claude.ai cloud session, 2026-11-14) at Jawad's request.
Changes: removed the "Dataceam, plainly" statement box from the Home and /experts/ heroes (and `Ledger.astro`); badge on both pages now reads "Independent referrer"; footer on every page now carries the full "Independent referrer disclosure" (run independently by Syed Jawad, not affiliated with any buyer or platform, referral fee at no cost to you, decisions made by the buyers/platforms, figures not a promise); location removed from visible copy (kept only in the privacy policy as controller identity).

---

# Redesign (Nov 2026): learning hub + light theme
Brief: `ops/REDESIGN-2026-11.md` (approved by Jawad, 2026-11-21). The brief wins where it disagrees with the current content rules; T-021 updates `CLAUDE.md`.

## T-019 — Light theme
Status: **done** (PR #22, approved by Jawad 2026-11-21) · Branch `task/019-light-theme` · Codex gpt-6.1-sol, 2 attempts. Known: Lighthouse SEO 0.92 on /experts/ (consent-locked links have no href; already on main, resolved with T-021).
Goal: switch the whole current site to the brief §4 palette. No structural or copy changes.
Files:
- `src/styles/global.css` (tokens renamed and recoloured; component styles updated)
- any component with hard-coded colours
- `scripts/build-og.mjs` (light OG cards; run `npm run og`)

Acceptance:
- [ ] no dark backgrounds remain
- [ ] all text pairs meet AA
- [ ] focus states visible
- [ ] Insights SVG infographics still readable
- [ ] `npm run check` passes; CC runs `check:full`
- [ ] CC sends Jawad screenshots at 375 px and 1280 px of Home, `/experts/` and an Insights article

## T-020 — Content collections and templates (tracks, repos, guides)
Status: **done** (PR #23, approved by Jawad 2026-11-21) · Branch `task/020-collections-skeleton` · Codex gpt-6.1-sol, 2 attempts · Scope cut by Jawad (2026-11-21): skeleton first. Templates are built in full; entries ship as `status: soon` ("Coming soon", noindex, not in the sitemap). Verified track, tested repo quickstart and the 14 guide texts follow in later PRs; logos (official SVGs) are added with the first live track.
Goal: the three collections from brief §5, with their index and detail pages, live but not yet in the header navigation.
Files:
- `src/content.config.ts`
- `src/pages/{tracks,repos,guides}/…`
- components: `TrackCard`, `CourseItem`, `WeeklyPlan`, `RepoCard`, `GuideCard`, `TopicTile`, `ProviderLogo`
- `src/assets/logos/`

Content (CC writes):
- `tracks/ai-engineer.md`, fully verified (brief §8)
- `repos/microsoft-ai-agents-for-beginners.md`, with quickstart tested by CC
- `guides/*.md` for all 14 explainers

Acceptance:
- [ ] pages match brief §3.2–3.4
- [ ] totals and weekly plan computed, not typed
- [ ] exactly one h1 per page; unique title and description
- [ ] JSON-LD valid
- [ ] `<video>` uses `preload="none"`
- [ ] no horizontal scroll at 375 px
- [ ] `check` passes; CC runs `check:full`

## T-021 — Information architecture switch + short links, PDFs, freshness scripts (T-022 merged in)
Status: **done** (PR #24, approved by Jawad 2026-11-21) · Branch `task/021-ia-switch-and-tooling` · Codex gpt-6.1-sol, 2 attempts · Jawad (2026-11-21): merge T-021 and T-022 into one task and finish it. Skeleton scope: newsletter block and Facebook show "Coming soon" (no form, no dead link).
Goal: flip the site to the new structure in one PR, and add the §7 tooling.
Files:
- new `src/pages/index.astro` (brief §3.1)
- `src/pages/companies.astro` (moved Home, §3.6); `content/home.md` → `content/companies.md`
- `src/pages/jobs.astro` (moved `/experts/`, §3.5), plus a `301` from `/experts/`
- `src/pages/disclosure.astro` and `content/disclosure.md` (§3.7)
- Header and Footer (§2); Person JSON-LD moved to the disclosure page
- FAQ copy (§6); `scripts/content-lint.mjs` (§6)

CC also does (control files):
- updates `CLAUDE.md` content rules per brief §6
- updates `ops/STATUS.md`

Acceptance:
- [ ] every old URL still resolves (`/experts/` redirects)
- [ ] the full disclosure is gone from the footer and lives on `/disclosure/`
- [ ] referral notice lines are present wherever referral links appear
- [ ] "Syed Jawad" appears only on `/disclosure/` and `/privacy/`
- [ ] content-lint self-tests updated and green
- [ ] `check:full` green
- [ ] Jawad approves the copy changes in the preview before merge

## T-022 — Short links, PDFs, freshness scripts
Status: **done** — merged into T-021 (PR #24, 2026-11-21). Scope below is delivered on the T-021 branch.
Goal: the tooling from brief §7, plus `/free/<keyword>` short links.
- A build step generates `dist/_redirects` from content frontmatter `shortlink` values (`/free/<keyword>  /<page>?utm_source=social&utm_medium=shortlink&utm_campaign=<keyword>  302`), merged with the static redirects.
- Plus `scripts/refresh-repos.mjs`, `links:external` and `pdfs` (brief §7).

Acceptance:
- [ ] each script has a dry-run flag and a clear report
- [ ] `check` passes

## T-023 — Later (blocked on Jawad)
Status: blocked · Planned for the next session (2026-11-22), with Jawad: newsletter provider + any Cloudflare database, analytics token, Facebook URL.
- Newsletter sign-up: provider choice; privacy policy update.
- Cloudflare Web Analytics token (`PUBLIC_CF_BEACON_TOKEN`), needed to measure the short links.
- Facebook Page URL for the footer and `sameAs`.
- `/news/` once daily news reels run.
- Insights articles to "we".

## T-024 — Footer links: grey, no underline
Status: **done** (PR #25, approved by Jawad 2026-11-21) · Branch `task/024-footer-links` · Codex gpt-6.1-sol, 1 attempt · Requested by Jawad 2026-11-21.
Goal: footer menu links show in grey with no underline instead of blue and underlined.
Acceptance:
- [ ] footer links (including the email) use `--color-body` with no underline; hover/focus go to `--color-ink`, with the focus ring kept
- [ ] links elsewhere on the site are unchanged
- [ ] `check` and Playwright green

---

# Guide articles (Nov 2026): long-form guides + daily cloud routines
Approved by Jawad 2026-11-24 (plan: two cloud routines, 01:00 and 14:00 Malta, one article each; setup PR may merge without a second approval if all gates are green). Supersedes the brief's "200-400 words + one-minute video" for guides.

Frontmatter contract for a live guide (both tasks rely on it):
```yaml
title: 'H1, the full question'
seoTitle: 'Browser title, max 49 characters (" | Dataceam" is added)'
description: '120-155 characters'
topic: llm-basics
status: live
image: ../../assets/guides/<slug>/cover.png
imageAlt: '...'
ogImage: /og/guides/<slug>.png
theme: daylight | blueprint | paper
primaryKeyword: 'what is a large language model'
keywords: ['...']          # 3-12
takeaways: ['...']         # 3-6 one-sentence strings
faq: [{ q: '...', a: '...' }]   # 4-6, plain text answers
sources: [{ title, url, checked }]   # 5+
pubDate: 2026-11-24
updatedDate: optional
tracks: [ai-engineer]
```
Body images: `![alt](../../assets/guides/<slug>/<file>.png)` followed by a blank line and an italic-only caption paragraph `*Caption.*`. Body has no h1, FAQ or Sources section (the template renders those from frontmatter).

## T-025 — Guide article template, SEO/GEO, slash rule
Status: in review · Branch `task/025-guide-articles` · Written by a Claude Sonnet subagent (Codex at its usage limit; one-time exception, Jawad 2026-11-24)
Goal: `/guides/<slug>/` renders a full long-form article well, and every URL ends in a slash, enforced.

1. `src/content.config.ts` (guides): add `seoTitle` (max 49), `primaryKeyword`, `keywords` (array), `takeaways` (array), `faq` ({q,a} array), `theme` (enum daylight/blueprint/paper), `ogImage` (string matching `^/og/guides/[a-z0-9-]+\.png$`). All optional for `soon`; for `live` each is required (superRefine), with takeaways 3-6, faq 4-6, keywords 3-12, sources ≥ 5, description 110-160 characters. `seoTitle` may also be set on soon entries and is used as their <title>.
2. `src/pages/guides/[slug].astro` for live guides, in this order: breadcrumb; h1; description as lede; meta line ("By Dataceam", Published date, Updated date if set, "N min read"); cover image; "Key takeaways" box (aside with h2); "On this page" contents (a `<nav aria-label="On this page">` with a `<details open>` list of body h2 headings from `render()` plus FAQ and Sources anchors); optional video as today but without hard-coded 1280×720 distortion (keep it working; no guide uses it now); body; FAQ section (native `<details>`, same markup/classes as Article.astro); Sources as a numbered list (`<ol>`) with title link and "Checked <date>"; Related guides: live guides only, same topic first then other topics, max 3; hide the section when there are none; Related tracks only as today.
   - Title tag: `${seoTitle ?? title} | Dataceam`. Pass canonical ending in `/`, ogType article, publishedTime, modifiedTime, ogImage, ogImageAlt.
   - JSON-LD for live guides: Article (headline, description, image absolute URL, datePublished, dateModified, mainEntityOfPage, keywords, articleSection = topic label, author and publisher Organization Dataceam with url `https://dataceam.com/`, `citation` = source URLs, inLanguage "en"), BreadcrumbList, FAQPage. Share the reading-time and JSON-LD helpers with `src/layouts/Article.astro` by moving them to `src/lib/article.ts` (no behaviour change for Insights).
   - `soon` notice text becomes: "**Coming soon.** This guide is being written."
   - JSON-LD breadcrumb and visible breadcrumb use the title.
3. `src/styles/global.css`: guide article column centred like Insights (70ch reading column; breadcrumb, h1 and lede in the same column). h1 on guide articles clamps smaller (max about 3rem) since titles are long. `.learning-body` gets the same treatment as `.article-body` for h2/h3 spacing, li spacing, tables (scroll container, zebra, on a 375px screen no page scroll), images (full width, border, radius), italic caption after image, blockquote (used as a callout such as "**In short:** ..."), code, hr. Share selectors, don't duplicate rules. Links inside `.prose` paragraphs, list items, table cells, blockquotes and FAQ answers must be normal inline text links (the 44px inline-flex rule must not apply there); keep 44px targets for cards, nav and contents lists. Style the takeaways box (surface-tint background, signal left border) and contents box.
4. Lists: one sort helper in `src/lib/learning.ts`, live first, newest pubDate first, then soon by the queue order in `ops/guides/queue.json` if that file exists, else title (do not fail when it is missing; simplest is to keep current pubDate order for soon). Home "Latest guides" shows live guides only when at least one is live, else current behaviour.
5. Copy (guides no longer have videos): remove every "one-minute"/"1-min"/"a diagram and a short read" claim.
   - guides index intro/description: "Plain-English guides to how AI works, with pictures, examples and sources. No technical background needed."; title tag "AI Guides in Plain English | Dataceam"; h1 "AI guides in plain English".
   - Home guides blurb: "Plain-English explainers of how AI actually works, each with pictures, examples and its sources."
   - topic descriptions in `topicLabels`, all unique: llm-basics "Plain-English guides to how large language models work: tokens, context windows, parameters, training and more."; retrieval-rag "Plain-English guides to embeddings and retrieval-augmented generation (RAG)."; agents "Plain-English guides to AI agents: what they are, how they act and where they go wrong."; prompting-safety "Plain-English guides to prompting, fine-tuning and prompt injection."; hardware "Plain-English guides to the chips and hardware that run AI."
   - keep "1-min video" on GuideCard only when a video exists (already conditional; fine).
   - topic page h1: `${label} guides`, title `${label}: AI Guides in Plain English | Dataceam`.
6. `GuideCard`: shows the cover when live; card link text is the title.
7. GEO/feeds: `src/pages/llms.txt.ts` → `/llms.txt` (llmstxt.org format: `# Dataceam`, blockquote summary "Free AI-learning guides in plain English, plus referral information for AI-training work and data licensing. Dataceam is a referrer only.", sections "## Guides" (live guides only: `- [title](absolute url with slash): description`; omit the section when none), "## Insights", "## About" (FAQ, AI jobs, For companies, Referral disclosure)). No buyer/platform names. `rss.xml.ts`: include live guides; feed title "Dataceam guides and insights", description "New guides and insights from Dataceam."; update the Base.astro feed title. Sitemap: `lastmod` for guides (updatedDate ?? pubDate) and insights via `serialize` in astro.config.mjs.
8. Slash rule: `trailingSlash: 'always'`, `build: { format: 'directory' }` in astro.config.mjs (make sure `/rss.xml`, `/llms.txt`, sitemap, 404 and `astro preview` still work). `scripts/content-lint.mjs`: for every built HTML file fail on any internal `href` (root-relative, relative, or absolute https://dataceam.com/ / http / www) whose path has no trailing slash and no file extension in the last segment (ignore pure `#x`, mailto:, tel:), and on canonical/og:url without the slash, and on slashless page URLs inside `<script type="application/ld+json">`, `dist/sitemap-*.xml` and `dist/rss.xml`. `https://dataceam.com` with no path must be written `https://dataceam.com/`. Add self-tests. Also lint `src/content/guides/*.md` and `src/content/insights/*.md` markdown links the same way.
9. content-lint partner/agent/representative rule: "agent" is a normal word in AI guides. Skip only the `agent` alternative for files under `dist/guides/` and `src/content/guides/` and for the phrase "AI agent" anywhere; `partner` and `representative` still apply everywhere. Self-tests for both.
10. Tests: `tests/learning.spec.ts` must derive status from `src/content/guides/*.md` (and tracks/repos) frontmatter so that publishing a guide never breaks tests: live page → no noindex, in sitemap, Article+FAQPage+BreadcrumbList JSON-LD, one h1, contents nav, at least 2 body images; soon page → as today. Card counts derived from the files; titles read from files. Keep phone-width overflow checks for a live guide. `lighthouserc.json`: keep all thresholds, but noindex pages must not fail the SEO category (use `assertMatrix` or turn off `is-crawlable`; choose the approach that still fails SEO regressions on indexable pages).
11. Update the 14 titles and seoTitles? No: Claude Code does that in `src/content/guides/`.

Don't touch: `package.json`, `scripts/build-infographics.mjs`, `scripts/guide-*.mjs`, `ops/` (T-026 and CC own them).
To verify rendering without publishing, build temporarily with a throwaway live fixture guide and images, then remove it fully before finishing.

Acceptance:
- [ ] `npm run check` green with all guides soon, and also green with a temporary live fixture
- [ ] WCAG AA, one h1, no horizontal scroll at 375 px on a live guide with a wide table
- [ ] Insights pages unchanged except shared helpers

## T-026 — Guide tooling: infographics, guide lint, publish guard
Status: in review · merged into the T-025 branch/PR · Written by Claude subagents (same exception)
Installed by CC: `satori`, `@resvg/resvg-js`, `@fontsource/inter`, `@fontsource/bricolage-grotesque`, `sharp` (use the `.woff` latin 400/600/700/800 files; satori cannot read woff2 or variable fonts). Plain Node ESM scripts, Node 22, no other dependency, no browser, no network except where stated.

1. `scripts/build-infographics.mjs` → `npm run guide:images -- <slug> [--out <dir>]`. Reads `ops/guides/infographics/<slug>.json`:
```json
{"slug":"...","theme":"daylight|blueprint|paper","images":[
 {"file":"cover","layout":"cover","kicker":"LLM basics","title":"...","subtitle":"...","icons":["chat","book","chip"]},
 {"file":"kebab-name","layout":"steps","title":"...","items":[{"icon":"chat","label":"...","text":"..."}],"note":"..."},
 {"layout":"compare","title":"...","columns":[{"heading":"...","icon":"...","items":["..."]},{"heading":"...","icon":"...","items":["..."]}],"verdict":"..."},
 {"layout":"cycle","title":"...","center":"...","items":[{"label":"...","text":"..."}]},
 {"layout":"layers","title":"...","items":[{"label":"...","text":"..."}],"note":"..."},
 {"layout":"bars","title":"...","items":[{"label":"...","value":12,"display":"12 words"}],"note":"...","source":"..."},
 {"layout":"cards","title":"...","items":[{"icon":"...","label":"...","text":"..."}]},
 {"layout":"analogy","title":"...","left":{"heading":"...","icon":"..."},"right":{"heading":"...","icon":"..."},"pairs":[{"left":"...","right":"..."}],"note":"..."}
]}
```
   - Output: cover 1200×675 → `src/assets/guides/<slug>/cover.png`; every other image 1080 px wide, height fits content (min 800, max 1700) → `<file>.png`; plus 1200×630 `public/og/guides/<slug>.png` from the cover data (category kicker, title, dataceam.com). Rendered crisp: body images at 1.5× pixel density at most, PNG optimised with sharp (palette/quality) so body images stay under ~250 KB and the OG under 300 KB.
   - Type sizes on the 1080 canvas: titles ≥ 54px, labels ≥ 36px, text ≥ 31px (must read on a 375px phone); small "dataceam.com" footer ≥ 24px. Headings Bricolage Grotesque 700/800, text Inter 400/600. Generous padding, consistent grid, rounded cards, connectors/arrows drawn as SVG, number badges. It must look designed (editorial infographic quality), not like a default flow chart: strong hierarchy, icon chips, accent shapes, subtle background texture per theme.
   - Three themes, the same eight layouts in each (theme tokens drive colour, background texture, border, shape and accent treatment):
     - daylight: page #f6f8fc, white cards, #2563eb accents, ink #0b1222, soft #eef3ff blocks, dotted corner pattern.
     - blueprint: deep navy #0b1a3a, fine grid lines, light-blue #93c5fd linework, white text, outlined cards, dashed connectors, small cross marks at corners.
     - paper: warm off-white #faf6ee, ink #1c1a17 lines 3px, amber #f2b84b and blue #2563eb marker highlights behind key words/badges, offset "sticker" shadows.
     All text/background pairs meet WCAG AA (export a small contrast assertion in the self-test).
   - ~28 built-in 2px line icons as SVG paths (chat, book, brain, chip, search, lock, shield, gear, database, document, calculator, dice, bolt, layers, link, user, robot, clock, check, cross, warning, puzzle, scale, target, pencil, eye, cloud, server, cart, mail). Unknown icon → error listing valid names.
   - Limits validated with clear messages (title ≤ 70 characters, subtitle ≤ 120, label ≤ 34, text ≤ 110, steps 3-6, cycle 3-5, layers 3-6, bars 2-6, cards 3-6, compare 2-6 items per column, analogy pairs 3-5, note/verdict ≤ 140; `file` kebab-case unique; exactly one cover, 2-4 other images). Text must never overflow or be cut: let height grow; fail if height would exceed 1700. Only characters the font supports (fail otherwise); no em dashes.
   - `--self-test`: renders every layout in every theme from built-in fixtures to a temp dir and checks dimensions, size limits, contrast.
   - `--samples <dir>`: writes the fixture renders to <dir> for review.
2. `scripts/guide-lint.mjs` → `npm run guide:lint [-- <slug>]`, with `--self-test`; add to `check` (after `content-lint`, only live guides are linted; passing a slug lints that guide even when soon). Every failure prints file, rule and how to fix. Rules:
   - frontmatter: title 35-75 chars; seoTitle ≤ 49; description 110-160; primaryKeyword words appear as a phrase (case/punctuation-insensitive, ignoring bracketed abbreviations) in title or seoTitle; all significant primaryKeyword words in the first body paragraph, in the description and in ≥ 1 h2; exact phrase not more than 12 times in the body; image and ogImage files exist; theme matches the infographic JSON; pubDate not in the future (UTC+14 tolerance).
   - body words (prose, tables, lists; not code, alt text, URLs) 1200-3000; first paragraph 40-90 words before any heading; ≥ 5 h2 and ≥ 2 h2 phrased as questions; no h1; no heading-level jumps; no h2 that duplicates FAQ q; ≥ 1 markdown table; ≥ 1 ordered list or worked-example heading; ≥ 2 blockquote lines starting `**In short:**`.
   - paragraphs ≤ 110 words; average sentence ≤ 20 words; no sentence > 40 words; Flesch reading ease ≥ 50 (implement with a reasonable syllable counter).
   - style: no em dash or " -- "; ≤ 2 exclamation marks; banned phrases list (case-insensitive; keep it in `ops/guides/banned-phrases.json`, CC-owned, array of strings/regex strings; fail if the file is missing); curly quotes allowed; no "As an AI"; no first-person singular (I, my, me) outside quotes.
   - sources: ≥ 5, https, unique, each URL linked at least once in the body; every external body link is listed in sources; `checked` within 400 days.
   - internal links: ≥ 4 distinct internal page links in the body, trailing slash, and the target exists and is live/indexable (other live guides, live topic pages `/guides/topic/<topic>/` with a live guide, `/guides/`, non-draft `/insights/<slug>/`, or static pages `/`, `/faq/`, `/jobs/`, `/companies/`, `/insights/`, `/disclosure/`); anchor text not "here", "click here", "read more" or a bare URL; a guide may not link to itself. While fewer than 4 other live guides exist, the minimum is 2. Never an external referral platform link.
   - images: 2-4 body images, each existing file under `src/assets/guides/<slug>/`, alt 40-250 chars, caption line after each, not the cover, spread (no two images adjacent without at least one paragraph between besides the caption).
   - faq 4-6, answers 25-90 words, questions end with "?".
   - originality: no shared 10-word sequence with any other live guide body (ignore quoted/link titles).
3. `scripts/guide-queue.mjs` → `npm run guide:next`: reads `ops/guides/queue.json` (`{guides:[{slug,...}]}`), guide frontmatter status and `ops/guides/parked.json` (`{"<slug>":{"attempts":n,"reason":"...","date":"..."}}`, may be missing). Prints the full brief JSON of the first guide that is not live and has < 2 parked attempts, plus `liveGuides` (slug, title, url) for internal linking; prints `QUEUE_EMPTY` when none. `npm run guide:next -- --list` prints a table.
4. `scripts/guide-sources.mjs` → `npm run guide:sources -- <slug>`: GETs each source URL (browser-like generic user agent, follow redirects, 20 s timeout) and prints status, final URL, `<title>`; exit 1 on network error/404/410/5xx; 401/403/429 print "BLOCKED: open it with WebFetch".
5. `scripts/publish-guide.mjs` → `npm run guide:publish -- <slug> [--dry-run]`. The only path by which the routine reaches `main`:
   - must be on `main`, HEAD equal to or ahead of origin/main only by zero commits (fetch first; `git pull --ff-only` done by the caller), nothing staged beforehand.
   - changed + untracked files (git status --porcelain -z) must all match: `src/content/guides/<any existing>.md`, `src/assets/guides/<slug>/*.png`, `public/og/guides/<slug>.png`, `ops/guides/infographics/<slug>.json`, `ops/guides/log.md`, `ops/guides/parked.json`. Deletions, renames, symlinks, executable bits and anything else → refuse, listing the files.
   - exactly one guide changes status: `<slug>` soon → live versus HEAD, with pubDate = today in Europe/Malta. At most 3 other guides may change, all already live; in those only body text may change plus `updatedDate` (title, status, slug, pubDate, sources etc. unchanged), and the body diff must only add markdown links to `/guides/<slug>/` (same text once links to the new guide are unwrapped).
   - `<slug>` must be in queue.json; its title and topic unchanged from HEAD's frontmatter.
   - infographics: re-render and compare that the committed PNGs match the JSON (same dimensions and pixel-identical, or re-render in place before committing).
   - runs `npm run guide:lint -- <slug>` and `npm run check`; any failure → exit 1, nothing committed.
   - appends a row to `ops/guides/log.md` (date, slug, words, commit left as "this commit"), removes the slug from parked.json if present, stages only the allowed files, commits `content: publish guide <slug>` with trailer `Co-Authored-By: Claude <noreply@anthropic.com>`, pushes `HEAD:main` (never force). If rejected: `git pull --rebase origin main` once, rerun `npm run check`, push again; on a second rejection exit 1 with instructions. Prints `PUSHED <sha>`.
   - `--dry-run`: all checks, no commit/push.
   - `npm run guide:publish -- <slug> --park "<reason>"`: requires the only changes to be parked.json after `git checkout` of the rest is done by the caller; increments attempts, commits `ops: park guide <slug>`, pushes the same way. Refuses any other change.
   - Use `execFileSync`/`spawn` with argument arrays (no shell interpolation); slug must match `^[a-z0-9-]+$`.
   - `--self-test`: builds throwaway git repos in a temp dir (with a local bare "origin") and proves each refusal: out-of-scope file, second guide going live, edit to another live guide beyond links, wrong branch, deletion, dirty index, unknown slug; and one successful push. `npm run check` must be injectable (e.g. env or flag usable only together with --self-test) so the self-test does not run the real build.
6. `scripts/verify-guide.mjs` → `npm run guide:verify -- <slug>`: polls `https://dataceam.com/guides/<slug>/` (cache-busting query is fine) every 20 s up to 8 minutes until 200, contains the h1 title text, no `noindex`; then checks that URL without slash redirects to the slash URL, the URL is in `/sitemap-0.xml`, every `<img>` src and the og:image return 200, JSON-LD has Article and FAQPage. Prints `LIVE <url>` or fails.
7. `package.json` scripts: the names above, plus `check` runs `guide:lint --self-test`, `guide:lint`, and `publish-guide --self-test` (fast, < 20 s) and `build-infographics --self-test` if < 20 s.
8. `npm run og` (build-og.mjs) must not touch `public/og/guides/`. Fix the default OG text (`src/assets/og.svg`) only if trivial: no, leave it.

Don't touch: `src/**` (T-025 owns it), `ops/**` except nothing, `scripts/content-lint.mjs`.

Acceptance:
- [ ] all self-tests green; samples rendered for CC's visual review in all 3 themes
- [ ] publish guard refusals proven by the self-test
