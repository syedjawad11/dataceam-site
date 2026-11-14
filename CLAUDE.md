# CLAUDE.md — Orchestrator rules (Claude Code)

Project: **dataceam.com** — Astro (static) + TypeScript + Tailwind v4, hosted on Cloudflare Pages (project `dataceam-site`). Current state: `ops/STATUS.md`.
Owner/approver: **Jawad**. Implementer: **Codex CLI**. Full spec: `../dataceam-development-plan.md`.

## Rules
1. Read `ops/TASKS.md` and the content rules below before starting any work.
2. **Never write application code.** Every code change (pages, components, styles, scripts, config, tests, `package.json` scripts) goes to Codex as a task spec, review feedback included.
   - Carve-out: CC writes control files only: `CLAUDE.md`, `AGENTS.md`, `ops/*`, `.claude/*`, and page copy in `content/*.md`.
3. One task = one branch = one PR. Branch name: `task/<id>-<slug>`.
4. After every Codex attempt: review the diff against the spec, then run `npm run check`.
5. At most **3 Codex attempts** per task. After that, stop and report to Jawad with the diff, the errors and a proposed fix.
6. Log every Codex run as a row in `ops/codex-log.md`.
7. Never merge to `main`, push to `main`, deploy to production, change DNS, delete anything or touch secrets without Jawad's explicit **"approve"** in chat — every time. (`main` has no GitHub branch protection; this rule is the protection.)
8. The content rules below are hard requirements. Reject any diff that breaks them.
9. Keep summaries to Jawad short: what changed, the preview URL, anything that needs his decision.

## Dispatching to Codex
```
codex exec -C "$(git rev-parse --show-toplevel)" -s workspace-write "<task spec>" < /dev/null   # stdin must be closed or codex waits forever
```
- Codex has no network; CC runs `npm install` itself before/after dispatch when deps change.
- Paste the full task spec from `ops/TASKS.md` plus any review feedback.

## Quality gates
- `npm run check` — fast gates (build, astro check, eslint, prettier, content-lint, links). Run after every Codex attempt.
- `npm run check:full` — `check` + Lighthouse CI + axe + gitleaks. Run by `/ship`.

## Content rules (hard)
Positioning (Jawad, 2026-11-14, T-017): **Dataceam is a referrer only**, run openly by a named person (Syed Jawad, Malta), with no buyer or platform named on the site.
- No buyer or platform logos or names (micro1, Mercor, DataFactor, Lodex or others) in visible copy. Referral and listing URLs in links and in `src/data/roles.json` are fine; content-lint masks URLs for this rule only.
- Never claim to be a buyer's or platform's partner, agent or representative, and never imply Dataceam hires, screens or pays anyone. Say: *"I take part in the referral programmes of a small number of AI-data buyers and AI-training platforms."*
- Never describe buyers as "vetted", "our buyers" or "current buyers", and never describe data handling Dataceam doesn't do (cleaning, PII stripping, encrypted access). Buyer commitments are framed as "get these in writing".
- "Dataceam is a referrer only." must appear on Home, /experts/ and FAQ.
- Referral disclosures (exact, enforced by content-lint):
  - Home: *"If a company I introduce signs with a buyer, the buyer may pay me a referral fee. You pay nothing for my help."*
  - /experts/: *"If you're hired through one, the platform may pay me a referral bonus."*
  - FAQ: *"If a deal or a hire happens, the buyer or platform may pay me a referral fee. It costs you nothing."*
- Amounts: only the buyers' published tiers ($50K+ / $500K+ / $1M+; "from around $50,000 to over $1 million"), always next to "not a promise" / "each buyer prices each company itself". No promised or guaranteed amounts.
- /experts/: role pay comes from the platforms' public listings; say it can change. The résumé matcher must stay fully client-side (no network calls, no analytics on that page, CSP in `public/_headers`); the privacy policy describes this, so keep them in sync.
- No urgency or get-rich language. No LinkedIn links anywhere. Never use the term "data broker".
