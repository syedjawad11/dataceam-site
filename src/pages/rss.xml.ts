import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { isLive } from '../lib/learning';

export async function GET(context: APIContext) {
  const posts = await getCollection('insights', ({ data }) => !data.draft);
  const guides = await getCollection('guides', ({ data }) => isLive(data));
  const items = [
    ...posts.map(({ id, data }) => ({
      title: data.title,
      description: data.description,
      pubDate: data.pubDate,
      categories: data.tags,
      link: `/insights/${id}/`,
    })),
    ...guides.map(({ id, data }) => ({
      title: data.title,
      description: data.description,
      pubDate: data.pubDate,
      categories: data.keywords ?? [],
      link: `/guides/${id}/`,
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: 'Dataceam guides and insights',
    description: 'New guides and insights from Dataceam.',
    site: context.site!,
    items,
  });
}
