import { LocaleLink } from '@/i18n/navigation';
import { constructMetadata } from '@/lib/metadata';
import { getUrlWithLocale } from '@/lib/urls/urls';
import type { Metadata } from 'next';
import type { Locale } from 'next-intl';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata | undefined> {
  const { locale } = await params;
  return constructMetadata({
    title: 'FlowPilot',
    description:
      'Create a diagram from a description or from one image, change it by asking or by editing it, and download it as .drawio.',
    canonicalUrl: getUrlWithLocale('', locale),
  });
}

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center bg-white text-black">
      <div className="mx-auto w-full max-w-lg px-8 py-24">
        <h1 className="text-6xl font-medium tracking-tight">FlowPilot</h1>
        <div className="mt-8 h-px w-12 bg-[#76A923]" />
        <div className="mt-8 space-y-5 text-[15px] leading-7">
          <p>
            <span className="font-medium text-[#76A923]">Can. </span>
            Create a diagram from a description or from one image; change it by
            asking or by editing it; download it as .drawio; import that file
            later and keep editing.
          </p>
          <p>
            <span className="font-medium text-[#76A923]">Cannot. </span>
            Store a diagram, reopen one after a refresh unless it is imported,
            take more than one image, or read a PDF or other document.
          </p>
        </div>
        <LocaleLink
          href="/canvas"
          className="mt-12 inline-flex text-sm font-medium underline decoration-[#76A923] decoration-2 underline-offset-8"
        >
          Open canvas
        </LocaleLink>
      </div>
    </main>
  );
}
