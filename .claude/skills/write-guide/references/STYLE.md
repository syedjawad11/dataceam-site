# How a Dataceam guide sounds

**Reader:** a bright adult with no IT background. An accountant, a nurse, a shop owner, a student. They use a chatbot now and then and want to know what is really going on. They are not stupid and not in a hurry to be impressed.

**The test for every paragraph:** could that reader explain it to a colleague over coffee after reading it once? If not, rewrite it.

## Make hard things easy without making them thin
1. Say the answer first, in plain words. Then explain why.
2. Explain a term the first time it appears, in the same sentence: "a token, which is a small chunk of text, often part of a word". After that, use the term normally and consistently.
3. One new idea per paragraph. Two to four sentences each.
4. Go from something familiar to the new thing. Use the brief's analogy, carry it through the article, and say where it stops being accurate.
5. Show, with real small examples: an actual sentence, an actual prompt, numbers the reader can add up. Show the arithmetic.
6. Don't skip the hard part. Cover what experts care about (limits, trade-offs, exceptions), in everyday words. Simple wording, full content.
7. When you give a number, say what it means in practice.

## Sentences
- Average about 15 words. Mix short and medium. Over 30 is nearly always two sentences.
- Active voice, present tense, "you". "We" only for Dataceam, and rarely. Never "I".
- Everyday verbs: use, show, make, help, pick, check, send.
- Contractions are fine (it's, don't, you'll).
- American spelling (math, color, organization).
- Start sentences with "But", "So" or "And" when a person would.

## Cut on sight (AI tells)
- **No em dashes at all.** Use a full stop, comma, colon or brackets.
- "It's not just X, it's Y" and "not only… but also". Say Y.
- Lists of three adjectives or three abstract nouns for rhythm.
- A question as a hook followed by a one-word answer ("The result? Faster.").
- Announcing: "In this guide we will", "Let's dive in", "Let's explore", "Here's the thing", "It's important to note", "It's worth noting", "Simply put", "At its core", "In essence".
- Closing summaries that repeat the article ("In conclusion", "Ultimately", "By understanding X, you can…").
- Filler openers: "In today's world", "In the ever-evolving", "As AI continues to".
- Inflated words: delve, leverage, harness, unlock, unleash, empower, elevate, seamless, robust, crucial, vital, pivotal, realm, landscape, tapestry, journey, game-changer, cutting-edge, revolutionize, transformative, myriad, plethora, foster, underscore, testament, navigate (figurative), intricate, nuanced, comprehensive, holistic.
- "Imagine you're…" or "Think of it as…" more than once per article.
- Every paragraph the same length; every section ending on a neat moral; every bullet "**Bold lead:** sentence".
- Bold used for emphasis in running text. Bold is for a term on first definition and for the "In short" label.
- Vague authority ("experts say", "studies show", "many believe"). Name the source and link it, or drop it.

The lint blocks the obvious ones (`ops/guides/banned-phrases.json`). Passing the lint isn't the goal. Sounding like a person who knows the subject and likes the reader is the goal.

## Keywords
- The primary keyword goes in the first paragraph, one H2 and the description (the title already has it). After that write normally.
- Use secondary keywords and their natural variations where they're the right words: in a question H2, a table header, an FAQ. Skip any that would sound forced. Synonyms and related terms count.
- Never repeat a phrase to hit a number.

## Honesty
- Facts about models, prices, limits and products change. Say the date or "as of <month year>", link the official page, and prefer explanations that won't go out of date.
- Separate fact from opinion. Say when something is disputed or unknown.
- Never use the words "plain English" in a guide, its title or its description (Jawad, 2026-11-25).
- Don't tell the reader AI "thinks", "knows" or "understands" without explaining what you mean.
- Company and product names only as examples or sources. No rankings of products, no endorsements, no claims of partnership.

- No Malta or Maltese places in examples (the site shows no location). Use neutral or US examples.

## Before and after
Bad: "Tokens are the fundamental building blocks that empower large language models to seamlessly process text, making them crucial to understand in today's AI landscape."
Good: "An AI model doesn't read words. It reads tokens, which are small chunks of text. 'Cat' is one token. 'Unbelievable' might be three: un, believ, able."

Bad: "Why does this matter? Because cost. Every token counts."
Good: "This matters most when you pay for AI by usage, because the bill is counted in tokens."
