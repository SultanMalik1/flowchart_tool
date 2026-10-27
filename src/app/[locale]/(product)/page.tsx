import { LocaleLink } from '@/i18n/navigation';
import { constructMetadata } from '@/lib/metadata';
import { getUrlWithLocale } from '@/lib/urls/urls';
import type { Metadata } from 'next';
import type { Locale } from 'next-intl';

// Fidelity Investments palette
const GREEN = '#368727';
const GREEN_TINT = '#eef5ec';
const INK = '#333333';
const MUTED = '#666666';
const LINE = '#e3e3e3';

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

const CAN = [
  'Create a diagram from a description or one image',
  'Change it by asking, or by editing it directly',
  'Download as .drawio and import it later',
];

const CANNOT = [
  'Store diagrams or reopen them after a refresh',
  'Take more than one image',
  'Read a PDF or other document',
];

function Check({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="mt-[3px] h-4 w-4 shrink-0"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}

function Dash({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="mt-[3px] h-4 w-4 shrink-0"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 10h10" />
    </svg>
  );
}

/** Minimal swim-lane illustration: two lanes, three nodes, connecting arrows. */
function LaneIllustration() {
  return (
    <svg
      viewBox="0 0 360 200"
      className="h-auto w-full"
      role="img"
      aria-label="Simple swim lane flowchart"
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0 0L10 5L0 10z" fill={GREEN} />
        </marker>
      </defs>
      <rect
        x="1"
        y="1"
        width="358"
        height="198"
        rx="8"
        fill="#fff"
        stroke={LINE}
      />
      <rect x="1" y="1" width="358" height="98" rx="8" fill={GREEN_TINT} />
      <rect x="1" y="60" width="358" height="39" fill={GREEN_TINT} />
      <line x1="1" y1="99" x2="359" y2="99" stroke={LINE} />
      <line x1="44" y1="1" x2="44" y2="199" stroke={LINE} />

      <rect x="64" y="34" width="72" height="32" rx="6" fill="#fff" stroke={GREEN} strokeWidth="1.5" />
      <rect x="164" y="134" width="72" height="32" rx="6" fill="#fff" stroke={GREEN} strokeWidth="1.5" />
      <rect x="264" y="34" width="72" height="32" rx="6" fill={GREEN} />

      <path d="M136 50H150V150H164" fill="none" stroke={GREEN} strokeWidth="1.5" markerEnd="url(#arrow)" />
      <path d="M236 150H250V50H264" fill="none" stroke={GREEN} strokeWidth="1.5" markerEnd="url(#arrow)" />

      <rect x="74" y="46" width="34" height="3" rx="1.5" fill={GREEN} opacity="0.35" />
      <rect x="74" y="53" width="48" height="3" rx="1.5" fill={GREEN} opacity="0.2" />
      <rect x="174" y="146" width="34" height="3" rx="1.5" fill={GREEN} opacity="0.35" />
      <rect x="174" y="153" width="48" height="3" rx="1.5" fill={GREEN} opacity="0.2" />
      <rect x="274" y="46" width="34" height="3" rx="1.5" fill="#fff" opacity="0.8" />
      <rect x="274" y="53" width="48" height="3" rx="1.5" fill="#fff" opacity="0.5" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main
      className="flex min-h-screen flex-col bg-white"
      style={{ color: INK }}
    >
      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: GREEN }}
          />
          <span className="text-base font-semibold tracking-tight">
            FlowPilot
          </span>
        </div>
        <LocaleLink
          href="/canvas"
          className="text-sm font-medium transition-colors hover:underline"
          style={{ color: GREEN }}
        >
          Open canvas
        </LocaleLink>
      </header>

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-16 px-8 py-12 lg:grid-cols-2 lg:py-20">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: GREEN }}
          >
            Swim lane diagrams
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            Diagrams,
            <br />
            from a simple <span style={{ color: GREEN }}>prompt.</span>
          </h1>
          <p
            className="mt-6 max-w-md text-lg leading-8"
            style={{ color: MUTED }}
          >
            Describe a process or upload one image. Refine it by asking or by
            editing, then take it with you as a .drawio file.
          </p>

          <div className="mt-10 flex items-center gap-6">
            <LocaleLink
              href="/canvas"
              className="inline-flex items-center rounded-full px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2a6b1e]"
              style={{ backgroundColor: GREEN }}
            >
              Open canvas
              <svg
                viewBox="0 0 20 20"
                className="ml-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 10h12M11 5l5 5-5 5" />
              </svg>
            </LocaleLink>
          </div>
        </div>

        <div className="lg:pl-6">
          <LaneIllustration />
        </div>
      </section>

      {/* Can / Cannot */}
      <section
        className="border-t"
        style={{ borderColor: LINE, backgroundColor: '#fafafa' }}
      >
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-8 py-16 md:grid-cols-2">
          <div>
            <h2
              className="text-sm font-semibold uppercase tracking-[0.18em]"
              style={{ color: GREEN }}
            >
              Can
            </h2>
            <ul className="mt-6 space-y-4 text-[15px] leading-6">
              {CAN.map((item) => (
                <li key={item} className="flex gap-3">
                  <Check color={GREEN} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2
              className="text-sm font-semibold uppercase tracking-[0.18em]"
              style={{ color: MUTED }}
            >
              Cannot
            </h2>
            <ul
              className="mt-6 space-y-4 text-[15px] leading-6"
              style={{ color: MUTED }}
            >
              {CANNOT.map((item) => (
                <li key={item} className="flex gap-3">
                  <Dash color="#999999" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
