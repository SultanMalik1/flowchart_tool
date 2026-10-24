import type { AiAssistantMode } from '@/lib/ai-modes';

/**
 * Default Groq models. Override with the optional FLOWCHART_TEXT_MODEL /
 * FLOWCHART_IMAGE_MODEL environment variables (any Groq model id).
 *
 * - Text uses a tool-calling model.
 * - Image needs a vision model. Llama 4 Scout was removed from Groq on
 *   2026-07-17; Qwen 3.8 27B is the free-tier replacement that accepts images.
 */
export const TEXT_TO_FLOWCHART_MODEL = 'openai/gpt-oss-120b';
export const IMAGE_TO_FLOWCHART_MODEL = 'qwen/qwen3.8-27b';

export function getFlowchartModelForMode(mode: AiAssistantMode): string {
  if (mode === 'image_to_flowchart') {
    return process.env.FLOWCHART_IMAGE_MODEL || IMAGE_TO_FLOWCHART_MODEL;
  }

  return process.env.FLOWCHART_TEXT_MODEL || TEXT_TO_FLOWCHART_MODEL;
}
