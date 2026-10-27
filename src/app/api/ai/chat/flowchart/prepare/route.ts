import { randomUUID } from 'node:crypto';
import {
  agentJson,
  hasValidAgentToken,
  unauthorizedAgentResponse,
} from '@/lib/mastra/agent-auth';
import { prepareNativeChat } from '@/lib/mastra/chat-prepare';
import {
  classifyFlowchartError,
  getSafeErrorName,
  logFlowchartDiagnostic,
} from '@/lib/mastra/flowchart-diagnostics';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  if (!hasValidAgentToken(request)) return unauthorizedAgentResponse();
  const requestId = randomUUID();
  const startedAt = Date.now();
  let body: { messages?: unknown; aiContext?: Record<string, unknown> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    logFlowchartDiagnostic({
      requestId,
      stage: 'request',
      status: 'failed',
      code: 'invalid_json',
      elapsedMs: Date.now() - startedAt,
    });
    return agentJson({ error: 'Invalid JSON body' }, 400, requestId);
  }

  try {
    const prepared = prepareNativeChat(
      { messages: body.messages, aiContext: body.aiContext },
      requestId,
      startedAt
    );
    if (!prepared.ok) {
      return agentJson(prepared.body, prepared.status, requestId);
    }
    return agentJson(
      {
        requestId: prepared.requestId,
        mode: prepared.mode,
        modelId: prepared.modelId,
        instructions: prepared.instructions,
        messages: prepared.messages,
        thinking: prepared.thinking,
        modelSettings: prepared.modelSettings,
        tools: prepared.tools,
        nativeDocument: prepared.nativeDocument,
      },
      200,
      requestId
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
    return agentJson(
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
