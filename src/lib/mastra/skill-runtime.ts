/**
 * Same skill, skill_read and skill_search results Mastra returns for drawio-native.
 * The Python agent calls these instead of registering a second copy of the guides.
 */
import {
  DRAWIO_SKILL_NAME,
  drawioReferences,
  drawioSkillInstructions,
} from './drawio-knowledge';

const referenceNames = Object.keys(drawioReferences);

function activationText(): string {
  const listing = referenceNames
    .map((name) => `- references/${name}`)
    .join('\n');
  return `${drawioSkillInstructions}\n\n## References\n${listing}`;
}

function availableFiles(): string {
  return referenceNames.map((name) => `references/${name}`).join(', ');
}

function referenceBody(path: string): string | null {
  const name = path.replace(/^references\//, '');
  if (!Object.hasOwn(drawioReferences, name)) return null;
  return drawioReferences[name as keyof typeof drawioReferences];
}

function extractLines(
  content: string,
  startLine?: number,
  endLine?: number
): string {
  if (startLine == null && endLine == null) return content;
  const lines = content.split('\n');
  const start = Math.max((startLine ?? 1) - 1, 0);
  const end = endLine == null ? lines.length : endLine;
  return lines.slice(start, end).join('\n');
}

function skillSearch(input: {
  query?: string;
  skillNames?: string[];
  topK?: number;
}): string {
  const query = String(input.query || '').trim();
  if (!query) return 'No results found.';
  if (
    Array.isArray(input.skillNames) &&
    input.skillNames.length > 0 &&
    !input.skillNames.includes(DRAWIO_SKILL_NAME)
  ) {
    return 'No results found.';
  }
  const limit = input.topK && input.topK > 0 ? input.topK : 5;
  const needle = query.toLowerCase();
  const hits = referenceNames.flatMap((name) => {
    const content = drawioReferences[name as keyof typeof drawioReferences];
    const index = content.toLowerCase().indexOf(needle);
    if (index < 0) return [];
    const preview = content.substring(index, index + 200);
    return [
      `[${DRAWIO_SKILL_NAME}] references/${name}\n${preview}${content.length > index + 200 ? '...' : ''}`,
    ];
  });
  if (hits.length === 0) return 'No results found.';
  return hits.slice(0, limit).join('\n\n');
}

export function runDrawioSkillTool(
  toolName: string,
  input: Record<string, unknown>
): string {
  if (toolName === 'skill') {
    const name = String(input.name || '');
    if (name !== DRAWIO_SKILL_NAME) {
      return `Skill "${name}" not found. Available skills: ${DRAWIO_SKILL_NAME} (${DRAWIO_SKILL_NAME})`;
    }
    return activationText();
  }

  if (toolName === 'skill_read') {
    const skillName = String(input.skillName || '');
    const path = String(input.path || '');
    if (skillName !== DRAWIO_SKILL_NAME) {
      return `Skill "${skillName}" not found. Available skills: ${DRAWIO_SKILL_NAME} (${DRAWIO_SKILL_NAME})`;
    }
    const content = referenceBody(path);
    if (content == null) {
      return `File "${path}" not found in skill "${skillName}".\nAvailable files: ${availableFiles()}`;
    }
    return extractLines(
      content,
      typeof input.startLine === 'number' ? input.startLine : undefined,
      typeof input.endLine === 'number' ? input.endLine : undefined
    );
  }

  if (toolName === 'skill_search') {
    return skillSearch({
      query: typeof input.query === 'string' ? input.query : '',
      skillNames: Array.isArray(input.skillNames)
        ? input.skillNames.filter((name) => typeof name === 'string')
        : undefined,
      topK: typeof input.topK === 'number' ? input.topK : undefined,
    });
  }

  return `Unknown skill tool ${toolName}`;
}
