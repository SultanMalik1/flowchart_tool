import { randomUUID } from 'node:crypto';
import { commandHasVisibleShapes } from '@/lib/drawio/visible-command';
import {
  type AgentRequestBody,
  prepareNativeChat,
} from '@/lib/mastra/chat-prepare';
import { createDrawioAgent } from '@/lib/mastra/drawio-agent';
import {
  classifyFlowchartError,
  getSafeErrorName,
  logFlowchartDiagnostic,
} from '@/lib/mastra/flowchart-diagnostics';
import { createNativeModel } from '@/lib/mastra/native-model';
import { createMastraStreamMapper } from '@/lib/mastra/stream-protocol';

export const runtime = 'nodejs';
export const maxDuration = 300;

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
              if (
                commandEvent?.args.kind === 'drawio-command' &&
                !commandHasVisibleShapes(nativeDocument, commandEvent.args)
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

  try {
    const prepared = prepareNativeChat(body, requestId, startedAt);
    if (!prepared.ok) {
      return jsonResponse(prepared.body, prepared.status, requestId);
    }
    const agent = createDrawioAgent(
      prepared.nativeDocument,
      prepared.nativeSelection,
      prepared.latestUserPrompt
    );
    const model = createNativeModel(prepared.mode, { model: prepared.modelId });

    logFlowchartDiagnostic({
      requestId,
      stage: 'agent',
      status: 'started',
      code: 'agent_invoked',
      mode: prepared.mode,
      elapsedMs: Date.now() - startedAt,
    });
    const output = await agent.stream(prepared.messages as any, {
      model: model as any,
      instructions: prepared.instructions,
      maxSteps: 5,
      toolChoice: 'auto',
      abortSignal: request.signal,
      modelSettings: prepared.modelSettings,
    });

    return createAgentStreamResponse(
      output,
      request.signal,
      requestId,
      startedAt,
      true,
      prepared.nativeDocument
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
