/** Shared secret for the TypeScript endpoints the Python agent calls. */
export function flowchartAgentToken(): string {
  const configured = process.env.FLOWCHART_AGENT_TOKEN?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') return '';
  return 'dev-flowchart-agent';
}

export function hasValidAgentToken(request: Request): boolean {
  const token = flowchartAgentToken();
  if (!token) return false;
  return request.headers.get('x-flowchart-agent-token') === token;
}

export function agentJson(
  body: Record<string, unknown>,
  status: number,
  requestId?: string
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(requestId ? { 'X-Flowchart-Request-Id': requestId } : {}),
    },
  });
}

export function unauthorizedAgentResponse(): Response {
  return agentJson(
    {
      error: 'unauthorized',
      message: 'Agent token is not valid.',
    },
    401
  );
}
