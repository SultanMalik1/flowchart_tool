import { getLocalePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import type { MetadataRoute } from 'next';
import type { Locale } from 'next-intl';
import { getBaseUrl } from '../lib/urls/urls';

type Href = Parameters<typeof getLocalePathname>[0]['href'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return ['/', '/canvas'].flatMap((route) =>
    routing.locales.map((locale) => ({
      url: getUrl(route, locale),
      lastModified: new Date(),
      priority: route === '/' ? 1 : 0.8,
      changeFrequency: 'weekly' as const,
    }))
  );
}

function getUrl(href: Href, locale: Locale) {
  const pathname = getLocalePathname({ locale, href });
  return getBaseUrl() + pathname;
}
