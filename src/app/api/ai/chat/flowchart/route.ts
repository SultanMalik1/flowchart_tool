import { randomUUID } from 'node:crypto';
import type { AiAssistantMode } from '@/lib/ai-modes';
import { prepareDrawioCommand } from '@/lib/drawio/command';
import { drawioDocumentSchema } from '@/lib/drawio/contracts';
import { nativeModelSettings } from '@/lib/drawio/model-settings';
import { readNativeCells } from '@/lib/drawio/native-document';
import {
  createDrawioAgent,
  nativeAgentInstructions,
} from '@/lib/mastra/drawio-agent';
import {
  classifyFlowchartError,
  getSafeErrorName,
  logFlowchartDiagnostic,
} from '@/lib/mastra/flowchart-diagnostics';
import {
  createNativeModel,
  getNativeModelForMode,
} from '@/lib/mastra/native-model';
import { buildMastraRequestMessages } from '@/lib/mastra/request-builder';
import { createMastraStreamMapper } from '@/lib/mastra/stream-protocol';

export const runtime = 'nodejs';
export const maxDuration = 300;

const TEXT_MODE: AiAssistantMode = 'text_to_flowchart';
const IMAGE_MODE: AiAssistantMode = 'image_to_flowchart';

interface AgentRequestBody {
  messages: any[];
  aiContext?: Record<string, any>;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  requestId: string
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Flowchart-Request-Id': requestId,
    },
  });
}

function countImagesInLatestUserMessage(messages: any[]): number {
  const latestUser = [...messages]
    .reverse()
    .find((message) => message?.role === 'user');
  if (!Array.isArray(latestUser?.content)) return 0;
  return latestUser.content.filter(
    (part: any) =>
      part?.type === 'image_url' && typeof part.image_url?.url === 'string'
  ).length;
}

function extractLatestUserPrompt(messages: any[]): string {
  const latestUser = [...messages]
    .reverse()
    .find((message) => message?.role === 'user');
  const content = latestUser?.content;
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .filter((part: any) => part?.type === 'text')
    .map((part: any) => String(part.text || ''))
    .join('\n')
    .trim();
}

function getRequestedMode(
  messages: any[],
  aiContext: Record<string, any> | undefined
): AiAssistantMode {
  if (aiContext?.mode !== IMAGE_MODE) return TEXT_MODE;
  return countImagesInLatestUserMessage(messages) === 0
    ? TEXT_MODE
    : IMAGE_MODE;
}

function createAgentStreamResponse(
  output: { fullStream: AsyncIterable<any> },
  requestSignal: AbortSignal,
  requestId: string,
  startedAt: number,
  native = false,
  nativeDocument: any = null
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const mapper = createMastraStreamMapper({
        recoverToolErrors: native,
        nativeProgress: native,
        onDiagnostic: (event) =>
          logFlowchartDiagnostic({
            requestId,
            elapsedMs: Date.now() - startedAt,
            ...event,
          }),
      });
      const emit = (event: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      const resultEvents: any[] = [];
      let repairCount = 0;
      try {
        const eventCounts: Record<string, number> = {};
        for await (const chunk of output.fullStream) {
          if (
            native &&
            typeof chunk?.type === 'string' &&
            /^[a-z0-9_-]{1,48}$/i.test(chunk.type)
          ) {
            eventCounts[chunk.type] = (eventCounts[chunk.type] || 0) + 1;
            if (chunk.type === 'finish') {
              const usage =
                chunk.payload?.output?.usage || chunk.payload?.usage;
              console.info('[native-agent-result]', {
                requestId,
                eventCounts,
                reason: chunk.payload?.stepResult?.reason,
                inputTokens: usage?.inputTokens,
                outputTokens: usage?.outputTokens,
              });
            }
          }
          if (chunk?.type === 'tool-error') {
            repairCount++;
            if (repairCount > 2)
              throw new Error('Could not repair this diagram. Please retry.');
          }
          const event = mapper.map(chunk);
          if (event) {
            if (nativeDocument && (event as any).type === 'finish') {
              if (requestSignal.aborted)
                throw new DOMException('Request aborted', 'AbortError');
              const commandEvent = resultEvents.find(
                (e) => e.type === 'tool-call'
              );
              const prepared =
                commandEvent?.args.kind === 'drawio-command'
                  ? prepareDrawioCommand(nativeDocument, commandEvent.args)
                  : null;
              if (
                prepared &&
                commandEvent.args.operation !== 'patch' &&
                !readNativeCells(prepared).some(
                  (c) =>
                    c.parent &&
                    c.parent !== '0' &&
                    Number(c.geometry.width) > 0 &&
                    Number(c.geometry.height) > 0
                )
              )
                throw new Error(
                  'The diagram has no visible editable shapes. Please retry.'
                );
              const hasResult =
                commandEvent ||
                resultEvents.some(
                  (e) => e.type === 'text' && e.content?.trim()
                );
              if (!hasResult)
                throw new Error('AI task produced no usable result');
            }
            resultEvents.push(event);
            emit(event);
          }
          if (mapper.isTerminated()) break;
        }

        if (!mapper.isTerminated()) {
          if (requestSignal.aborted) {
            const aborted = mapper.map({ type: 'abort', payload: {} });
            if (aborted) emit(aborted);
          } else {
            logFlowchartDiagnostic({
              requestId,
              stage: 'sse_map',
              status: 'stream_incomplete',
              code: 'stream_incomplete',
              elapsedMs: Date.now() - startedAt,
            });
            emit({
              type: 'error',
              error: 'Agent stream ended before a final event.',
            });
          }
        }
      } catch (error) {
        if (requestSignal.aborted) {
          const aborted = mapper.map({ type: 'abort', payload: {} });
          if (aborted) emit(aborted);
        } else {
          logFlowchartDiagnostic({
            requestId,
            stage: 'sse_map',
            status: 'failed',
            code: 'stream_exception',
            errorName: getSafeErrorName(error),
            elapsedMs: Date.now() - startedAt,
          });
          emit({
            type: 'error',
            error:
              error instanceof Error ? error.message : 'Agent stream failed.',
          });
        }
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Flowchart-Request-Id': requestId,
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  const requestId = randomUUID();
  const startedAt = Date.now();
  let body: AgentRequestBody;
  try {
    body = (await request.json()) as AgentRequestBody;
  } catch {
    logFlowchartDiagnostic({
      requestId,
      stage: 'request',
      status: 'failed',
      code: 'invalid_json',
      elapsedMs: Date.now() - startedAt,
    });
    return jsonResponse({ error: 'Invalid JSON body' }, 400, requestId);
  }

  if (!Array.isArray(body.messages)) {
    logFlowchartDiagnostic({
      requestId,
      stage: 'request',
      status: 'failed',
      code: 'invalid_messages',
      elapsedMs: Date.now() - startedAt,
    });
    return jsonResponse({ error: 'Invalid messages format' }, 400, requestId);
  }

  const imageCount = countImagesInLatestUserMessage(body.messages);
  const requestedMode = getRequestedMode(body.messages, body.aiContext);
  const targetStatus = body.aiContext?.targetResolution?.status;
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
  if (body.aiContext?.mode === IMAGE_MODE && imageCount > 1) {
    logFlowchartDiagnostic({
      requestId,
      stage: 'request',
      status: 'failed',
      code: 'too_many_images',
      mode: requestedMode,
      imageCount,
      elapsedMs: Date.now() - startedAt,
    });
    return jsonResponse(
      { error: 'Only one image is supported for image_to_flowchart mode' },
      400,
      requestId
    );
  }

  const latestUserPrompt = extractLatestUserPrompt(body.messages);

  try {
    if (
      body.aiContext?.editorKind !== 'drawio' ||
      !body.aiContext.nativeDocument
    ) {
      return jsonResponse(
        {
          error: 'drawio_document_required',
          message: 'The current draw.io document is required.',
        },
        400,
        requestId
      );
    }
    const nativeDocument = drawioDocumentSchema.parse(
      body.aiContext.nativeDocument
    );
    const nativeSelection: string[] = Array.isArray(
      body.aiContext?.nativeSelection
    )
      ? body.aiContext.nativeSelection.filter(
          (id: unknown): id is string => typeof id === 'string'
        )
      : [];
    const agent = createDrawioAgent(
      nativeDocument,
      nativeSelection,
      latestUserPrompt
    );
    const agentMessages = buildMastraRequestMessages({
      mode: requestedMode,
      messages: body.messages,
      requestedMode: body.aiContext?.requestedMode,
    });
    const modelId = getNativeModelForMode(requestedMode);
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return jsonResponse(
        {
          error: 'missing_api_key',
          message:
            'GOOGLE_GENERATIVE_AI_API_KEY is not set. Add it to .env.local and restart the dev server.',
        },
        500,
        requestId
      );
    }
    const model = createNativeModel(requestedMode, { model: modelId });

    logFlowchartDiagnostic({
      requestId,
      stage: 'agent',
      status: 'started',
      code: 'agent_invoked',
      mode: requestedMode,
      elapsedMs: Date.now() - startedAt,
    });
    const output = await agent.stream(agentMessages as any, {
      model: model as any,
      instructions: nativeAgentInstructions(
        nativeDocument,
        nativeSelection,
        latestUserPrompt
      ),
      maxSteps: 5,
      toolChoice: 'auto',
      abortSignal: request.signal,
      modelSettings: nativeModelSettings(modelId),
    });

    return createAgentStreamResponse(
      output,
      request.signal,
      requestId,
      startedAt,
      true,
      nativeDocument
    );
  } catch (error) {
    logFlowchartDiagnostic({
      requestId,
      stage: 'agent',
      status: 'failed',
      code: classifyFlowchartError(error),
      errorName: getSafeErrorName(error),
      elapsedMs: Date.now() - startedAt,
    });
    return jsonResponse(
      {
        error: 'Internal server error',
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      },
      500,
      requestId
    );
  }
}
