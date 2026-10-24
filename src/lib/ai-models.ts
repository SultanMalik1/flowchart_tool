import type { AiAssistantMode } from '@/lib/ai-modes';

/**
 * Default Gemini models. Override with FLOWCHART_TEXT_MODEL or
 * FLOWCHART_IMAGE_MODEL (a Gemini model id). Image mode needs a vision model.
 */
export const TEXT_TO_FLOWCHART_MODEL = 'gemini-flash-latest';
export const IMAGE_TO_FLOWCHART_MODEL = 'gemini-flash-latest';

export function getFlowchartModelForMode(mode: AiAssistantMode): string {
  if (mode === 'image_to_flowchart') {
    return process.env.FLOWCHART_IMAGE_MODEL || IMAGE_TO_FLOWCHART_MODEL;
  }

  return process.env.FLOWCHART_TEXT_MODEL || TEXT_TO_FLOWCHART_MODEL;
}
