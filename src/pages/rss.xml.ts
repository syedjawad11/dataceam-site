import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export async function GET(context: APIContext) {
  const posts = (
    await getCollection('insights', ({ data }) => !data.draft)
  ).sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());

  return rss({
    title: 'Dataceam Insights',
    description: 'Dataceam insights.',
    site: context.site!,
    items: posts.map(({ id, data }) => ({
      title: data.title,
      description: data.description,
      pubDate: data.pubDate,
      categories: data.tags,
      link: `/insights/${id}/`,
    })),
  });
}
