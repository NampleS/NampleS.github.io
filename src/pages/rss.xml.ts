import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { siteName, text } from '../site';
import { getPosts } from '../lib/content';
import { defaultLang } from '../i18n/ui';

export async function GET(context: APIContext) {
  const posts = await getPosts(defaultLang);
  return rss({
    title: siteName,
    description: text[defaultLang].description,
    site: context.site!,
    items: posts.map((p) => ({
      title: p.entry.data.title,
      description: p.entry.data.summary ?? '',
      pubDate: p.entry.data.date,
      link: `/blog/${p.base}/`,
    })),
    customData: '<language>ko</language>',
  });
}
