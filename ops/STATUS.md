# Project status — dataceam.com

Last updated: 2026-11-21

## Live
- https://dataceam.com: Cloudflare Pages project `dataceam-site`, built from `main` via the GitHub integration.
- `www.dataceam.com` redirects to the apex with a 301. The redirect rule lives under the domain's Rules → Redirect Rules.
- Each `task/*` branch gets a preview at `https://<branch-with-dashes>.dataceam-site.pages.dev`.
- Repo: `syedjawad11/dataceam-site` (private). PRs #1–#8 are merged.

## Built (Phase 0 + Phase 1 done)
| Page / feature | Notes |
|---|---|
| Home `/` | Hero, How it works (3 cards), Who qualifies, Liquidators, Who I am, disclosure, "Interested? Email me" (`#contact`) |
| FAQ `/faq/` | 9 `<details>` items, disclosure visible under the h1, FAQPage JSON-LD |
| Privacy `/privacy/` | Live — renders content/privacy.md (T-014) |
| Insights `/insights/` | 3 articles (T-013, 2026-11-08) with SVG infographics, per-article OG PNGs (`npm run og`), Article/BreadcrumbList/FAQPage JSON-LD, card index, `/rss.xml` |
| SEO basics | 404, robots.txt, sitemap, OG image (`npm run og`), duplicate title/description lint |
| Design | Blue / grey / black palette: near-black header, hero, CTA and footer; blue `#2563EB` primary; grey alternating bands |

## Decisions (from Jawad)
- **No calls.** Email is the only contact method. No Cal.com and no booking anywhere.
- Go live with visible `[TO FILL: …]` placeholders. Jawad will supply the details one by one.
- Visual direction: blue / grey / black, modern SaaS look. Never name or copy any buyer's brand.

## T-017 (2026-11-14) — referrer-only relaunch
New dark design, named operator (Syed Jawad, Malta), no buyer/platform names, and a new `/experts/` page: work areas with typical pay, a consent box, and one general referral link per platform (`src/config/site.ts` → `expertPlatforms`). See `ops/TASKS.md` T-017.
- To change a referral link, edit `expertPlatforms` in `src/config/site.ts`.
- Pay ranges on /experts/ are dated November 2026; refresh them every few months.
- Repo visibility: GitHub reports `syedjawad11/dataceam-site` as **public** (this file used to say private). `ops/` notes are visible to anyone.

## T-018 (2026-11-14): merged (PR #21)
"Independent referrer" badge on Home and /experts/; full disclosure in the footer of every page.

## Redesign (Nov 2026)
Brief: `ops/REDESIGN-2026-11.md` (approved by Jawad, 2026-11-21). Tasks T-019 to T-023 in `ops/TASKS.md`.
- Light theme replaces the dark design (T-019, **done**, PR #22, 2026-11-21).
- Home becomes a learning hub: Guides, Career tracks, Repos, AI jobs; the company pitch moves to `/companies/` (T-020, T-021).
- Voice "we, Dataceam"; the full referral disclosure moves to `/disclosure/`, with a short notice next to every referral-link block (T-021).
- Referral links stay only on `/jobs/` (today's `/experts/`), behind the consent box.
- Jawad's answers (2026-11-21): disclosure wording approved; CC may write entries in `src/content/{tracks,repos,guides}/`; newsletter yes (provider and any Cloudflare database planned in a separate session); Facebook URL to come. Until then: build skeletons with "Coming soon" placeholders (no sign-up form, no dead social link). SEO polish deferred.
- T-020 done (PR #23, 2026-11-21) as a skeleton: templates + "Coming soon" entries (`status: soon`, noindex, out of the sitemap). Real track/repo/guide content follows in later PRs.
- T-021 done (PR #24, 2026-11-21), with T-022 merged in (Jawad, 2026-11-21): new Home, `/companies/`, `/jobs/` (301 from `/experts/`), `/disclosure/`, new header/footer, newsletter "Coming soon" block, `/free/` short links, freshness and PDF scripts.
- Next session (2026-11-22): T-023 with Jawad — newsletter provider and any Cloudflare database, analytics token, Facebook URL.

## Waiting on Jawad (all placeholders on the live site)
- [x] Contact email: `hello@dataceam.com` (Google Workspace), filled in T-012 (2026-11-08)
- [x] Full name: Syed Jawad, Malta (T-017; Person JSON-LD added). Photo and longer bio still optional.
- [x] X handle — @dataceam (T-014)
- [ ] Who qualifies: company size, years of records
- [ ] Reply time and intro timing (FAQ "How long does it take?")
- [x] Privacy — rewritten without personal details; intro-only role and buyer–seller disclaimer (T-014)
- [x] Email provider: Google Workspace (2026-11-08). Still open: whether cold outreach uses a secondary domain. Phase 2 DNS (MX/SPF/DKIM/DMARC) is next and needs approval.
- [ ] Cloudflare Web Analytics token: set `PUBLIC_CF_BEACON_TOKEN` in the Pages env vars to turn the beacon on
- [ ] **Revisit later (Jawad, 2026-11-07):** T-011 closed-company callout on Home. CC added this sentence on its own: "In a bankruptcy or liquidation, the trustee or liquidator usually needs to approve the deal." Reason: when a business is bankrupt or liquidated, the owner usually can't sign a deal alone. Jawad to decide whether to keep it or leave it out.

## Next
1. Fill placeholders as details arrive. Edit `content/*.md` (CC) → Codex updates the pages → preview → "approve" → merge.
2. Phase 2: email DNS (MX / SPF / DKIM / DMARC). Every DNS change needs approval.
3. Insights: 3 articles live (T-013). Jawad to submit sitemap + request indexing in Google Search Console.

## Gotchas learned
- `codex exec` hangs waiting on stdin unless it is run with `< /dev/null`.
- Astro 7 `astro preview` uses a lock, so tests use `--ignore-lock`.
- linkinator `--skip` must not match localhost.
- Screenshots need `astro preview`, not `file://` (absolute `/_astro` paths).
- The Cloudflare GitHub app has to be granted access to the repo, or pushes won't trigger builds.
- Cloudflare truncates preview aliases to 28 characters (`task-020-collections-skeleto…`). Take the URL from the PR comment, not from the branch name.
