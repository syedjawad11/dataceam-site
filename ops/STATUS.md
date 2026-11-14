# Project status — dataceam.com

Last updated: 2026-11-14

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

## In review — T-017 (2026-11-14)
Referrer-only relaunch on branch `task/017-referrer-relaunch`: new dark design, named operator (Syed Jawad, Malta), no buyer/platform names, and a new `/experts/` page with an in-browser résumé matcher and 59 open AI-training roles. See `ops/TASKS.md` T-017.
- Referral links: add your link to each role's `referralUrl` in `src/data/roles.json`. Empty = button goes to the public listing (no referral credit).
- Refresh roles: update `roles.json` and `rolesCheckedOn` in `src/data/roles.ts` at least weekly; remove closed roles.
- Repo visibility: GitHub reports `syedjawad11/dataceam-site` as **public** (this file used to say private). `ops/` notes are visible to anyone.

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
