/**
 * Gemini model adapter for native tool execution.
 * Every flowchart model id is sent to Google.
 */
import { createGoogle } from '@ai-sdk/google';
import { getFlowchartModelForMode } from '../ai-models';
import type { AiAssistantMode } from '../ai-modes';

type NativeModelOptions = {
  apiKey?: string;
  fetch?: typeof fetch;
  model?: string;
};

/** Gemini model ids such as `gemini-flash-latest` or `google/gemini-2.5-flash`. */
export function isGeminiModel(model: string): boolean {
  const id = model
    .trim()
    .toLowerCase()
    .replace(/^(google|gemini)\//, '');
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

/**
 * Keep Gemini's thinking tokens out of the diagram budget. Flash 2.5 accepts
 * a zero thinking budget. Later Flash models accept "low".
 */
export function geminiThinkingConfig(
  model: string
): { thinkingBudget: 0 } | { thinkingLevel: 'low' } {
  return /gemini-2\.5/.test(model)
    ? { thinkingBudget: 0 }
    : { thinkingLevel: 'low' };
}

export function withGeminiDiagramBudget(
  model: string,
  baseFetch: typeof fetch = fetch
): typeof fetch {
  const thinkingConfig = geminiThinkingConfig(model);
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

export function createNativeModel(
  mode: AiAssistantMode,
  options?: NativeModelOptions
): ReturnType<ReturnType<typeof createGoogle>['languageModel']> {
  const requested = options?.model || getNativeModelForMode(mode);
  if (!isGeminiModel(requested)) {
    throw new Error(
      `Only Gemini models are supported. Received "${requested}".`
    );
  }
  const model = normalizeGeminiModelId(requested);
  const provider = createGoogle({
    apiKey: options?.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    fetch: withGeminiDiagramBudget(model, options?.fetch),
  });
  return provider.languageModel(model);
}
