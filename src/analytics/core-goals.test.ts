import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CORE_GOALS,
  EVENTS,
  isProductionAnalytics,
  sanitizeEventProperties,
} from './core-goals';
import { trackFlowchartEvent } from './plausible-browser';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('the operating goals', () => {
  it('uses the SpriteFuse milestones with Flowchart names', () => {
    expect(CORE_GOALS).toEqual([
      'Registration Completed',
      'Flowchart Processing Started',
      'Flowchart Export Ready',
      'Download Clicked',
    ]);
  });

  it('drops content, identities, unknown keys and invalid enum values', () => {
    expect(
      sanitizeEventProperties({
        mode: 'image_to_flowchart',
        editor: 'drawio',
        format: 'png',
        prompt: 'private prompt',
        email: 'private@example.com',
        userId: '123',
        plan: 'custom-private-plan',
      })
    ).toEqual({
      mode: 'image_to_flowchart',
      editor: 'drawio',
      format: 'png',
    });
    expect(sanitizeEventProperties({ source: 'private-user-id' })).toEqual({});
  });

  it('keeps development and preview traffic out of production', () => {
    const env = {
      NODE_ENV: 'production',
      NEXT_PUBLIC_BASE_URL: 'https://example.com',
      NEXT_PUBLIC_PLAUSIBLE_DOMAIN: 'example.com',
      NEXT_PUBLIC_PLAUSIBLE_SCRIPT: 'https://myplausible.app/js/script.js',
    };
    expect(isProductionAnalytics(env)).toBe(true);
    expect(isProductionAnalytics({ ...env, VERCEL_ENV: 'preview' })).toBe(
      false
    );
    expect(isProductionAnalytics({ ...env, NODE_ENV: 'development' })).toBe(
      false
    );
    expect(
      isProductionAnalytics({
        ...env,
        NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
      })
    ).toBe(false);
  });

  it('queues an event when the script has not loaded yet', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://example.com');
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_DOMAIN', 'example.com');
    vi.stubEnv(
      'NEXT_PUBLIC_PLAUSIBLE_SCRIPT',
      'https://myplausible.app/js/script.js'
    );
    const browser = { location: { origin: 'https://example.com' } } as any;
    vi.stubGlobal('window', browser);
    trackFlowchartEvent(EVENTS.exportReady);
    expect(browser.plausible.q).toHaveLength(1);
    expect(Array.from(browser.plausible.q[0])).toEqual([
      EVENTS.exportReady,
      { props: {} },
    ]);
  });

  it('provider failures do not interrupt the product', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://example.com');
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_DOMAIN', 'example.com');
    vi.stubEnv(
      'NEXT_PUBLIC_PLAUSIBLE_SCRIPT',
      'https://myplausible.app/js/script.js'
    );
    vi.stubGlobal('window', {
      location: { origin: 'https://example.com' },
      plausible: () => {
        throw new Error('blocked');
      },
    });
    expect(() =>
      trackFlowchartEvent(EVENTS.downloadClicked, { format: 'svg' })
    ).not.toThrow();
  });

});
