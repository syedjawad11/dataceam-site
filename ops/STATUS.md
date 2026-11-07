# Project status — dataceam.com

Last updated: 2026-11-07

## Live
- https://dataceam.com: Cloudflare Pages project `dataceam-site`, built from `main` via the GitHub integration.
- `www.dataceam.com` redirects to the apex with a 301. The redirect rule lives under the domain's Rules → Redirect Rules.
- Each `task/*` branch gets a preview at `https://<branch-with-dashes>.dataceam-site.pages.dev`.
- Repo: `syedjawad11/dataceam-site` (private). PRs #1–#10 are merged.

## Built (Phase 0 + Phase 1 done)
| Page / feature | Notes |
|---|---|
| Home `/` | v2 (T-008, Jawad's verbatim copy): hero + tool-tile mosaic, why it has value, 8 data-type cards, 4 steps, 3 value tiers ($50K–$3M+ with "not a guarantee"), 6 privacy tiles, who qualifies, About + fee disclosure, "Email us" (`#contact`). "Who I am" and liquidators sections removed. |
| FAQ `/faq/` | 9 `<details>` items, disclosure visible under the h1, FAQPage JSON-LD |
| Privacy `/privacy/` | UK GDPR / ICO style |
| Insights `/insights/` | Content collection, "Coming soon" while there are no posts, Article layout, `/rss.xml` |
| SEO basics | 404, robots.txt, sitemap, OG image (`npm run og`), duplicate title/description lint |
| Design | Blue / grey / black palette: near-black header, hero, CTA and footer; blue `#2563EB` primary; grey alternating bands |

## Decisions (from Jawad)
- **No calls.** Email is the only contact method. No Cal.com and no booking anywhere.
- Go live with visible `[TO FILL: …]` placeholders. Jawad will supply the details one by one.
- Visual direction: blue / grey / black, modern SaaS look. Never name or copy any buyer's brand.

## Waiting on Jawad (all placeholders on the live site)
- [ ] FAQ disclosure still "I'm paid…" (first person) while Home now says "we": align?
- [ ] Contact email: the most important item, since it's the only CTA (`site.email` in `src/config/site.ts`)
- [ ] Full name, photo, 3–4 line bio (Who I am; adding the name also adds Person JSON-LD)
- [ ] X handle
- [ ] Who qualifies: company size, years of records
- [ ] Reply time and intro timing (FAQ "How long does it take?")
- [ ] Privacy: legal or trading name, postal address, ICO registration number, retention period, last-updated date
- [ ] Email provider (Zoho or Google Workspace), and whether cold outreach uses a secondary domain. This blocks Phase 2.
- [ ] Cloudflare Web Analytics token: set `PUBLIC_CF_BEACON_TOKEN` in the Pages env vars to turn the beacon on

## Next
1. Fill placeholders as details arrive. Edit `content/*.md` (CC) → Codex updates the pages → preview → "approve" → merge.
2. Phase 2: email DNS (MX / SPF / DKIM / DMARC). Every DNS change needs approval.
3. Insights articles, once Jawad wants to start publishing.

## Gotchas learned
- `codex exec` hangs waiting on stdin unless it is run with `< /dev/null`.
- Astro 7 `astro preview` uses a lock, so tests use `--ignore-lock`.
- linkinator `--skip` must not match localhost.
- Screenshots need `astro preview`, not `file://` (absolute `/_astro` paths).
- The Cloudflare GitHub app has to be granted access to the repo, or pushes won't trigger builds.
