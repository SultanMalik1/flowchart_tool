/**
 * [INPUT] Native configured model, provider key and optional test transport.
 * [OUTPUT] AI SDK 7-compatible language model for native tool execution.
 * [POS] Native provider adapter. Gemini ids use Google; other ids use Groq.
 * [UPDATE] Verify outbound request options when upgrading provider or Mastra.
 */
import { createGoogle } from '@ai-sdk/google';
import { type GroqProviderSettings, createGroq } from '@ai-sdk/groq';
import { getFlowchartModelForMode } from '../ai-models';
import type { AiAssistantMode } from '../ai-modes';

type NativeModelOptions = Pick<GroqProviderSettings, 'apiKey' | 'fetch'> & {
  model?: string;
};

/** Gemini model ids such as `gemini-3.8-flash` or `google/gemini-3.8-flash`. */
export function isGeminiModel(model: string): boolean {
  const id = model.trim().toLowerCase().replace(/^(google|gemini)\//, '');
  return id.startsWith('gemini-') || id.startsWith('gemma-');
}

export function normalizeGeminiModelId(model: string): string {
  return model.trim().replace(/^(google|gemini)\//, '');
}

export function getNativeModelForMode(mode: AiAssistantMode): string {
  return mode === 'text_to_flowchart'
    ? process.env.FLOWCHART_NATIVE_TEXT_MODEL || getFlowchartModelForMode(mode)
    : getFlowchartModelForMode(mode);
}

/** Groq models use bare ids such as `openai/gpt-oss-120b`. */
export function normalizeGroqModelId(model: string): string {
  return model.trim().replace(/^groq\//, '');
}

/**
 * Groq rejects tool calls that miss a listed field or include an extra key,
 * and its strict mode cannot represent open style maps. Keep the property
 * descriptions, but do not ask Groq to enforce the schema. Mastra still
 * validates every tool input and can ask the model to correct it.
 */
function relaxGroqSchema(schema: unknown): void {
  if (!schema || typeof schema !== 'object') return;
  if (Array.isArray(schema)) {
    for (const item of schema) relaxGroqSchema(item);
    return;
  }
  const record = schema as Record<string, unknown>;
  if (record.additionalProperties === false) {
    record.additionalProperties = undefined;
  }
  record.required = undefined;
  for (const value of Object.values(record)) relaxGroqSchema(value);
}

function relaxGroqTool(tool: {
  function?: { parameters?: unknown; strict?: boolean };
  parameters?: unknown;
  strict?: boolean;
}) {
  if (tool.function) {
    const { strict: _strict, parameters, ...fn } = tool.function;
    relaxGroqSchema(parameters);
    return { ...tool, function: { ...fn, parameters } };
  }
  const { strict: _strict, parameters, ...rest } = tool;
  relaxGroqSchema(parameters);
  return { ...rest, parameters };
}

const MAX_RATE_LIMIT_WAIT_MS = 45_000;

/** Groq's on-demand tier asks the caller to wait; retrying immediately fails again. */
export function groqRetryDelayMs(
  response: Response,
  bodyText: string
): number {
  const header = response.headers.get('retry-after');
  const headerSeconds =
    header == null || header.trim() === '' ? Number.NaN : Number(header);
  const mentioned = bodyText.match(/try again in\s+([0-9.]+)\s*s/i);
  const seconds = Number.isFinite(headerSeconds)
    ? headerSeconds
    : mentioned
      ? Number(mentioned[1])
      : 20;
  return Math.min(Math.max(0, seconds) * 1000, MAX_RATE_LIMIT_WAIT_MS);
}

function delay(ms: number, signal?: AbortSignal | null): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(finish, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Request aborted', 'AbortError'));
    };
    function finish() {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function fetchOnceAfterRateLimit(
  baseFetch: typeof fetch,
  input: Parameters<typeof fetch>[0],
  init?: RequestInit
): Promise<Response> {
  const response = await baseFetch(input, init);
  if (response.status !== 429) return response;
  const bodyText = await response.clone().text();
  await delay(groqRetryDelayMs(response, bodyText), init?.signal);
  return baseFetch(input, init);
}

/**
 * Keep Gemini's thinking tokens out of the diagram budget. Flash 2.5 accepts
 * a zero thinking budget. Flash 3.8 rejects "minimal" and accepts "low".
 */
export function withGeminiDiagramBudget(
  model: string,
  baseFetch: typeof fetch = fetch
): typeof fetch {
  const thinkingConfig = /gemini-2\.5/.test(model)
    ? { thinkingBudget: 0 }
    : { thinkingLevel: 'low' as const };
  return (async (input, init) => {
    let nextInit = init;
    if (typeof init?.body === 'string') {
      try {
        const body = JSON.parse(init.body);
        body.generationConfig = {
          ...body.generationConfig,
          thinkingConfig: {
            ...thinkingConfig,
            ...body.generationConfig?.thinkingConfig,
          },
        };
        nextInit = { ...init, body: JSON.stringify(body) };
      } catch {
        // Not JSON: forward unchanged.
      }
    }
    return baseFetch(input, nextInit);
  }) as typeof fetch;
}

export function withGroqToolCompatibility(
  _model: string,
  baseFetch: typeof fetch = fetch
): typeof fetch {
  return (async (input, init) => {
    let nextInit = init;
    if (typeof init?.body === 'string') {
      try {
        const body = JSON.parse(init.body);
        if (Array.isArray(body.tools)) {
          body.tools = body.tools.map(relaxGroqTool);
          nextInit = { ...init, body: JSON.stringify(body) };
        }
      } catch {
        // Not JSON: forward unchanged.
      }
    }
    return fetchOnceAfterRateLimit(baseFetch, input, nextInit);
  }) as typeof fetch;
}

export function createNativeModel(
  mode: AiAssistantMode,
  options?: NativeModelOptions
): ReturnType<ReturnType<typeof createGroq>['languageModel']> {
  const requested = options?.model || getNativeModelForMode(mode);
  if (isGeminiModel(requested)) {
    const model = normalizeGeminiModelId(requested);
    const provider = createGoogle({
      apiKey: options?.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      fetch: withGeminiDiagramBudget(model, options?.fetch),
    });
    return provider.languageModel(model);
  }

  const model = normalizeGroqModelId(requested);
  const provider = createGroq({
    apiKey: options?.apiKey || process.env.GROQ_API_KEY,
    fetch: withGroqToolCompatibility(model, options?.fetch),
  });
  return provider.languageModel(model);
}
