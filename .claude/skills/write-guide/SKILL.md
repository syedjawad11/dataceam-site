---
name: write-guide
description: Write, illustrate, review and prepare one Dataceam guide article (src/content/guides/<slug>.md) from its brief in ops/guides/queue.json. Use for "/write-guide", "write the next guide", a guide slug from the queue, or when ops/guides/publish-daily.md tells you to. Covers research, drafting, infographics, SEO/GEO, internal links and review. Publishing itself goes only through `npm run guide:publish`.
---

# /write-guide [slug]

Produce **one** finished guide: 1,200–3,000 words that a person with no IT background can follow, with sources they can open and pictures that help.

Read these before you start. They are binding:
- `references/STYLE.md`: how it must sound
- `references/TEMPLATE.md`: what it must contain, in what order
- `references/INFOGRAPHICS.md`: the picture formats
- The "Content rules (hard)" in the repo's `CLAUDE.md`

## Steps

1. **Pick.** `npm run guide:next` prints the brief (slug, title, keywords, angle, sources, image ideas) and the live guides you can link to. `QUEUE_EMPTY` means stop. With a slug given, use that brief.
2. **Write.** Spawn `guide-writer` in the foreground with the full brief and the live-guide list. It researches, writes `src/content/guides/<slug>.md` (status live, pubDate today in Europe/Malta) and `ops/guides/infographics/<slug>.json`, and renders the images.
   **Parked draft:** if `ops/guides/drafts/<slug>/article.md` exists, don't write a new article. Copy it to `src/content/guides/<slug>.md` and `infographics.json` to `ops/guides/infographics/<slug>.json`. Give the writer the brief and `review.md`, and tell it to fix that draft: every point in the review, pubDate today, every price and date rechecked, nothing rewritten that the review didn't question. `review.md` can be wrong; the writer checks a disputed fact at its source.
3. **Check it yourself.** Run:
   ```
   npm run guide:images -- <slug>
   npm run guide:lint -- <slug>
   npm run guide:sources -- <slug>
   ```
   Then read the article once from top to bottom and open every PNG. Anything wrong goes back to the writer.
4. **Review, once.** Spawn `guide-reviewer` in the foreground with the slug and the brief. It can't edit. It returns BLOCKER and FIX points, each with its replacement text.
5. **Fix, then publish.** The rule: fix the sentence or cut it, then publish. An article is never dropped over wording.
   - Send **every** point to the writer (same agent if you can, else a new one with the list and the file). Rerun step 3 and check point by point, in the file, that each one was applied. Anything missed, change it yourself with the reviewer's replacement text.
   - No BLOCKER: go to step 6. Don't review again.
   - One or more BLOCKERs: ask the reviewer (same agent if you can, else a new one) for a **second look**. Give it the BLOCKER list and `git diff` of the fixes. It checks those and nothing else.
   - A BLOCKER still NOT RESOLVED: use its replacement text, or cut the sentence, its table row, FAQ item or picture. If the cut leaves a gap, close it with a sentence your sources support. Rerun step 3, then go to step 6. There is no third look.
   - Reviewer and writer disagree about a fact: open the source yourself. If it's clear, keep what the source says. If not, cut the claim.
   - Park only for the reasons in the failure path of `ops/guides/publish-daily.md`.
6. **Link back.** In up to 3 older live guides, find a sentence that already mentions this topic and turn the existing words into a link to `/guides/<slug>/`. Change nothing else in those files except `updatedDate`. Skip it when no sentence fits. Never link inside a heading, caption or existing link.
7. **Hand over.** `npm run guide:publish -- <slug> --dry-run` must pass. In the cloud routine, the runbook then publishes. In a local session, stop here and show Jawad the result, unless Jawad has already said to publish this guide.

## Never
- Change a guide's `title`, `topic` or file name.
- Invent a statistic, quote, study, test, customer, or anything "we" did or tried. If you can't source it, leave it out.
- Copy sentences from a source. Read, close it, explain it in your own words.
- Write more than one article in a run.
- Edit anything outside the article, its images, its infographic JSON and the link-backs.
