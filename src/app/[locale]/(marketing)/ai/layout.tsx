import Container from '@/components/layout/container';
import { websiteConfig } from '@/config/website';
import { notFound } from 'next/navigation';
import type { PropsWithChildren } from 'react';

export default function PageLayout({ children }: PropsWithChildren) {
  if (!websiteConfig.features.enableAIPages) {
    notFound();
  }

  return (
    <Container className="py-16 px-4">
      <div className="mx-auto">{children}</div>
    </Container>
  );
}
