import {
  agentJson,
  hasValidAgentToken,
  unauthorizedAgentResponse,
} from '@/lib/mastra/agent-auth';
import { runDrawioSkillTool } from '@/lib/mastra/skill-runtime';

export const runtime = 'nodejs';

const SKILL_TOOLS = new Set(['skill', 'skill_read', 'skill_search']);

export async function POST(request: Request): Promise<Response> {
  if (!hasValidAgentToken(request)) return unauthorizedAgentResponse();
  let body: { name?: unknown; input?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return agentJson({ error: true, message: 'Invalid JSON body' }, 400);
  }
  const name = typeof body.name === 'string' ? body.name : '';
  if (!SKILL_TOOLS.has(name)) {
    return agentJson(
      { error: true, message: `Unknown skill tool ${name}` },
      400
    );
  }
  const input =
    body.input && typeof body.input === 'object'
      ? (body.input as Record<string, unknown>)
      : {};
  return agentJson({ content: runDrawioSkillTool(name, input) }, 200);
}
