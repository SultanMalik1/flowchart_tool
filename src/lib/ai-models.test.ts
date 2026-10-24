import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFlowchartModelForMode } from './ai-models';
import { buildGatewayModelId } from './mastra/request-builder';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('flowchart model routing', () => {
  it('uses Groq defaults when no override is set', () => {
    vi.stubEnv('FLOWCHART_TEXT_MODEL', '');
    vi.stubEnv('FLOWCHART_IMAGE_MODEL', '');
    expect(getFlowchartModelForMode('text_to_flowchart')).toBe(
      'openai/gpt-oss-120b'
    );
    expect(getFlowchartModelForMode('image_to_flowchart')).toBe(
      'qwen/qwen3.8-27b'
    );
  });

  it('routes text requests through the configured Groq model', () => {
    vi.stubEnv('FLOWCHART_TEXT_MODEL', 'llama-3.3-70b-versatile');
    expect(
      buildGatewayModelId(getFlowchartModelForMode('text_to_flowchart'))
    ).toBe('groq/llama-3.3-70b-versatile');
  });

  it('routes image requests through the independently configured vision model', () => {
    vi.stubEnv('FLOWCHART_IMAGE_MODEL', 'meta-llama/custom-vision');
    expect(
      buildGatewayModelId(getFlowchartModelForMode('image_to_flowchart'))
    ).toBe('groq/meta-llama/custom-vision');
  });
});
