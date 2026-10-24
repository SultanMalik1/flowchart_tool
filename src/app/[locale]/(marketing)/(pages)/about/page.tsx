import Container from '@/components/layout/container';
import { isExplicitlyNoIndexMarketingPage } from '@/lib/marketing-page-indexing';
import { constructMetadata } from '@/lib/metadata';
import { getUrlWithLocale } from '@/lib/urls/urls';
import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata | undefined> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const pt = await getTranslations({ locale, namespace: 'AboutPage' });

  return constructMetadata({
    title: pt('title') + ' | ' + t('title'),
    description: pt('description'),
    canonicalUrl: getUrlWithLocale('/about', locale),
    noIndex: isExplicitlyNoIndexMarketingPage('/about'),
  });
}

export default async function AboutPage() {
  const t = await getTranslations('AboutPage');

  return (
    <Container className="py-16 px-4">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-4xl text-foreground">{t('title')}</h1>
        <p className="text-base text-muted-foreground">{t('introduction')}</p>
      </div>
    </Container>
  );
}
