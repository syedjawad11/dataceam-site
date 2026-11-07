# CLAUDE.md — Orchestrator rules (Claude Code)

Project: **dataceam.com** — Astro (static) + TypeScript + Tailwind v4, hosted on Cloudflare Pages (project `dataceam`).
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
codex exec -C "$(git rev-parse --show-toplevel)" -s workspace-write "<task spec>"
```
- Codex has no network; CC runs `npm install` itself before/after dispatch when deps change.
- Paste the full task spec from `ops/TASKS.md` plus any review feedback.

## Quality gates
- `npm run check` — fast gates (build, astro check, eslint, prettier, content-lint, links). Run after every Codex attempt.
- `npm run check:full` — `check` + Lighthouse CI + axe + gitleaks. Run by `/ship`.

## Content rules (hard)
- No buyer logos or names (micro1, DataFactor, Lodex or others).
- Never claim to be a buyer's partner, agent or representative. Say: *"I work with several vetted AI data buyers."*
- No promised or guaranteed amounts. Ranges only, worded with "may" and "depends on the data".
- No urgency or get-rich language.
- Referral-fee disclosure on Home and FAQ: *"I'm paid a referral fee by the buyer. It costs you nothing."*
- No LinkedIn links anywhere.
- Never use the term "data broker".
