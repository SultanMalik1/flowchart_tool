import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFlowchartModelForMode } from './ai-models';
import { buildGatewayModelId } from './mastra/request-builder';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('flowchart model routing', () => {
  it('uses Gemini defaults when no override is set', () => {
    vi.stubEnv('FLOWCHART_TEXT_MODEL', '');
    vi.stubEnv('FLOWCHART_IMAGE_MODEL', '');
    expect(getFlowchartModelForMode('text_to_flowchart')).toBe(
      'gemini-flash-latest'
    );
    expect(getFlowchartModelForMode('image_to_flowchart')).toBe(
      'gemini-flash-latest'
    );
  });

  it('routes text requests through the configured Gemini model', () => {
    vi.stubEnv('FLOWCHART_TEXT_MODEL', 'gemini-2.5-flash');
    expect(
      buildGatewayModelId(getFlowchartModelForMode('text_to_flowchart'))
    ).toBe('google/gemini-2.5-flash');
  });

  it('routes image requests through the independently configured vision model', () => {
    vi.stubEnv('FLOWCHART_IMAGE_MODEL', 'gemini-2.5-pro');
    expect(
      buildGatewayModelId(getFlowchartModelForMode('image_to_flowchart'))
    ).toBe('google/gemini-2.5-pro');
  });
});
