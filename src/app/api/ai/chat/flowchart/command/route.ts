import { drawioDocumentSchema } from '@/lib/drawio/contracts';
import { commandHasVisibleShapes } from '@/lib/drawio/visible-command';
import {
  agentJson,
  hasValidAgentToken,
  unauthorizedAgentResponse,
} from '@/lib/mastra/agent-auth';
import {
  buildNativeCommand,
  nativeToolInputSchema,
} from '@/lib/mastra/drawio-agent';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** Gemini often sends null for omitted optional fields; treat them as absent. */
function stripNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNulls);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => [k, stripNulls(v)])
    );
  }
  return value;
}

export async function POST(request: Request): Promise<Response> {
  if (!hasValidAgentToken(request)) return unauthorizedAgentResponse();
  let body: { document?: unknown; input?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return agentJson({ error: true, message: 'Invalid JSON body' }, 400);
  }

  try {
    const document = drawioDocumentSchema.parse(body.document);
    const input = nativeToolInputSchema.parse(stripNulls(body.input));
    const command = await buildNativeCommand(document, input);
    return agentJson(
      {
        command,
        hasVisibleShapes: commandHasVisibleShapes(document, command),
      },
      200
    );
  } catch (error) {
    console.warn(
      '[flowchart-command] rejected:',
      error instanceof Error ? error.message.slice(0, 1500) : error
    );
    return agentJson(
      {
        error: true,
        message:
          error instanceof Error ? error.message : 'Tool execution failed',
      },
      400
    );
  }
}
