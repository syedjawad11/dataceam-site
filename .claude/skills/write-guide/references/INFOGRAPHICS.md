# Infographics

Each guide has one cover and 2–4 infographics (3 is normal), all in the one theme the brief names. Write `ops/guides/infographics/<slug>.json`, then `npm run guide:images -- <slug>`. The script draws everything (fonts, spacing, icons, wrapping, social image). Never hand-draw or download images.

**Themes** (same layouts in each): `daylight` (white cards, blue), `blueprint` (navy, light-blue lines), `paper` (warm paper, amber and blue).

**Layouts**
| Layout | Use it for |
|---|---|
| `cover` | The title card. Required once. Short title (the question), one-line subtitle, 2–3 icons |
| `steps` | A process in order (3–6) |
| `compare` | Two things side by side, with a verdict |
| `cycle` | A loop that repeats (3–5) |
| `layers` | Things stacked on or inside each other (3–6) |
| `bars` | Real numbers compared (2–6). Values must come from the text and have a source |
| `cards` | Types, uses, tips, mistakes (3–6) |
| `analogy` | Everyday thing ↔ AI thing, matched pair by pair (3–5) |

See the spec fields in `ops/TASKS.md` (T-026 item 1) and the limits the script prints. Run `npm run guide:images -- --help` for icons and an example.

## Rules
- Use at least two different layouts per article, and pick the layout that fits the idea. Don't repeat the same picture in two forms.
- Each picture must teach one thing on its own, without the article. Title = the point it makes ("Each word is picked one at a time"), not a label ("Process").
- Few words. Labels 1–4 words, text under about 14 words. If it's crowded, cut words, don't add images.
- Same facts and terms as the article. Numbers in the picture appear in the text.
- No logos, no brand names as headings, no people, no em dashes.
- **Alt text** (40–250 characters): what it shows and its point, including the key labels. **Caption**: one sentence that adds something, not a copy of the title.
- After rendering, **open every PNG with Read** and look: spelling, cut text, balance, does it make sense at phone size. Fix the JSON and render again.
