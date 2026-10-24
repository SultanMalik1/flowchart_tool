import { expect, it } from 'vitest';
import {
  createNativeModel,
  groqRetryDelayMs,
  isGeminiModel,
} from './native-model';

async function captureRequest(model: string): Promise<any> {
  let body: any;
  const native = createNativeModel('text_to_flowchart', {
    model,
    apiKey: 'test-only',
    fetch: (async (_url: unknown, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          id: 'test',
          object: 'chat.completion',
          created: 1,
          model,
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'ok' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch,
  });
  await native.doGenerate({
    prompt: [
      { role: 'user', content: [{ type: 'text', text: 'test transport' }] },
    ],
    maxOutputTokens: 16000,
    tools: [
      {
        type: 'function',
        name: 'generate_flowchart',
        description: 'test',
        inputSchema: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            style: {
              anyOf: [{ required: ['fillColor'] }],
            },
          },
          required: ['description'],
          additionalProperties: false,
        },
        strict: true,
      },
    ],
  } as any);
  return body;
}

it('sends requests to Groq with the bare model id and without strict tools', async () => {
  const body = await captureRequest('groq/openai/gpt-oss-120b');
  expect(body.model).toBe('openai/gpt-oss-120b');
  expect(body.max_tokens).toBe(16000);
  expect(body.tools[0].function.strict).toBeUndefined();
  expect(body.tools[0].function.parameters.required).toBeUndefined();
  expect(
    body.tools[0].function.parameters.additionalProperties
  ).toBeUndefined();
  expect(
    body.tools[0].function.parameters.properties.style.anyOf[0].required
  ).toBeUndefined();
});

it('waits out one Groq token limit and retries the same request', async () => {
  expect(
    groqRetryDelayMs(
      new Response(null, { status: 429, headers: { 'retry-after': '0' } }),
      ''
    )
  ).toBe(0);

  let calls = 0;
  const native = createNativeModel('text_to_flowchart', {
    model: 'openai/gpt-oss-120b',
    apiKey: 'test-only',
    fetch: (async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(
          JSON.stringify({
            error: {
              message: 'Rate limit reached. Please try again in 27s.',
              code: 'rate_limit_exceeded',
            },
          }),
          {
            status: 429,
            headers: {
              'content-type': 'application/json',
              'retry-after': '0',
            },
          }
        );
      }
      return new Response(
        JSON.stringify({
          id: 'test',
          object: 'chat.completion',
          created: 1,
          model: 'openai/gpt-oss-120b',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'ok' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch,
  });

  await native.doGenerate({
    prompt: [
      { role: 'user', content: [{ type: 'text', text: 'test transport' }] },
    ],
  } as any);
  expect(calls).toBe(2);
});

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

it('drops the strict tool flag for models that do not support it', async () => {
  const body = await captureRequest('llama-3.3-70b-versatile');
  expect(body.model).toBe('llama-3.3-70b-versatile');
  expect(body.tools[0].function.strict).toBeUndefined();
});
