import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { isLive, sortGuides } from '../lib/learning';

export async function GET(context: APIContext) {
  const site = context.site!;
  const link = (title: string, path: string, description?: string) =>
    `- [${title}](${new URL(path, site).href})${description ? `: ${description}` : ''}`;
  const guides = sortGuides(
    await getCollection('guides', ({ data }) => isLive(data)),
  );
  const insights = (
    await getCollection('insights', ({ data }) => !data.draft)
  ).sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
  const lines = [
    '# Dataceam',
    '',
    '> Free, easy-to-follow AI-learning guides, plus referral information for AI-training work and data licensing. Dataceam is a referrer only.',
    '',
    ...(guides.length
      ? [
          '## Guides',
          '',
          ...guides.map(({ id, data }) =>
            link(data.title, `/guides/${id}/`, data.description),
          ),
          '',
        ]
      : []),
    '## Insights',
    '',
    link('All insights', '/insights/'),
    ...insights.map(({ id, data }) =>
      link(data.title, `/insights/${id}/`, data.description),
    ),
    '',
    '## About',
    '',
    link('FAQ', '/faq/'),
    link('AI jobs', '/jobs/'),
    link('For companies', '/companies/'),
    link('Referral disclosure', '/disclosure/'),
    '',
  ];
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
