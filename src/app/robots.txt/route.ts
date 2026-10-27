import { getBaseUrl } from '../../lib/urls/urls';
import { buildRobotsTxt } from './robots';

const marketingAllows = ['Allow: /'];

const userAreas = [
  'Disallow: /api/',
  'Disallow: /_next/',
  'Disallow: /static/',
  'Disallow: /404',
  'Disallow: /500',
  'Disallow: /*.json$',
  'Disallow: /auth/',
  'Disallow: /settings/',
  'Disallow: /dashboard/',
  'Disallow: /admin/',
  'Disallow: /canvas/',
];

const aiAgents = [
  'GPTBot',
  'Claude-Web',
  'Anthropic-AI',
  'PerplexityBot',
  'GoogleOther',
  'DuckAssistBot',
];

export function GET(): Response {
  const baseUrl = getBaseUrl().replace(/\/$/, '');
  const body = buildRobotsTxt(baseUrl, marketingAllows, userAreas, aiAgents);

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
