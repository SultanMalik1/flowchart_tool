/**
 * [INPUT] Browser milestones, production origin and allowlisted context.
 * [OUTPUT] Best-effort Plausible events, queued until the tracker loads.
 * [POS] Browser delivery for export and download milestones.
 * [UPDATE] Sync core-goals.ts and loader when tracker behavior changes.
 */
import {
  EVENTS,
  type EventProperties,
  isProductionAnalytics,
  sanitizeEventProperties,
} from './core-goals';

type BrowserEvent =
  | typeof EVENTS.exportReady
  | typeof EVENTS.downloadClicked;
type Plausible = {
  (event: string, options: { props: Record<string, string> }): void;
  q?: unknown[][];
};

declare global {
  interface Window {
    plausible?: Plausible;
  }
}

export function trackFlowchartEvent(
  event: BrowserEvent,
  properties: EventProperties = {}
): void {
  if (
    typeof window === 'undefined' ||
    window.location.origin !== process.env.NEXT_PUBLIC_BASE_URL ||
    !isProductionAnalytics({
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      NEXT_PUBLIC_PLAUSIBLE_DOMAIN: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
      NEXT_PUBLIC_PLAUSIBLE_SCRIPT: process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT,
    }) ||
    ![EVENTS.exportReady, EVENTS.downloadClicked].includes(event)
  )
    return;
  try {
    if (!window.plausible) {
      const queue: Plausible = (...args) => {
        queue.q?.push(args);
      };
      queue.q = [];
      window.plausible = queue;
    }
    window.plausible(event, { props: sanitizeEventProperties(properties) });
  } catch {
    // Analytics must never block an export.
  }
}
