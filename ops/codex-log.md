# Codex performance log

One row per Codex run. Summary every 10 tasks (or weekly): first-pass rate, average attempts, most common failure types, actions taken.
Escalate to Jawad if first-pass rate < ~60% or the same failure type repeats 3+ times.

| Date | Task | Attempt | Gates passed | Issues found in review | Time | Result |
|---|---|---|---|---|---|---|
| 2026-11-07 | T-000 | 1 | build, types, lint, content-lint, gitleaks (sandbox blocked links/LHCI/axe) | linkinator `--skip` regex skipped every URL (0 links scanned); Playwright webServer exited early (Astro 7 preview lock); `gitleaks detect` ignores uncommitted work; prettierignore excluded files instead of formatting | 163s | retry |
| 2026-11-07 | T-000 | 2 | all (`check:full` green, run by CC) | none | ~3m | pass |
| 2026-11-07 | T-001 | 1 | build, types, lint, content-lint | linkinator 404s: nav/footer linked to /faq/, /privacy/, /insights/ which didn't exist; no `data-page` hook on Base | ~3m | retry |
| 2026-11-07 | T-001 | 2 | all (`check:full` green, run by CC) | first dispatch hung: `codex exec` waits on stdin unless given `< /dev/null` (CC fix) | 36s | pass |
| 2026-11-07 | T-005 | 1 | all (`check:full` green, run by CC) | none | 116s | pass |
| 2026-11-07 | T-006 | 1 | all (`check:full` green, run by CC) | none | 96s | pass |
| 2026-11-07 | T-002 | 1 | all | footer still emitted `TODO_` values in hrefs (out of task scope; Codex flagged it) | 222s | retry |
| 2026-11-07 | T-002 | 2 | all | md section labels (Hero / Disclosure / Call to action) rendered as visible headings — spec ambiguity, CC's fault | 37s | retry |
| 2026-11-07 | T-002 | 3 | all (`check:full` green, screenshot reviewed) | none | 49s | pass |
| 2026-11-07 | T-003 | 1 | all | disclosure only inside a collapsed `<details>` (not visible by default) — spec gap, CC's fault | 144s | retry |
| 2026-11-07 | T-003 | 2 | all (`check:full` green, screenshot reviewed) | none | 38s | pass |
| 2026-11-07 | T-004 | 1 | all (`check:full` green, screenshot reviewed) | none | 99s | pass |
| 2026-11-07 | T-007 | 1 | all (`check:full` green, desktop/mobile screenshots reviewed) | none | 235s | pass |
| 2026-11-07 | T-008 | 1 | all (`check:full` green, desktop/mobile screenshots reviewed, no horizontal scroll at 375px) | none | 213s | pass |
| 2026-11-07 | T-009 | 1 | build, astro check, lint, content-lint (links/Chromium blocked in sandbox) | astro check: tests/home.spec.ts baseURL undefined | 233s | fail |
| 2026-11-07 | T-009 | 2 | astro check | playwright: mobile focus-trap test too strict for native dialog | ~120s | fail |
| 2026-11-07 | T-009 | 3 | all (check:full green, 12/12 Playwright) | screenshot review: missing space "It lists**US$…**" (JSX whitespace before <strong>, index.astro:102) | ~250s | blocked — 3-attempt limit |
| 2026-11-07 | T-009 | CC | check:full green | none — Jawad authorised CC to apply the one-line whitespace fix past the 3-attempt limit | — | pass |
| 2026-11-07 | T-010 | CC | check:full | none — git revert of #12 at Jawad's request (no Codex run) | — | pass |
| 2026-11-07 | T-011 | 1 | all (check:full green; screenshots on preview) | none | 51s | pass |
| 2026-11-08 | T-012 | 1 | all (check:full green) | none — Codex also filled the privacy controller contact placeholder (in scope) | 52s | pass |
| 2026-11-08 | T-013 | 1 | all (check green; linkinator re-run outside sandbox) | CC fixed 2 ungrammatical meta descriptions (copy only) | ~15m | pass |
| 2026-11-08 | T-014 | 1 | all (check green; linkinator re-run outside sandbox) | none — CC wrote privacy copy per Jawad's brief | ~1m | pass |
| 2026-11-10 | T-016 | 1 | all (check green) | none | ~30s | pass |
