# Codex performance log

One row per Codex run. Summary every 10 tasks (or weekly): first-pass rate, average attempts, most common failure types, actions taken.
Escalate to Jawad if first-pass rate < ~60% or the same failure type repeats 3+ times.

| Date | Task | Attempt | Gates passed | Issues found in review | Time | Result |
|---|---|---|---|---|---|---|
| 2026-11-07 | T-000 | 1 | build, types, lint, content-lint, gitleaks (sandbox blocked links/LHCI/axe) | linkinator `--skip` regex skipped every URL (0 links scanned); Playwright webServer exited early (Astro 7 preview lock); `gitleaks detect` ignores uncommitted work; prettierignore excluded files instead of formatting | 163s | retry |
| 2026-11-07 | T-000 | 2 | all (`check:full` green, run by CC) | none | ~3m | pass |
| 2026-11-07 | T-001 | 1 | build, types, lint, content-lint | linkinator 404s: nav/footer linked to /faq/, /privacy/, /insights/ which didn't exist; no `data-page` hook on Base | ~3m | retry |
| 2026-11-07 | T-001 | 2 | all (`check:full` green, run by CC) | first dispatch hung: `codex exec` waits on stdin unless given `< /dev/null` (CC fix) | 36s | pass |
