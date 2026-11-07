---
description: Run all gates, push the task branch, open/update the PR, post the preview URL, and (on approval) merge to production.
---

Ship the current task branch. Follow these steps exactly and stop on any failure.

1. Confirm the current branch matches `task/*`. If it's `main`, stop and tell Jawad.
2. Run `npm run check:full`. If anything fails, stop, report the failing gate and output, and send the fix to Codex (do not fix it yourself).
3. Commit outstanding changes with a conventional commit message (`feat:`, `fix:`, `chore:` …), then `git push -u origin <branch>`.
4. Open or update the PR: `gh pr create --fill` (or `gh pr view` if one already exists).
5. Wait for the Cloudflare Pages preview deploy (`gh pr checks --watch`, or `npx wrangler pages deployment list --project-name dataceam`), then post the preview URL with a 2–3 line summary.
   - Direct-upload fallback: `npx wrangler pages deploy dist --project-name dataceam --branch <branch>`.
6. Ask Jawad: **"Approve for production?"** and wait.
7. Only on an explicit "approve":
   - `gh pr merge --squash --delete-branch`
   - Confirm the production deploy succeeded.
   - Smoke-test: `curl -sI` each key page on https://dataceam.com (expect 200), `https://www.dataceam.com` (expect 301 to apex), and a nonexistent path (expect 404).
   - Report the result in one short message and log the task as done in `ops/TASKS.md`.
