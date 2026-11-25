# Redesign brief: dataceam.com becomes a learning hub (Nov 2026)

Approved direction from Jawad, 21 Nov 2026. Written for Claude Code (CC) as orchestrator; Codex implements, as usual.
Read this together with `CLAUDE.md`, `AGENTS.md` and `ops/TASKS.md`. Where this brief and the current `CLAUDE.md` content rules disagree, this brief wins; §6 lists the exact rule changes to make.

Mock-ups: claude.ai design canvas "Dataceam site redesign" (in Jawad's account, private): https://claude.ai/artifact/EM4nHGAmj6khbDj8c9G4c9
The **light** row (Home, Career track: AI Engineer, Referral disclosure) is the approved look. The dark row is rejected. Everything below is written so you can work without opening the canvas.

---

## 0. Before you start

1. **This local clone is behind GitHub.** It stops at PR #19, but `origin/main` has PR #20 (T-017 referrer-only relaunch, `/experts/`) and PR #21 (T-018 footer disclosure). Run `git checkout main && git pull` first. Re-read `CLAUDE.md`, `ops/STATUS.md` and `ops/TASKS.md` after pulling.
2. **The repo is public.** Everything in `ops/`, this file included, is visible once pushed. Never put referral terms, payouts, revenue or personal details in `ops/` notes.
3. **Workflow is unchanged:**
   - One task = one branch = one PR.
   - Codex writes code; CC writes control files and copy.
   - Every PR gets a Cloudflare preview.
   - Nothing merges or deploys without Jawad's explicit "approve".
4. Add the tasks in §9 to `ops/TASKS.md` (as T-019 to T-023) and add a short "Redesign (Nov 2026)" section to `ops/STATUS.md` that points here.

---

## 1. Decisions (locked by Jawad, 21 Nov 2026)

1. **Light theme.** It replaces the dark "plainly stated" design. Tokens are in §4.
2. **Home becomes a learning hub** for people building AI careers. The company / data-licensing pitch moves, nearly unchanged, to `/companies/`.
3. **Sections:**
   - Guides
   - Career tracks
   - Repos
   - AI jobs
   - For companies (a separate audience, an outlined button on the right of the header)
   **No news section on the website** (Jawad, 22 Nov 2026): news reels never link to the site. Never launch an empty section.
4. **Voice: "we, Dataceam" everywhere.** The name "Syed Jawad" appears only on the referral disclosure page.
   - Legal exception: the privacy policy must keep naming the data controller. Leave that as it is.
5. **The full referral disclosure moves out of the footer** into its own page, `/disclosure/`.
   - `/companies/` links to it.
   - Every block that contains a referral link also carries a one-line notice linking to it (§6). Law and platform rules expect a notice next to the link itself; a footer link alone is not enough.
   - The footer keeps a "Referral disclosure" link.
6. **Free-first wording.**
   - Lead with what's free ("Study free on Microsoft Learn").
   - Never call a paid thing free.
   - State the paid part once, plainly, on the page: for example "Free to study · exam optional (paid: $X)".
   - Never "free certification" when the exam is paid. Never "unlimited" when there are limits.
7. **Logos are credits.**
   - Logos of course providers, companies, repos and tools we recommend are allowed.
   - Use official SVGs, unaltered, never as our branding, never implying a partnership or endorsement.
   - On the light background, use the dark version of monochrome marks (GitHub, Google).
   - Buyer and AI-jobs platform names stay out of visible copy, as today: the platforms stay "Platform 1" / "Platform 2".

---

## 2. Sitemap, URLs, navigation

| URL | Page | Audience | Change |
|---|---|---|---|
| `/` | Home (learning hub) | learners | new |
| `/tracks/`, `/tracks/<role>/` | Career tracks | learners | new |
| `/repos/`, `/repos/<owner>-<repo>/` | Repo guides | learners | new |
| `/guides/`, `/guides/<slug>/`, `/guides/topic/<topic>/` | Visual guides | learners | new |
| `/jobs/` | AI jobs (today's `/experts/`) | learners | moved; `301 /experts/ → /jobs/` |
| `/companies/` | Data licensing (today's Home) | companies | moved |
| `/disclosure/` | Referral disclosure | everyone | new |
| `/insights/`, `/insights/<slug>/` | Company articles | companies | unchanged URLs; linked from `/companies/` and the footer, not the main nav |
| `/faq/`, `/privacy/` | FAQ, privacy | everyone | unchanged URLs |
| `/free/<keyword>` | Short links used in reels and DMs | social | new; `302` to the page with UTM tags (T-022) |

Redirects go in Cloudflare Pages `_redirects`, in the build output.

**Header:** wordmark `dataceam.` (blue dot), then these links:
- Guides
- Career tracks
- Repos
- AI jobs
- **For companies** (outlined button, right)

FAQ moves to the footer. The header must fit at 375 px; links wrap and nothing scrolls sideways.

**Footer** (white background):
- Wordmark and "Free AI learning, plainly explained."
- Four link columns:
  - **Learn:** Guides, Career tracks, Repos
  - **Work:** AI jobs, For companies, Insights
  - **Dataceam:** FAQ, Privacy, Referral disclosure
  - **Follow:** X, Instagram (`https://www.instagram.com/dataceam_ai/`), Facebook (`[TO FILL: Facebook Page URL]`)
- "© 2026 Dataceam".

The full disclosure text is no longer in the footer.

---

## 3. Pages (as in the light mock-ups)

Shared layout: content in a container of max 72rem, with 24 px side padding. Sections are separated by a 1 px `rule` line, about 96 px vertical padding. Cards are white with a `rule` border and 14 px radius. Grids use `repeat(auto-fill, minmax(…, 1fr))` so they collapse on phones.

### 3.1 Home `/` (`data-page="home"`)

1. **Hero** (two columns on desktop, stacked on mobile).
   - **Left column:**
     - pill badge "Free AI learning, plainly explained"
     - h1 "Learn AI for free. Build with it. Get paid for it."
     - lead: "Visual guides, free course tracks and tested GitHub repos for people building a career in AI. When you're ready, we point you to paid AI-training work."
     - buttons: **Start a career track** (primary, links to the first live track), **Browse guides**, **Repos this week** (outlined)
   - **Right column:** three stacked cards joined by a thin vertical line:
     - **Learn**: "Guides and free course tracks"
     - **Build**: "Open-source repos we've run ourselves"
     - **Earn**: "Paid AI-training work" (highlighted with a tinted background and blue border)
2. **Career tracks**
   - Eyebrow "Career tracks", h2 "Free courses, in the right order", lead "Each track lists free courses from the companies that make the tools, from first steps to advanced, with hours and a weekly plan. Where an exam exists, it's optional."
   - One card per track:
     - role
     - one line on who it's for
     - "N free courses · H hours"
     - a status chip: "Live" (green) or "Coming soon" (grey)
   - Live cards link to the track; "Coming soon" cards are not links and have no "Get notified" link until a newsletter exists.
   - Under the cards: a "Courses from" row with provider logos and names.
3. **Guides**
   - Eyebrow "Guides", h2 "One idea, one picture", lead "Short visual explainers of how AI actually works, each with a one-minute video and its sources.", and a link "All N guides".
   - Topic tiles: a simple line icon, the topic name and its guide count.
   - Then a "Latest guides" list of 5: title on the left, topic on the right.
4. **Repos:** h2 "Repos worth your time this week", lead "We pick open-source repos, run the quickstart ourselves, and write down what it needs and where it breaks."
   - Up to 3 repo cards:
     - GitHub mark and `owner / repo`
     - one-line description
     - chips: stars, licence, language
     - "GitHub figures as of <fetchedAt>"
     - "Read our setup guide"
   - Show only real repos: no placeholder cards on the live site.
5. **AI jobs strip** (card), linking to `/jobs/`:
   - eyebrow "AI jobs", h2 "Ready to get paid for AI work?"
   - text: "AI companies pay engineers, analysts and subject experts to train and test their models. We list the platforms we refer people to, with typical pay from public listings."
   - the referral notice line (§6)
   - button "See AI-training work"
6. **Newsletter:** not built yet. It waits for Jawad to choose a provider (T-023). The mock-up shows where it goes: between the AI jobs strip and the companies strip.
7. **For companies strip:** small grey label "For companies", the line "Your company's records may be worth money to an AI lab.", and an outlined button "See how data licensing works" linking to `/companies/`.
8. Footer (§2). Organization JSON-LD stays on Home, with `sameAs` for X and Instagram (and Facebook once its URL is known).

### 3.2 Career track `/tracks/<role>/` (`data-page="track"`)

1. **Breadcrumb:** Home › Career tracks › <Role>.
2. **Hero, left column:**
   - eyebrow "Career track", h1 = role
   - lead, for example "Eight free courses that take you from your first model to building AI agents, in order. **Study cost: $0.** Where an exam exists, it's optional and paid."
   - chips: "N courses", "H hours in total", "Beginner to advanced", "Last checked <date>"
   - buttons: **Download the PDF** (primary, download icon, T-022) and **Start with course 1** (outlined, links to `#course-list`)
3. **Hero, right column:** a "Your weekly plan" card:
   - "5 hours a week → W weeks" and "10 hours a week → W weeks", both computed from the course hours and rounded up
   - a stacked bar with one segment per stage (flex = stage hours), with a legend
   - note: "Based on each provider's own time estimates."
4. **Course list** (`#course-list`), grouped by stage. Each stage has a label ("Stage 1"), an h2 name and a one-line description. Each course is an `<li>` card with:
   - a number circle
   - provider logo and name
   - the course title (links to the provider)
   - one line on the skills it teaches
   - chips: cost (green "Free", or "Free to study" when an exam exists), level, "H hrs", credential (e.g. "Free certificate", "No certificate", "Exam optional: $X")
   - an outlined "Open course ↗" link (`rel="noopener"`, `target="_blank"`, visually hidden "(opens in a new tab)")
5. **Freshness note:** "We check every link and price once a month. Last checked: <date>. Something out of date? Tell us." "Tell us" is a mailto link to `hello@dataceam.com`.
6. **Next step card** (tinted, blue border), linking to `/jobs/`:
   - eyebrow "Next step", h2 "Finished the track? Get paid for AI work."
   - text: "Platforms pay engineers to write, review and test AI training data. We list the ones we refer people to."
   - the referral notice line
   - button "See AI-training work"
7. **Two columns:**
   - "Guides for this track": links to guides, each marked "1-min video"
   - "Repos for this track": repo cards
8. **JSON-LD:** BreadcrumbList, plus an ItemList of Course items (name, provider, url, isAccessibleForFree).

`/tracks/` index: h1 "Career tracks", an intro, and the same track cards as Home.

### 3.3 Repo guide `/repos/<owner>-<repo>/` (`data-page="repo"`)

- **Header:** breadcrumb, h1 `owner / repo`, the GitHub description, chips (stars, forks, licence, language, last push), "GitHub figures as of <fetchedAt>", and a "View on GitHub ↗" link.
- **Our sections, in order:**
  1. What it does
  2. Who it's for
  3. **Quickstart**: the exact commands in a code block, plus "Tested by us on <date> (<environment>)"
  4. What it needs: API keys, paid plans, GPU, OS
  5. Where it broke for us
  6. Alternatives: 2–3 repos, each with why you'd pick it
- **Then:** related tracks and guides.

`/repos/` index: h1 "Repos", an intro, and repo cards, newest first.

### 3.4 Guides `/guides/<slug>/` (`data-page="guide"`)

- **Top of the page:** breadcrumb, h1 (the question, e.g. "What is prompt injection?"), description, the key diagram image, then the one-minute video (`<video controls preload="none" poster=…>`, with captions as a text track when available).
- **Body:** short readable text, about 200–400 words, adapted from the video script.
- **Then:** "Sources" (title, link, date checked), related guides and tracks.

`/guides/`: topic tiles with counts, then all guides. `/guides/topic/<topic>/`: the guides in that topic.

### 3.5 AI jobs `/jobs/` (`data-page="jobs"`)

Today's `/experts/` page, moved, with these changes:
- Badge "Independent referrer" at the top.
- Copy switched to "we".
- The disclosure line from §6.
- A visible link to `/disclosure/`.

Everything else stays as it is: work areas with dated typical pay, the consent box that unlocks the links, "Platform 1" / "Platform 2" (links in `src/config/site.ts` → `expertPlatforms`), no job list, no résumé or candidate data.

**Referral links live only on `/jobs/`, behind the consent box** (Jawad, 21 Nov 2026).
- The consent text stays as it is today: "I understand these are referral links: if I'm hired through one, Dataceam may earn a referral bonus from the platform, at no cost to me." with "Tick the box to open the links. Nothing is recorded when you tick it."
- Home, track pages, guides and `/free/` short links send people to `/jobs/`, never straight to a platform.
- If a platform link is ever needed on another page, gate it with the same text in a native `<dialog>`:
  - a checkbox, plus a "Continue to Platform N" button that stays disabled until the box is ticked
  - Escape and a close button both close it, and focus returns to the opener
  - nothing is stored
  - without JavaScript, the opener is a plain link to `/jobs/`

### 3.6 For companies `/companies/` (`data-page="companies"`)

Today's Home content, moved, with these changes:
- Badge "Independent referrer" at the top.
- Copy switched to "we".
- The "Who runs Dataceam" section (which names Syed Jawad) is replaced by a short "How we're paid" paragraph (§6) with a link to `/disclosure/`.
- A "Guides for companies" row linking the three `/insights/` articles.

Keep the published-tiers framing and the "not a promise" wording exactly as the content rules require.

### 3.7 Referral disclosure `/disclosure/` (`data-page="disclosure"`)

A prose page with a max width of 70ch, using this copy (CC puts it in `content/disclosure.md`; Jawad approves the wording in the PR):

> **Referral disclosure**
> Our guides, career tracks and repo guides are free, and nobody pays us to include anything in them. Two parts of the site use referral links: AI jobs and For companies. This page explains how those referrals work.
>
> **Who makes the referrals.** Referrals are made by Syed Jawad, working independently. He is not employed by, affiliated with, or acting for any buyer or platform he refers to.
>
> **AI jobs.** If you join a platform through one of our links and get hired, the platform may pay a referral bonus. You pay nothing. Platforms make every hiring and pay decision. We don't see or handle your application. Pay figures come from public listings and are not a promise of what you'll earn.
>
> **For companies: data licensing.** If a company that Syed Jawad introduces signs with a buyer, the buyer may pay him a referral fee. The company pays nothing for the introduction. Buyers decide who is eligible and what they pay. Published figures are indicative, not a promise. Before signing, take independent legal and data-protection advice.
>
> **Where you'll see this.** Every page and post with a referral link carries a short notice that links here: the AI jobs page, the For companies page, and any social post marked as a referral.
>
> Questions about a referral? Email hello@dataceam.com. Last updated <date>.

Move the Person JSON-LD (Syed Jawad) from Home to this page.

### 3.8 FAQ and Insights

- **FAQ:** switch to "we" and use the new disclosure line (§6). Questions stay as they are.
- **Insights articles:** first-person company articles. Switching them to "we" is a later, low-priority task. They keep their URLs.

---

## 4. Light theme tokens

Replace the `@theme` colours in `src/styles/global.css`. Rename the tokens to semantic names, because `paper` meaning "text colour" would be confusing in a light theme.

| Token | Hex | Use |
|---|---|---|
| `--color-page` | `#f6f8fc` | page background |
| `--color-surface` | `#ffffff` | cards, header, footer, inputs |
| `--color-surface-tint` | `#eef3ff` | highlighted card (Earn, Next step) |
| `--color-rule` | `#d9e0ec` | borders, section lines, chips |
| `--color-rule-strong` | `#c5cfdf` | input borders, dashed placeholders |
| `--color-ink` | `#0b1222` | headings, `strong`, wordmark, chip text |
| `--color-body` | `#44506a` | body text |
| `--color-muted` | `#5f6b85` | meta, hints, captions |
| `--color-signal` | `#2563eb` | links, primary buttons, eyebrows, icons, focus ring |
| `--color-signal-strong` | `#1d4ed8` | link and button hover |
| `--color-on-signal` | `#ffffff` | text on primary buttons |
| `--color-free-bg` / `--color-free-text` | `#dcfce7` / `#166534` | "Free" and "Live" chips |
| `--color-soon-bg` / `--color-soon-text` | `#eef1f6` / `#44506a` | "Coming soon" chip |
| stage bar | `#93c5fd`, `#2563eb`, `#1e3a8a` | track plan segments (stages 1/2/3) |

- **Contrast (WCAG AA), checked:**
  - `#44506a` on `#f6f8fc` ≈ 7.9:1
  - `#5f6b85` on white ≈ 5.4:1
  - `#2563eb` on `#f6f8fc` ≈ 4.9:1
  - white on `#2563eb` ≈ 5.2:1
  - `#166534` on `#dcfce7` ≈ 6.4:1
  - Do not lighten the text colours.
- **Other settings:**
  - `color-scheme: light`
  - remove the dark radial glow on `body`
  - focus ring 3 px `--color-signal`, offset 3 px
- **Type is unchanged:** Bricolage Grotesque Variable for headings (h1 about 4rem, h2 about 2.4rem, weight 650–700, letter-spacing −0.02 to −0.035em); system UI stack for body text at the current 106.25% base.
- **Buttons:**
  - primary: `--color-signal` background, white text, 10 px radius, min height 49 px
  - outlined: white background, 1.5 px `--color-rule` border, ink text
  - all touch targets ≥ 44 px
- **Chips:** pill shape, 1 px `--color-rule` border, 13–14 px text.
- **OG images** (`scripts/build-og.mjs`): switch to the light palette (white card, ink title, blue accent bar).

---

## 5. Content model (`src/content.config.ts`)

Add three collections next to `insights`. Codex writes the schemas; CC writes the entries (see §6, rule 10).

**`tracks`** (`src/content/tracks/<role>.md`):
- `role`, `slug`, `summary`, `who` (one line), `status` (`live` | `soon`), `updated`, `shortlink?`, `pdf?`
- `stages: [{ key, name, desc }]`
- `courses`: an ordered array of:
  - `stage`, `provider`, `logo` (key into `src/assets/logos/`), `title`, `url`
  - `level` (`Beginner` | `Intermediate` | `Advanced`), `hours` (number, from the provider's page)
  - `credential` (string), `cost: { study: 'free', exam?: { price: string, required: false } }`
  - `skills` (one line), `sourceUrl`, `checkedAt` (date)
- Computed in code, never typed in: total hours, course count, weeks at 5 and 10 h/week.

**`repos`** (`src/content/repos/<owner>-<repo>.md`):
- `owner`, `name`, `url`, `description` (GitHub's), `category`, `tracks: string[]`, `shortlink?`
- `stats: { stars, forks, license, language, pushedAt, fetchedAt }` (written by the refresh script, never by hand)
- `quickstart: { commands: string, testedOn: date, environment: string }`
- `needs: string[]`, `gotchas: string[]`, `alternatives: [{ name, url, why }]`
- Body: our "what it does / who it's for" text.

**`guides`** (`src/content/guides/<slug>.md`):
- `title`, `description`, `topic` (enum: `llm-basics` | `retrieval-rag` | `agents` | `prompting-safety` | `hardware`; extend as needed)
- `image` (Astro `image()`), `imageAlt`, `video: { src, poster }`
- `sources: [{ title, url, checked }]`, `pubDate`, `updatedDate?`, `tracks: string[]`, `shortlink?`
- Body: 200–400 words.

**Logos:** official SVGs in `src/assets/logos/` (`google`, `microsoft`, `huggingface`, `kaggle`, `github`, `deeplearningai`, …). DeepLearning.AI may need a text-only label if no official mark is available.

---

## 6. Copy and compliance rules (update `CLAUDE.md` "Content rules" in T-021)

**Proposed wording changes.** Jawad approves these in the T-021 PR.

- **Rules that change:**
  - "run openly by a named person … badge on Home and /experts/ … full disclosure in the footer of every page": replace with decisions 4 and 5 in §1.
  - Home no longer carries the company disclosure; `/companies/` does.
- **Required disclosure lines** (exact; content-lint enforces them; "Dataceam is a referrer only." stays required on companies, jobs and FAQ):
  - `/companies/`: "Dataceam is a referrer only. If a company we introduce signs with a buyer, the buyer may pay us a referral fee. You pay nothing for the introduction."
  - `/jobs/`: "Dataceam is a referrer only. If you're hired through one of these links, the platform may pay us a referral bonus. You pay nothing."
  - FAQ: "If a deal or a hire happens, the buyer or platform may pay us a referral fee. It costs you nothing."
  - Short notice next to every referral link block (Home AI jobs strip, track "Next step" card, anywhere else): "Referral links: we may earn a fee if you join through them." followed by a link "Referral disclosure" to `/disclosure/`.
- **Rules that stay** (most are already enforced by `scripts/content-lint.mjs`):
  1. No buyer or platform names in visible copy (micro1, Mercor, DataFactor, Lodex); URLs are masked.
  2. No "vetted", "guarantee(d)" (except "not a guarantee"), "data broker", "partner/agent/representative of/for/to …", "official partner", or urgency wording.
  3. No LinkedIn anywhere. That includes course links and guide topics (e.g. no "LinkedIn automation" guide on the site).
  4. No location in visible copy (privacy policy excepted).
  5. Never collect résumés or candidate data.
- **New rules:**
  6. Free-first wording (§1.6). A course marked free must link to the provider page that shows it is free.
  7. Every fact on tracks, repos and guides has a source and a check date. No track goes live with `[h]`/`[price]` placeholders: research them, or drop the course.
  8. Logos are credits (§1.7).
  9. Course providers, companies and tools may be named. The name rule above only covers buyers and AI-jobs platforms.
  10. **CC may write entries in `src/content/{tracks,repos,guides}/`**: data and copy only, never code. (Extends the carve-out in `CLAUDE.md` rule 2; Jawad to confirm when approving T-020.)
- **content-lint changes (T-021, Codex):**
  - The required-disclosure map becomes `companies`, `jobs`, `faq` (not `home`/`experts`).
  - Pages with `data-page` in `home`, `track`, `companies` or `jobs` must contain `href="/disclosure/"`.
  - Add self-tests for both.
  - Keep every existing forbidden-word rule.

---

## 7. Data freshness (scripts CC runs; Codex has no network)

- `npm run repos:refresh`: `scripts/refresh-repos.mjs` reads each repo entry, calls the GitHub API (`gh api repos/<owner>/<name>` or fetch with `GITHUB_TOKEN`), and rewrites `stats` and `fetchedAt`. CC runs it before each repo PR and weekly. Builds never call the network.
- `npm run links:external`: checks every `url` / `sourceUrl` in tracks, repos and guides, and reports anything that isn't a 2xx. CC runs it monthly, fixes or drops dead courses, and bumps `checkedAt` / `updated`.
- `npm run pdfs`: `scripts/build-track-pdfs.mjs` uses Playwright to print each live `/tracks/<role>/` (print stylesheet: no header or footer navigation, links shown as text) to `public/downloads/<role>.pdf`. CC runs it after track changes and commits the PDFs.

---

## 8. Where the content comes from

The social workspace sits next to this repo: `../social-media-posting/`.

- **Guides:** the 14 explainer videos already published. Topic mapping (guide counts on Home: LLM basics 8, Retrieval and RAG 2, Agents 1, Prompting and safety 2, Hardware 1):
  - **LLM basics (8):** what-is-an-llm, tokens, context-window, different-answers, parameters, training, bad-at-maths, reasoning-models
  - **Retrieval and RAG (2):** embeddings, rag
  - **Agents (1):** ai-agents
  - **Prompting and safety (2):** fine-tuning-vs-prompting, prompt-injection
  - **Hardware (1):** gpu
- **Per guide, the material is in:**
  - **Script:** `../social-media-posting/video-studio/explainer/lines/<id>.json`. Use the `cap` text, not `say`.
  - **Post text and `# Sources`:** `../social-media-posting/content/scheduled/<id>.md`
  - **Diagram/poster:** `../social-media-posting/video-studio/out/<id>-poster.png`. Copy it into `src/assets/guides/<slug>/`.
  - **Video:** the hosted MP4 URL that the social workspace recorded when it uploaded the video (see the draft's `# Video` section, or the hosting log in that workspace).
- **First track:** AI Engineer, 8 courses in 3 stages.
  - **Foundations:**
    1. Kaggle Learn, Intro to Machine Learning
    2. Google, Machine Learning Crash Course
  - **Working with LLMs:**
    3. DeepLearning.AI, ChatGPT Prompt Engineering for Developers
    4. Hugging Face, LLM Course
    5. Microsoft (GitHub), Generative AI for Beginners
  - **Agents:**
    6. Hugging Face, AI Agents Course
    7. Microsoft (GitHub), AI Agents for Beginners
    8. a Microsoft Learn learning path (free to study, exam optional)
  - Verify each item against the provider's page before launch:
    - it is still free and still available
    - hours
    - certificate status
    - for item 8: the exact path name, the related exam and its current price
  - Replace or drop anything that can't be verified.
- **First repo:** `microsoft/ai-agents-for-beginners`: "18 Lessons to Get Started Building AI Agents", MIT, Jupyter Notebook, 80,682 stars on 21 Nov 2026. Refresh the stats with the script before merging. Write the quickstart only after actually running it.

---

## 9. Tasks (add to `ops/TASKS.md`)

### T-019: Light theme
**Goal:** switch the whole current site to the §4 palette. No structural or copy changes.
**Files:**
- `src/styles/global.css` (tokens renamed and recoloured; component styles updated)
- any component with hard-coded colours
- `scripts/build-og.mjs` (light OG cards; run `npm run og`)

**Acceptance:**
- [ ] no dark backgrounds remain
- [ ] all text pairs meet AA
- [ ] focus states visible
- [ ] Insights SVG infographics still readable
- [ ] `npm run check` passes; CC runs `check:full`
- [ ] CC sends Jawad screenshots at 375 px and 1280 px of Home, `/experts/` and an Insights article

### T-020: Content collections and templates (tracks, repos, guides)
**Goal:** the three collections from §5, with their index and detail pages, live but not yet in the header navigation.
**Files:**
- `src/content.config.ts`
- `src/pages/{tracks,repos,guides}/…`
- components: `TrackCard`, `CourseItem`, `WeeklyPlan`, `RepoCard`, `GuideCard`, `TopicTile`, `ProviderLogo`
- `src/assets/logos/`

**Content (CC writes):**
- `tracks/ai-engineer.md`, fully verified (§8)
- `repos/microsoft-ai-agents-for-beginners.md`, with quickstart tested by CC
- `guides/*.md` for all 14 explainers

**Acceptance:**
- [ ] pages match §3.2–3.4
- [ ] totals and weekly plan computed, not typed
- [ ] exactly one h1 per page; unique title and description
- [ ] JSON-LD valid
- [ ] `<video>` uses `preload="none"`
- [ ] no horizontal scroll at 375 px
- [ ] `check` passes; CC runs `check:full`

### T-021: Information architecture switch
**Goal:** flip the site to the new structure in one PR.
**Files:**
- new `src/pages/index.astro` (§3.1)
- `src/pages/companies.astro` (moved Home, §3.6); `content/home.md` → `content/companies.md`
- `src/pages/jobs.astro` (moved `/experts/`, §3.5), plus a `301` from `/experts/`
- `src/pages/disclosure.astro` and `content/disclosure.md` (§3.7)
- Header and Footer (§2); Person JSON-LD moved to the disclosure page
- FAQ copy (§6); `scripts/content-lint.mjs` (§6)

**CC also does (control files):**
- updates `CLAUDE.md` content rules per §6
- updates `ops/STATUS.md`

**Acceptance:**
- [ ] every old URL still resolves (`/experts/` redirects)
- [ ] the full disclosure is gone from the footer and lives on `/disclosure/`
- [ ] referral notice lines are present wherever referral links appear
- [ ] "Syed Jawad" appears only on `/disclosure/` and `/privacy/`
- [ ] content-lint self-tests updated and green
- [ ] `check:full` green
- [ ] Jawad approves the copy changes in the preview before merge

### T-022: Short links, PDFs, freshness scripts
**Goal:** the tooling from §7, plus `/free/<keyword>` short links.
- A build step generates `dist/_redirects` from content frontmatter `shortlink` values (`/free/<keyword>  /<page>?utm_source=social&utm_medium=shortlink&utm_campaign=<keyword>  302`), merged with the static redirects.
- Plus `scripts/refresh-repos.mjs`, `links:external` and `pdfs` (§7).
- **Acceptance:** each script has a dry-run flag and a clear report; `check` passes.

### T-023: Later (blocked on Jawad)
- Newsletter sign-up: provider choice; privacy policy update.
- Cloudflare Web Analytics token (`PUBLIC_CF_BEACON_TOKEN`), needed to measure the short links.
- Facebook Page URL for the footer and `sameAs`.
- Insights articles to "we".

---

## 10. Open questions for Jawad (ask, don't assume)

1. Copy approval for the new disclosure lines (§6) and the `/disclosure/` text (§3.7).
2. Facebook Page URL.
3. Newsletter: yes or no, and which provider.
4. OK to extend the CC carve-out to `src/content/{tracks,repos,guides}/` (§6, rule 10)?
