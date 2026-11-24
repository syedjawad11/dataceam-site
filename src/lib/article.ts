// Helpers shared by Insights (layouts/Article.astro) and guide articles.

export const WORDS_PER_MINUTE = 220;

/** Whole minutes to read a markdown body (at least one). */
export function readingTime(markdown: string | undefined): number {
  const words =
    (markdown ?? '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .match(/[\p{L}\p{N}]+(?:['’–-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export const dateFormat = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

export interface FaqItem {
  q: string;
  a: string;
}

interface ArticleLdInput {
  title: string;
  description: string;
  image: string;
  published: string;
  modified: string;
  canonical: string;
  keywords: string[];
  siteUrl: URL;
  /** Guide-only extras; Insights keep their original shape without these. */
  extra?: Record<string, unknown>;
  organizationUrl?: string;
}

export function articleJsonLd({
  title,
  description,
  image,
  published,
  modified,
  canonical,
  keywords,
  siteUrl,
  extra,
  organizationUrl,
}: ArticleLdInput): Record<string, unknown> {
  const url = organizationUrl ? { url: organizationUrl } : {};
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image,
    datePublished: published,
    dateModified: modified,
    mainEntityOfPage: canonical,
    keywords,
    ...extra,
    author: { '@type': 'Organization', name: 'Dataceam', ...url },
    publisher: {
      '@type': 'Organization',
      name: 'Dataceam',
      ...url,
      logo: {
        '@type': 'ImageObject',
        url: new URL('/favicon.svg', siteUrl).href,
      },
    },
  };
}

export function faqJsonLd(faq: FaqItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}
