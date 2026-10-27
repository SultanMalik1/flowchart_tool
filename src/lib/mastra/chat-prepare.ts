import type { AiAssistantMode } from '@/lib/ai-modes';
import { drawioDocumentSchema } from '@/lib/drawio/contracts';
import type { DrawioDocument } from '@/lib/drawio/contracts';
import { nativeModelSettings } from '@/lib/drawio/model-settings';
import { nativeAgentInstructions } from '@/lib/mastra/drawio-agent';
import { logFlowchartDiagnostic } from '@/lib/mastra/flowchart-diagnostics';
import {
  geminiThinkingConfig,
  getNativeModelForMode,
  isGeminiModel,
  normalizeGeminiModelId,
} from '@/lib/mastra/native-model';
import { buildMastraRequestMessages } from '@/lib/mastra/request-builder';
import { flowchartToolSpecs } from '@/lib/mastra/tool-json-schema';

const TEXT_MODE: AiAssistantMode = 'text_to_flowchart';
const IMAGE_MODE: AiAssistantMode = 'image_to_flowchart';

export interface AgentRequestBody {
  messages: unknown;
  aiContext?: Record<string, unknown>;
}

export interface PreparedNativeChat {
  ok: true;
  requestId: string;
  mode: AiAssistantMode;
  modelId: string;
  instructions: string;
  messages: string | Array<Record<string, unknown>>;
  thinking: { thinkingBudget: 0 } | { thinkingLevel: 'low' };
  modelSettings: {
    temperature: number;
    maxOutputTokens: number;
    maxRetries: number;
  };
  tools: ReturnType<typeof flowchartToolSpecs>;
  nativeDocument: DrawioDocument;
  nativeSelection: string[];
  latestUserPrompt: string;
}

export interface RejectedNativeChat {
  ok: false;
  status: number;
  body: Record<string, unknown>;
}

function countImagesInLatestUserMessage(messages: unknown[]): number {
  const latestUser = [...messages]
    .reverse()
    .find(
      (message) =>
        !!message &&
        typeof message === 'object' &&
        (message as { role?: string }).role === 'user'
    ) as { content?: unknown } | undefined;
  if (!Array.isArray(latestUser?.content)) return 0;
  return latestUser.content.filter(
    (part: { type?: string; image_url?: { url?: unknown } }) =>
      part?.type === 'image_url' && typeof part.image_url?.url === 'string'
  ).length;
}

function extractLatestUserPrompt(messages: unknown[]): string {
  const latestUser = [...messages]
    .reverse()
    .find(
      (message) =>
        !!message &&
        typeof message === 'object' &&
        (message as { role?: string }).role === 'user'
    ) as { content?: unknown } | undefined;
  const content = latestUser?.content;
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .filter((part: { type?: string }) => part?.type === 'text')
    .map((part: { text?: string }) => String(part.text || ''))
    .join('\n')
    .trim();
}

function getRequestedMode(
  messages: unknown[],
  aiContext: Record<string, unknown> | undefined
): AiAssistantMode {
  if (aiContext?.mode !== IMAGE_MODE) return TEXT_MODE;
  return countImagesInLatestUserMessage(messages) === 0
    ? TEXT_MODE
    : IMAGE_MODE;
}

export function prepareNativeChat(
  body: AgentRequestBody,
  requestId: string,
  startedAt: number
): PreparedNativeChat | RejectedNativeChat {
  if (!Array.isArray(body.messages)) {
    logFlowchartDiagnostic({
      requestId,
      stage: 'request',
      status: 'failed',
      code: 'invalid_messages',
      elapsedMs: Date.now() - startedAt,
    });
    return {
      ok: false,
      status: 400,
      body: { error: 'Invalid messages format' },
    };
  }

  const aiContext = body.aiContext;
  const imageCount = countImagesInLatestUserMessage(body.messages);
  const requestedMode = getRequestedMode(body.messages, aiContext);
  const targetStatus = (
    aiContext?.targetResolution as { status?: string } | undefined
  )?.status;
  logFlowchartDiagnostic({
    requestId,
    stage: 'request',
    status: 'started',
    code: 'request_received',
    mode: requestedMode,
    targetStatus:
      targetStatus === 'none' ||
      targetStatus === 'resolved' ||
      targetStatus === 'ambiguous'
        ? targetStatus
        : undefined,
    messageCount: body.messages.length,
    imageCount,
    elapsedMs: Date.now() - startedAt,
  });
  if (aiContext?.mode === IMAGE_MODE && imageCount > 1) {
    logFlowchartDiagnostic({
      requestId,
      stage: 'request',
      status: 'failed',
      code: 'too_many_images',
      mode: requestedMode,
      imageCount,
      elapsedMs: Date.now() - startedAt,
    });
    return {
      ok: false,
      status: 400,
      body: {
        error: 'Only one image is supported for image_to_flowchart mode',
      },
    };
  }

  if (aiContext?.editorKind !== 'drawio' || !aiContext.nativeDocument) {
    return {
      ok: false,
      status: 400,
      body: {
        error: 'drawio_document_required',
        message: 'The current draw.io document is required.',
      },
    };
  }

  const nativeDocument = drawioDocumentSchema.parse(aiContext.nativeDocument);

  const nativeSelection: string[] = Array.isArray(aiContext.nativeSelection)
    ? aiContext.nativeSelection.filter(
        (id: unknown): id is string => typeof id === 'string'
      )
    : [];
  const latestUserPrompt = extractLatestUserPrompt(body.messages);
  const messages = buildMastraRequestMessages({
    mode: requestedMode,
    messages: body.messages as Array<{
      role?: string;
      content?: unknown;
      tool_calls?: unknown;
    }>,
    requestedMode:
      typeof aiContext.requestedMode === 'string'
        ? aiContext.requestedMode
        : undefined,
  });

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return {
      ok: false,
      status: 500,
      body: {
        error: 'missing_api_key',
        message:
          'GOOGLE_GENERATIVE_AI_API_KEY is not set. Add it to .env.local and restart the dev server.',
      },
    };
  }

  const modelId = getNativeModelForMode(requestedMode);
  if (!isGeminiModel(modelId)) {
    return {
      ok: false,
      status: 500,
      body: {
        error: 'Internal server error',
        message: `Only Gemini models are supported. Received "${modelId}".`,
      },
    };
  }
  const normalizedModelId = normalizeGeminiModelId(modelId);

  return {
    ok: true,
    requestId,
    mode: requestedMode,
    modelId: normalizedModelId,
    instructions: nativeAgentInstructions(
      nativeDocument,
      nativeSelection,
      latestUserPrompt
    ),
    messages,
    thinking: geminiThinkingConfig(normalizedModelId),
    modelSettings: nativeModelSettings(normalizedModelId),
    tools: flowchartToolSpecs(),
    nativeDocument,
    nativeSelection,
    latestUserPrompt,
  };
}
