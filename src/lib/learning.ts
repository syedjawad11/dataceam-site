import type { CollectionEntry } from 'astro:content';
import type { z } from 'astro/zod';
import type { courseSchema } from '../content.config';

export type Track = CollectionEntry<'tracks'>['data'];
export type Course = z.infer<typeof courseSchema>;
export type Topic = CollectionEntry<'guides'>['data']['topic'];

export const totalHours = (track: Pick<Track, 'courses'>): number =>
  track.courses.reduce((total, course) => total + (course.hours ?? 0), 0);

export const courseCount = (track: Pick<Track, 'courses'>): number =>
  track.courses.length;

export function weeksAt(
  track: Pick<Track, 'courses'>,
  hoursPerWeek: number,
): number {
  if (!Number.isFinite(hoursPerWeek) || hoursPerWeek <= 0) {
    throw new RangeError('Hours per week must be a positive finite number.');
  }
  return Math.ceil(totalHours(track) / hoursPerWeek);
}

export const stageHours = (track: Pick<Track, 'stages' | 'courses'>) =>
  track.stages.map((stage) => ({
    ...stage,
    hours: track.courses.reduce(
      (total, course) =>
        total + (course.stage === stage.key ? (course.hours ?? 0) : 0),
      0,
    ),
  }));

export const topicLabels: Record<
  Topic,
  { label: string; description: string }
> = {
  'llm-basics': {
    label: 'LLM basics',
    description:
      'One-minute guides to how large language models work: tokens, context windows, parameters, training and more.',
  },
  'retrieval-rag': {
    label: 'Retrieval and RAG',
    description:
      'One-minute guides to embeddings and retrieval-augmented generation (RAG).',
  },
  agents: {
    label: 'Agents',
    description:
      'One-minute guides to AI agents: what they are and how they act.',
  },
  'prompting-safety': {
    label: 'Prompting and safety',
    description:
      'One-minute guides to prompting, fine-tuning and prompt injection.',
  },
  hardware: {
    label: 'Hardware',
    description: 'One-minute guides to the hardware that runs AI.',
  },
};

export const compareGuides = (
  a: CollectionEntry<'guides'>,
  b: CollectionEntry<'guides'>,
): number =>
  a.data.pubDate.getTime() - b.data.pubDate.getTime() ||
  a.data.title.localeCompare(b.data.title, 'en');

export const repoSlug = (repo: { owner: string; name: string }): string =>
  `${repo.owner}-${repo.name}`;
export const isLive = (entry: { status?: string }): boolean =>
  entry.status === 'live';

export const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);

export function breadcrumbs(
  items: { name: string; path: string }[],
  site: URL,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...items].map(
      (item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: new URL(item.path, site).href,
      }),
    ),
  };
}
