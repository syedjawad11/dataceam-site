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
3. **Check it yourself.** Run:
   ```
   npm run guide:images -- <slug>
   npm run guide:lint -- <slug>
   npm run guide:sources -- <slug>
   ```
   Then read the article once from top to bottom and open every PNG. Anything wrong goes back to the writer.
4. **Review.** Spawn `guide-reviewer` in the foreground with the slug. It can't edit. It returns PASS, or a numbered fix list.
5. **Fix.** Send the fix list to the writer (same agent if you can, else a new one with the list and the file). Rerun step 3, then review again. **At most 2 review rounds after the first draft.** If it still fails, take the failure path in `ops/guides/publish-daily.md`.
6. **Link back.** In up to 3 older live guides, find a sentence that already mentions this topic and turn the existing words into a link to `/guides/<slug>/`. Change nothing else in those files except `updatedDate`. Skip it when no sentence fits. Never link inside a heading, caption or existing link.
7. **Hand over.** `npm run guide:publish -- <slug> --dry-run` must pass. In the cloud routine, the runbook then publishes. In a local session, stop here and show Jawad the result.

## Never
- Change a guide's `title`, `topic` or file name.
- Invent a statistic, quote, study, test, customer, or anything "we" did or tried. If you can't source it, leave it out.
- Copy sentences from a source. Read, close it, explain it in your own words.
- Write more than one article in a run.
- Edit anything outside the article, its images, its infographic JSON and the link-backs.
