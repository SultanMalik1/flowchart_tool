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
 * Prepare localStorage + navigation so canvas auto-generates via AI sidebar.
 * Pre-creates a flowchart via `/api/flowcharts` and opens it in the editor.
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

  try {
    const response = await fetch('/api/flowcharts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error('Failed to pre-create flowchart');
    }

    const data = (await response.json()) as { id: string };
    router.push(`/canvas/${data.id}`);
    return;
  } catch (error) {
    console.error('startFlowchartSession: pre-create failed', error);
  }

  router.push('/canvas');
}
