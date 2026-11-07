# AGENTS.md — Codex rules

You are the implementer for dataceam.com. Claude Code writes task specs and reviews your diffs.

## Stack
- Astro (static output), TypeScript strict, Tailwind CSS v4 (`@tailwindcss/vite`; design tokens in CSS `@theme`, no `tailwind.config`).
- Add no new dependency unless your task output says why. You have no network: if a dependency is needed, list the exact `npm i` command under "open questions" and Claude Code will install it.

## Defaults
- **Static by default:** no client-side JavaScript unless the spec asks for it.
- **Accessibility:** semantic HTML, alt text, form labels, visible focus states, WCAG AA colour contrast.
- **Performance:** images via Astro `<Image>`; no layout shift; no third-party scripts except Cloudflare Web Analytics.
- **Scope:** only touch the files the task names. Don't reformat unrelated files.
- **Copy:** use the text from `content/`. Never invent claims, numbers or testimonials.

## Finish every task with
- files changed
- how to verify
- open questions

## Never
- commit, push, or edit `.env*`
- add tracking scripts
- add buyer logos or names
- add LinkedIn links
- use the term "data broker"
