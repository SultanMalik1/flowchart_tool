import { EMPTY_DRAWIO_XML } from '@/lib/drawio/contracts';
import { expect, it, vi } from 'vitest';
import { prepareNativeChat } from './chat-prepare';

const document = {
  editorKind: 'drawio' as const,
  formatVersion: 1 as const,
  documentId: 'doc-1',
  revision: 2,
  diagramType: 'flowchart',
  xml: EMPTY_DRAWIO_XML,
};

function request(messages: unknown, aiContext: Record<string, unknown> = {}) {
  return {
    messages,
    aiContext: {
      editorKind: 'drawio',
      nativeDocument: document,
      nativeSelection: ['start'],
      mode: 'text_to_flowchart',
      requestedMode: 'create',
      ...aiContext,
    },
  };
}

it('prepares the current prompt, selection, model settings and tools', () => {
  vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'test-key');
  vi.stubEnv('FLOWCHART_NATIVE_TEXT_MODEL', 'gemini-2.5-flash');
  const prepared = prepareNativeChat(
    request([{ role: 'user', content: 'Add a review step' }]),
    'request-1',
    Date.now()
  );
  expect(prepared.ok).toBe(true);
  if (!prepared.ok) return;
  expect(prepared.modelId).toBe('gemini-2.5-flash');
  expect(prepared.thinking).toEqual({ thinkingBudget: 0 });
  expect(prepared.modelSettings).toMatchObject({
    temperature: 0.35,
    maxOutputTokens: 32768,
    maxRetries: 1,
  });
  expect(prepared.instructions).toContain('"selection":["start"]');
  expect(prepared.messages).toContain('Add a review step');
  expect(prepared.messages).toContain('Requested mode from UI: create');
  expect(prepared.tools.map((tool) => tool.name)).toEqual([
    'generate_flowchart',
    'skill',
    'skill_read',
    'skill_search',
  ]);
  const flowchart = prepared.tools[0];
  expect(flowchart?.parameters).toMatchObject({
    required: ['action', 'diagramType', 'description'],
  });
  expect(JSON.stringify(flowchart?.parameters)).toContain('retryPolicy');
});

it('keeps a text follow-up in text mode when the latest message has no image', () => {
  vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'test-key');
  const prepared = prepareNativeChat(
    request(
      [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Rebuild' },
            {
              type: 'image_url',
              image_url: { url: 'data:image/png;base64,abc' },
            },
          ],
        },
        { role: 'user', content: 'Make the boxes blue' },
      ],
      { mode: 'image_to_flowchart', requestedMode: 'patch' }
    ),
    'request-2',
    Date.now()
  );
  expect(prepared.ok).toBe(true);
  if (!prepared.ok) return;
  expect(prepared.mode).toBe('text_to_flowchart');
  expect(prepared.messages).toContain('[Image attached]');
  expect(prepared.messages).toContain('Make the boxes blue');
});

it('rejects a second image on the latest image-mode message', () => {
  vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'test-key');
  const prepared = prepareNativeChat(
    request(
      [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: 'data:image/png;base64,a' },
            },
            {
              type: 'image_url',
              image_url: { url: 'data:image/png;base64,b' },
            },
          ],
        },
      ],
      { mode: 'image_to_flowchart' }
    ),
    'request-3',
    Date.now()
  );
  expect(prepared).toMatchObject({
    ok: false,
    status: 400,
    body: { error: 'Only one image is supported for image_to_flowchart mode' },
  });
});
