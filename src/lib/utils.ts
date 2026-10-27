import type { AiAssistantMode } from '@/lib/ai-modes';
import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StartFlowchartSessionParams {
  mode: AiAssistantMode;
  prompt?: string;
  imagePayload?: {
    base64: string;
    thumbnail?: string;
    filename?: string;
  };
  router: {
    push: (href: string) => void;
  };
}

/**
 * Prepare localStorage + navigation so the canvas can auto-generate from the sidebar.
 */
export async function startFlowchartSession({
  mode,
  prompt,
  imagePayload,
  router,
}: StartFlowchartSessionParams) {
  if (typeof window === 'undefined') return;

  localStorage.setItem('flowchart_auto_generate', 'true');
  localStorage.setItem('flowchart_auto_mode', mode);

  if (prompt) {
    localStorage.setItem('flowchart_auto_input', prompt);
  } else {
    localStorage.removeItem('flowchart_auto_input');
  }

  if (imagePayload) {
    localStorage.setItem('flowchart_auto_image', JSON.stringify(imagePayload));
  } else {
    localStorage.removeItem('flowchart_auto_image');
  }

  router.push('/canvas');
}
