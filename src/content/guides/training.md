---
title: 'How Is an AI Model Trained? The Process Step by Step'
seoTitle: 'How Is an AI Model Trained? Step by Step'
description: 'How is an AI model trained? Follow the steps from raw text to chat assistant: pre-training, human feedback and testing, in plain language.'
topic: llm-basics
status: live
image: ../../assets/guides/training/cover.png
imageAlt: 'Cover card titled How is an AI model trained, with a subtitle about practice, feedback and testing from raw text to a chat assistant, and three small icons'
ogImage: /og/guides/training.png
theme: blueprint
primaryKeyword: 'how is an ai model trained'
keywords:
  - 'how is an ai model trained'
  - 'how ai model training works'
  - 'how are ai language models trained'
  - 'ai model training explained'
  - 'how does ai learn'
  - 'pre-training vs fine-tuning'
  - 'how long does it take to train an ai model'
takeaways:
  - 'An AI model is trained in stages. Pre-training teaches it language by guessing the next token in huge amounts of text, human feedback then teaches it to follow instructions, and testing comes before release.'
  - 'One training step is guess, compare, nudge. The model guesses the next token, is checked against the real one, and has its parameters shifted slightly. Pre-training runs this loop over trillions of tokens.'
  - 'Meta says it trained Llama 3 on about 15 trillion tokens, using up to 16,000 H100 graphics chips. Training a large model takes weeks of computing, on thousands of chips at once.'
  - 'A finished model is frozen. It does not learn from your chat, and it only knows text up to its data cutoff. An app may still save your chats to help train a future version.'
  - 'Overfitting means memorizing training examples instead of learning patterns. Teams check for it with examples the model never saw during training.'
faq:
  - q: 'How is an AI model trained?'
    a: 'In stages. First, pre-training: the model guesses the next token in huge amounts of text and has its numbers nudged after each miss. Then tuning: people write good answers and rank outputs so the model follows instructions. Last, teams test it and run safety checks before release.'
  - q: 'How long does it take to train an AI model?'
    a: 'It depends on size. Meta reports 1.3 million GPU hours for Llama 3 8B. If spread over 16,000 chips, that would be about 3.4 days; on 1,000 chips, about 54 days. Meta doesn''t say how many it used. Large models run for weeks on thousands of chips, and teams often spend extra time on tuning and testing.'
  - q: 'Does ChatGPT learn from my conversations?'
    a: 'Not while you chat. The model is frozen, so your messages do not change it. But many apps save chats and may use them to train a future version. OpenAI says it may do so for consumer ChatGPT unless you switch it off in settings. Check the settings of any app you use.'
  - q: 'What data is used to train AI models?'
    a: 'Mostly large collections of text, code and other material gathered from the public web and other sources. Meta describes the Llama 3 data as public sources, with filtering to remove duplicates and some sensitive content. Many companies do not publish full details of their training data.'
  - q: 'What is the difference between pre-training and fine-tuning?'
    a: 'Pre-training comes first. It uses a vast text collection to teach general language skills. Fine-tuning then trains the model further on a smaller, chosen set of examples, such as human-written answers, to shape how it behaves. It is usually much cheaper than pre-training because it uses far less data.'
  - q: 'Why does an AI model have a knowledge cutoff?'
    a: 'Training uses a fixed collection of text gathered up to a certain date. Anything written after that date is not in the collection, so the model has not seen it. Meta lists March 2023 as the cutoff for Llama 3 8B, even though the model was released in April 2024.'
sources:
  - title: 'Meta (2024): The Llama 3 Herd of Models'
    url: 'https://arxiv.org/abs/2407.21783'
    checked: 2026-11-26
  - title: 'Ouyang et al. (2022): Training language models to follow instructions with human feedback'
    url: 'https://arxiv.org/abs/2203.02155'
    checked: 2026-11-26
  - title: 'Bai et al. (2022): Training a Helpful and Harmless Assistant with Reinforcement Learning from Human Feedback'
    url: 'https://arxiv.org/abs/2204.05862'
    checked: 2026-11-26
  - title: 'Meta: Llama 2 7B model card (Hugging Face)'
    url: 'https://huggingface.co/meta-llama/Llama-2-7b'
    checked: 2026-11-26
  - title: 'Meta: Llama 3 8B model card (Hugging Face)'
    url: 'https://huggingface.co/meta-llama/Meta-Llama-3-8B'
    checked: 2026-11-26
  - title: 'Google for Developers: Machine Learning Crash Course, Overfitting'
    url: 'https://developers.google.com/machine-learning/crash-course/overfitting/overfitting'
    checked: 2026-11-26
  - title: 'IBM: What Is Model Training?'
    url: 'https://www.ibm.com/think/topics/model-training'
    checked: 2026-11-26
  - title: 'OpenAI Help Center: How your data is used to improve model performance'
    url: 'https://help.openai.com/en/articles/5722486-how-your-data-is-used-to-improve-model-performance'
    checked: 2026-11-26
  - title: 'U.S. Copyright Office: Copyright and Artificial Intelligence'
    url: 'https://www.copyright.gov/ai/'
    checked: 2026-11-26
pubDate: 2026-11-26
updatedDate: 2026-11-28
tracks:
  - ai-engineer
---

An AI model is trained in stages. First it practices on a huge pile of text by guessing the next small chunk, called a token, and gets its internal numbers nudged each time it misses. Then people show it good answers and rank its drafts so it learns to follow instructions. Last, teams test it and run safety checks before release.

You may have wondered how a chatbot "learned" anything, or whether it is still learning from your questions. The answers change how you treat its dates, its mistakes and the things you type into it. The short version of that last point: a released model is frozen, but the app around it may still keep your chats.

## How is an AI model trained, stage by stage?

Training happens in three stages: pre-training, tuning for chat, and testing. The models behind chatbots are large language models (LLMs), covered in [our overview of LLMs](/guides/what-is-an-llm/). This guide covers how one gets good at its job.

![Three steps in a row: pre-training on text, tuning for chat with human examples, and testing before release.](../../assets/guides/training/three-stages.png)

*The order matters: language first, good manners second, checks last.*

Here is a picture to hold on to. A trainee bookkeeper starts by working through millions of old ledgers. For each one they guess the next entry, then see the real one and adjust. Later a senior bookkeeper shows them what good work looks like and ranks their drafts from best to worst. Before the trainee touches a real client, someone reviews their work. That is the whole process in miniature.

![Four pairs matching a trainee bookkeeper with a language model: practicing on old ledgers, guessing and checking, review by a senior, and a final check.](../../assets/guides/training/bookkeeper-and-model.png)

*The comparison breaks in one place. A trainee keeps learning on the job. A released model does not.*

> **In short:** Training has three stages. The model learns language from text, then learns to follow instructions from people, then gets tested.

## Where does the training data come from?

Most training text comes from large collections of public material, such as web pages, books and code. Meta says it trained Llama 3 on about 15 trillion tokens, a collection of publicly available online text, which it filtered and cleaned (see [the Llama 3 paper](https://arxiv.org/abs/2407.21783) and the [Llama 3 8B card](https://huggingface.co/meta-llama/Meta-Llama-3-8B)). The filtering included removing duplicate pages and websites known to hold large amounts of personal information.

How big is 15 trillion? A token is about 0.75 of an English word, which is a rule of thumb covered in [our guide to tokens](/guides/tokens/). So 15 trillion × 0.75 is roughly 11 trillion words. If a novel has about 80,000 words, that is around 140 million novels' worth of text. This is only a rough comparison, because the real mix includes code, math and several languages.

Where training data comes from is also a live argument, and it is not settled. Authors, publishers and artists have questioned whether using their work to train models is allowed. The U.S. Copyright Office published a [report on generative AI training](https://www.copyright.gov/ai/) in May 2025, in a pre-publication version, and says a final version will follow. Courts and lawmakers in different countries are still working through the question. Many companies also don't publish a full list of what they used, so outsiders often can't check.

## What happens in one training step?

One training step has four parts: show the model some text, let it guess the next token, compare the guess with the real token, and nudge its parameters. Parameters are the numbers inside the model that training adjusts, explained in [our guide to parameters](/guides/parameters/). Everything the model learns comes from this loop, run over trillions of tokens.

![A loop of four boxes: show text, guess, compare, nudge, with the note that it runs over trillions of tokens.](../../assets/guides/training/training-step.png)

*The loop has no teacher in it during pre-training. The text itself supplies the right answer.*

Here is one step with made-up numbers. The score the model gives each possible token is a probability, and the real text is "The cat sat on the mat".

1. Show the model "The cat sat on the" and hide the next word.
2. The model guesses. It gives "sofa" 40%, "floor" 25%, "mat" 10%, and spreads the rest across other tokens.
3. Compare with the real next word, "mat". The model gave it only 10%. IBM's explainer calls the measure of this error [a loss function](https://www.ibm.com/think/topics/model-training), and training tries to make it smaller. A common way to score this penalty is a formula that gives a big penalty when the right token got a low score and almost none when it got a high one: -ln(0.10) = 2.30.
4. Nudge every parameter a tiny amount in the direction that makes "mat" more likely. Next time the model gives "mat" 12%, and the penalty drops to -ln(0.12) = 2.12.

One nudge barely matters. But the same text and many other texts come around again and again, so the nudges add up. IBM notes that many neural network models adjust their parameters with a family of methods called gradient descent, which means taking small steps downhill on the error.

A real run doesn't work on one sentence at a time. It makes guesses on millions of tokens at once, then gives the parameters one combined nudge. Meta's Llama 3 paper describes about 1.2 million of these steps for its largest model. That batch work is why it needs so many chips (more on that below).

> **In short:** Show text, guess, compare with the truth, nudge the numbers. Pre-training is that loop run on a vast amount of text.

### What is overfitting?

Overfitting is when a model matches its training examples so closely that it does poorly on new ones. Google's machine learning course puts it as creating a model that [memorizes the training set](https://developers.google.com/machine-learning/crash-course/overfitting/overfitting) instead of learning patterns that carry over.

Think of a student who memorizes last year's exam answers. They score perfectly on that exam and fail a new one. A model that generalizes, in Google's wording, makes good predictions on new data.

The check is simple. Teams hold back some examples and never train on them. If the error on the training examples keeps falling while the error on the held-back ones stops falling or rises, the model is memorizing. Google describes this as the two loss curves diverging. IBM describes the same check as testing on examples the model has not seen.

## How do humans help train chatbots?

After pre-training, a model can continue text but doesn't reliably answer questions. People then teach it to follow instructions in two main ways: they write good example answers, and they rank the model's own answers from better to worse.

OpenAI's InstructGPT paper describes the method. Labelers wrote demonstrations of the behavior they wanted, and the team used them to fine-tune GPT-3 in the first step. Fine-tuning means training an already trained model a bit further on a smaller, chosen set of examples.

Labelers then ranked several model outputs. A second model learned to predict which answers people prefer, and a method called reinforcement learning from human feedback (RLHF), which rewards the model for answers the second model scores highly, used it to tune the first model further. [The paper](https://arxiv.org/abs/2203.02155) reports that people preferred outputs from the 1.3 billion parameter InstructGPT to those of the 175 billion parameter GPT-3, which is more than 100 times larger.

The authors also say the models still make simple mistakes. Anthropic's team describes a similar approach for a helpful and harmless assistant in [its RLHF paper](https://arxiv.org/abs/2204.05862), with fresh human feedback fed back in about weekly. Meta's [Llama 2 card](https://huggingface.co/meta-llama/Llama-2-7b) says its tuning used over one million new human-annotated examples, and the Llama 3 paper describes six rounds that each combined supervised fine-tuning with a method called Direct Preference Optimization, which learns from ranked pairs directly.

Teams test the result before release. For Llama 3, Meta's paper describes red teaming, where experts try to make the model produce harmful output so the problems can be fixed. It also says no testing can be sure to find every risk.

| Stage | What it uses | What it teaches |
|---|---|---|
| Pre-training | Trillions of tokens of text | Language, facts and patterns |
| Tuning for chat | Human-written answers and rankings | Following instructions, tone, safer replies |
| Testing | Benchmarks and expert attacks | Where it fails, so problems can be fixed before release |

You can also shape an already trained model yourself, with fine-tuning or with careful prompting. [Reasoning models](/guides/reasoning-models/) add one more round of reinforcement learning so they work through problems step by step.

## How long does AI training take and what does it cost?

For large models, training takes weeks of computing on thousands of chips. The chips are graphics processing units (GPUs), processors built to do huge numbers of simple calculations at once, and the training needs far more than one machine can hold. Meta's paper says its largest Llama 3 model was trained on up to 16,000 H100 GPUs, a data-center chip from NVIDIA with 80 GB of memory each.

Companies report effort in GPU hours, meaning one chip working for one hour. The [Llama 3 8B card](https://huggingface.co/meta-llama/Meta-Llama-3-8B) lists 1.3 million GPU hours. Here is what that means in time, as a sum only (the card doesn't say how many chips were used):

1. On 16,000 chips at once: 1,300,000 ÷ 16,000 = 81 hours, about 3.4 days.
2. On 1,000 chips: 1,300,000 ÷ 1,000 = 1,300 hours, about 54 days.

For comparison, the [Llama 2 7B card](https://huggingface.co/meta-llama/Llama-2-7b) lists 184,320 GPU hours for the 7B model, about 7.7 days on 1,000 chips. It describes the whole Llama 2 family as using about 3.3 million GPU hours. These are figures for pre-training one model. They don't include research runs that failed, tuning, or testing.

Cost depends on the price of a GPU hour, which these sources don't give, so there is no reported dollar figure to quote. As an illustration only: at a made-up price of $2 per GPU hour, 1.3 million hours would come to $2.6 million. Real prices vary by company and contract, and companies rarely publish what they paid.

With 16,000 chips, something breaks often. The Llama 3 paper counts 466 job interruptions during a 54-day stretch of pre-training, so a big part of the work is keeping the run going. Why graphics chips suit this work is a topic of its own.

## Does the model keep learning from your chats?

No. A finished model is frozen: its parameters don't change while you talk to it. Meta describes Llama 3 8B as ["a static model trained on an offline dataset"](https://huggingface.co/meta-llama/Meta-Llama-3-8B). Within one conversation, the model can use what you wrote earlier, but only because it is still in view in the context window, covered in [our context window guide](/guides/context-window/). Start a new chat and it's gone.

What an app does with your chats is a separate matter. As of November 2026, [OpenAI's help page on data use](https://help.openai.com/en/articles/5722486-how-your-data-is-used-to-improve-model-performance) says the company may use content from consumer ChatGPT to train its models, and you can turn this off in Settings under Data controls. It says business, enterprise, education and API content is not used for training by default. Other apps have their own rules, so read the privacy settings of the one you use.

This also explains the knowledge cutoff, the date after which the model has no training text. Meta lists March 2023 for Llama 3 8B, though the model was released on April 18, 2024. Part of the gap is time: collecting data, training, tuning and testing all take months. Some apps add a web search so the model can read fresh pages, but the model itself is unchanged.

> **In short:** Training happens before release. Chatting uses the model but doesn't change it. Your chats may be saved by the app, and that is a separate choice you can often change.

## Common mistakes about AI training

1. "The AI learns from every chat I have." Not quite. The model is frozen while you chat. The app may save chats for a future version, so check your settings.
2. "It looks things up in a database of what it read." No, not in the usual sense. Training turns text into adjusted numbers. Nothing like a library of pages is stored, although a model can sometimes repeat passages it saw often.
3. "Training is one step." It is several stages with different goals. People shape the behavior too, not just the machines.
4. "More data always means a better model." Not always. Data quality, filtering and tuning count too, and a model can overfit to what it saw.
5. "The model knows what happened yesterday." Not unless the app adds search. It only knows text up to its cutoff.

## Check a model's training details yourself

Pick any open model, such as Llama 3, and open its model card on Hugging Face. Look for the number of tokens it was trained on, the GPU hours, and the knowledge cutoff. Then do the sums from this guide: divide the GPU hours by the number of chips to get days, and multiply the tokens by 0.75 to get a rough word count.

Next, ask a chatbot what its knowledge cutoff is, then ask about something that happened soon after. If it gets it wrong or says it doesn't know, you have seen the cutoff for yourself.

To keep going, read [what an LLM is](/guides/what-is-an-llm/), what [parameters](/guides/parameters/) are, how [tokens](/guides/tokens/) work, or browse the [LLM basics page](/guides/topic/llm-basics/).
