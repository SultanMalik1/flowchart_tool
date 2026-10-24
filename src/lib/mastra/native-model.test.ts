import { expect, it } from 'vitest';
import { createNativeModel, isGeminiModel } from './native-model';

it('sends Gemini 3.8 Flash requests to Google with low thinking', async () => {
  let url = '';
  let body: any;
  const native = createNativeModel('text_to_flowchart', {
    model: 'gemini-3.8-flash',
    apiKey: 'test-only',
    fetch: (async (input: unknown, init?: RequestInit) => {
      url = String(input);
      body = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { role: 'model', parts: [{ text: 'ok' }] },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: {
            promptTokenCount: 1,
            candidatesTokenCount: 1,
            totalTokenCount: 2,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch,
  });
  await native.doGenerate({
    prompt: [
      { role: 'user', content: [{ type: 'text', text: 'test transport' }] },
    ],
    maxOutputTokens: 32768,
  } as any);
  expect(url).toContain('generativelanguage.googleapis.com');
  expect(url).toContain('gemini-3.8-flash');
  expect(body.generationConfig.thinkingConfig.thinkingLevel).toBe('low');
});

it('sends Gemini Flash requests to Google with thinking reserved for the diagram', async () => {
  let url = '';
  let body: any;
  const native = createNativeModel('text_to_flowchart', {
    model: 'google/gemini-2.5-flash',
    apiKey: 'test-only',
    fetch: (async (input: unknown, init?: RequestInit) => {
      url = String(input);
      body = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { role: 'model', parts: [{ text: 'ok' }] },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: {
            promptTokenCount: 1,
            candidatesTokenCount: 1,
            totalTokenCount: 2,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch,
  });
  await native.doGenerate({
    prompt: [
      { role: 'user', content: [{ type: 'text', text: 'test transport' }] },
    ],
    maxOutputTokens: 32768,
  } as any);
  expect(isGeminiModel('google/gemini-2.5-flash')).toBe(true);
  expect(url).toContain('generativelanguage.googleapis.com');
  expect(url).toContain('gemini-2.5-flash');
  expect(body.generationConfig.thinkingConfig.thinkingBudget).toBe(0);
  expect(body.generationConfig.maxOutputTokens).toBe(32768);
});

it('rejects a non-Gemini model id', () => {
  expect(() =>
    createNativeModel('text_to_flowchart', {
      model: 'llama-3.3-70b-versatile',
      apiKey: 'test-only',
    })
  ).toThrow(/Only Gemini models are supported/);
});
