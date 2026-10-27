import { describe, expect, it } from 'vitest';
import { buildRobotsTxt } from './robots';

describe('robots.txt', () => {
  it('keeps llms files crawlable without non-standard robots directives', () => {
    const body = buildRobotsTxt(
      'https://example.com',
      ['Allow: /'],
      ['Disallow: /api/'],
      ['GPTBot']
    );

    expect(body).toContain('Allow: /');
    expect(body).toContain('Sitemap:');
    expect(body).not.toContain('LLM-Content:');
    expect(body).not.toContain('LLM-Full-Content:');
  });
});
