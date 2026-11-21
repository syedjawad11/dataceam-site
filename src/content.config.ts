import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const insights = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/insights' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      draft: z.boolean().default(false),
      tags: z.array(z.string()).default([]),
      heroImage: image().optional(),
      heroAlt: z.string().optional(),
      ogImage: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
    }),
});

const status = z.enum(['live', 'soon']).default('soon');
const text = z.string().trim().min(1);

export const courseSchema = z.object({
  stage: text,
  provider: text,
  logo: text,
  title: text,
  url: z.url(),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  hours: z.number().positive(),
  credential: text,
  cost: z.object({
    study: z.literal('free'),
    exam: z.object({ price: text, required: z.literal(false) }).optional(),
  }),
  skills: text,
  sourceUrl: z.url(),
  checkedAt: z.coerce.date(),
});

const tracks = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tracks' }),
  schema: z
    .object({
      role: text,
      slug: text,
      summary: text,
      who: text,
      status,
      updated: z.coerce.date(),
      shortlink: text.optional(),
      pdf: text.optional(),
      stages: z.array(z.object({ key: text, name: text, desc: text })).min(1),
      courses: z.array(courseSchema.partial()).default([]),
    })
    .superRefine((track, ctx) => {
      if (track.status === 'live' && track.courses.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['courses'],
          message: 'A live track needs at least one complete course.',
        });
      }
      const keys = track.stages.map(({ key }) => key);
      if (track.status === 'live') {
        track.stages.forEach((stage, index) => {
          if (!track.courses.some((course) => course.stage === stage.key)) {
            ctx.addIssue({
              code: 'custom',
              path: ['stages', index],
              message: 'Every stage of a live track needs at least one course.',
            });
          }
        });
      }
      if (new Set(keys).size !== keys.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['stages'],
          message: 'Stage keys must be unique.',
        });
      }
      track.courses.forEach((course, index) => {
        if (course.stage !== undefined && !keys.includes(course.stage)) {
          ctx.addIssue({
            code: 'custom',
            path: ['courses', index, 'stage'],
            message: 'Course stage must match a track stage key.',
          });
        }
        if (track.status === 'live') {
          const result = courseSchema.safeParse(course);
          if (!result.success) {
            for (const issue of result.error.issues) {
              ctx.addIssue({
                code: 'custom',
                path: ['courses', index, ...issue.path],
                message: issue.message,
              });
            }
          }
        }
      });
    }),
});

const repos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/repos' }),
  schema: z
    .object({
      owner: text,
      name: text,
      url: z.url(),
      description: text,
      category: text,
      tracks: z.array(text),
      status,
      shortlink: text.optional(),
      stats: z
        .object({
          stars: z.number().int().nonnegative(),
          forks: z.number().int().nonnegative(),
          license: text,
          language: text,
          pushedAt: z.coerce.date(),
          fetchedAt: z.coerce.date(),
        })
        .optional(),
      quickstart: z
        .object({
          commands: text,
          testedOn: z.coerce.date(),
          environment: text,
        })
        .optional(),
      needs: z.array(text).optional(),
      gotchas: z.array(text).optional(),
      alternatives: z
        .array(z.object({ name: text, url: z.url(), why: text }))
        .optional(),
    })
    .superRefine((repo, ctx) => {
      if (repo.status !== 'live') return;
      for (const field of ['stats', 'quickstart'] as const) {
        if (!repo[field])
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: `A live repo needs ${field}.`,
          });
      }
    }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: ({ image }) =>
    z
      .object({
        title: text,
        description: text,
        topic: z.enum([
          'llm-basics',
          'retrieval-rag',
          'agents',
          'prompting-safety',
          'hardware',
        ]),
        status,
        image: image().optional(),
        imageAlt: text.optional(),
        video: z
          .object({
            src: text,
            poster: text,
            captions: text.optional(),
            captionsLang: text.default('en'),
          })
          .optional(),
        sources: z
          .array(
            z.object({ title: text, url: z.url(), checked: z.coerce.date() }),
          )
          .optional(),
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        tracks: z.array(text),
        shortlink: text.optional(),
      })
      .superRefine((guide, ctx) => {
        if (guide.status !== 'live') return;
        for (const field of ['image', 'imageAlt'] as const) {
          if (!guide[field])
            ctx.addIssue({
              code: 'custom',
              path: [field],
              message: `A live guide needs ${field}.`,
            });
        }
        if (!guide.sources?.length)
          ctx.addIssue({
            code: 'custom',
            path: ['sources'],
            message: 'A live guide needs at least one source.',
          });
      }),
});

export const collections = { insights, tracks, repos, guides };
