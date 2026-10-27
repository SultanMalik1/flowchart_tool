/** JSON schemas for the tools the Python agent binds. Zod remains the validator. */
const stringMap = {
  type: 'object',
  additionalProperties: { type: 'string' },
} as const;

const point = {
  type: 'object',
  additionalProperties: false,
  properties: {
    x: { type: 'number' },
    y: { type: 'number' },
  },
  required: ['x', 'y'],
} as const;

const graphNode = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
    label: { type: 'string' },
    parent: { type: 'string' },
    shape: {
      type: 'string',
      enum: [
        'process',
        'decision',
        'terminator',
        'group',
        'parallel',
        'ellipse',
        'text',
        'database',
        'actor',
      ],
      default: 'process',
    },
    x: { type: 'number' },
    y: { type: 'number' },
    width: { type: 'number' },
    height: { type: 'number' },
    style: stringMap,
  },
  required: ['id', 'label'],
} as const;

const graphEdge = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
    source: { type: 'string', minLength: 1 },
    target: { type: 'string', minLength: 1 },
    label: { type: 'string', default: '' },
    style: stringMap,
    points: { type: 'array', items: point },
  },
  required: ['id', 'source', 'target'],
} as const;

const patchOperation = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { const: 'addCell' },
        xml: { type: 'string', minLength: 1 },
      },
      required: ['type', 'xml'],
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { const: 'updateCell' },
        id: { type: 'string', minLength: 1 },
        changes: {
          type: 'object',
          additionalProperties: false,
          properties: {
            value: { type: 'string' },
            style: stringMap,
            removeStyleKeys: { type: 'array', items: { type: 'string' } },
            geometry: {
              type: 'object',
              additionalProperties: false,
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' },
              },
            },
            parent: { type: 'string', minLength: 1 },
            source: { type: 'string', minLength: 1 },
            target: { type: 'string', minLength: 1 },
            points: { type: 'array', items: point },
          },
        },
      },
      required: ['type', 'id', 'changes'],
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { const: 'removeCell' },
        id: { type: 'string', minLength: 1 },
      },
      required: ['type', 'id'],
    },
  ],
} as const;

export interface AgentToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export function flowchartToolSpecs(): AgentToolSpec[] {
  return [
    {
      name: 'generate_flowchart',
      description:
        'Create a native diagram or apply an atomic field-level patch to the current native diagram.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          action: { type: 'string', enum: ['create', 'patch', 'replace'] },
          diagramType: { type: 'string', minLength: 1 },
          patch: {
            type: 'object',
            additionalProperties: false,
            properties: {
              baseRevision: { type: 'integer', minimum: 0 },
              operations: {
                type: 'array',
                minItems: 1,
                items: patchOperation,
              },
            },
            required: ['baseRevision', 'operations'],
          },
          graph: {
            type: 'object',
            additionalProperties: false,
            properties: {
              nodes: { type: 'array', minItems: 1, items: graphNode },
              edges: { type: 'array', items: graphEdge },
            },
            required: ['nodes', 'edges'],
          },
          retryPolicy: {
            type: 'object',
            additionalProperties: false,
            description:
              'Local patch shortcut for setting a maximum retry count on an existing loop. Preserves other branches; avoids writing counter XML manually.',
            properties: {
              actionId: { type: 'string' },
              retryStepId: { type: 'string' },
              eligibilityId: { type: 'string' },
              manualHandlerId: { type: 'string' },
              maxRetries: { type: 'integer', minimum: 1 },
            },
            required: [
              'actionId',
              'retryStepId',
              'eligibilityId',
              'manualHandlerId',
              'maxRetries',
            ],
          },
          description: { type: 'string', minLength: 1 },
          title: {
            type: 'string',
            description:
              'A short descriptive title for the whole diagram, in English.',
          },
        },
        required: ['action', 'diagramType', 'description'],
      },
    },
    {
      name: 'skill',
      description:
        "Activate a skill to load its full instructions. You should activate skills proactively when they are relevant to the user's request without asking for permission first.",
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
            description:
              'The name or path of the skill to activate. Use the path when multiple skills share the same name.',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'skill_read',
      description:
        'Read a file from a skill directory (references, scripts, or assets). The path is relative to the skill root.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          skillName: {
            type: 'string',
            description:
              'The name or path of the skill. Use the path when multiple skills share the same name.',
          },
          path: {
            type: 'string',
            description:
              'Path to the file relative to the skill root (e.g. "references/colors.md", "scripts/run.sh")',
          },
          startLine: {
            type: 'number',
            description:
              'Starting line number (1-indexed). If omitted, starts from the beginning.',
          },
          endLine: {
            type: 'number',
            description:
              'Ending line number (1-indexed, inclusive). If omitted, reads to the end.',
          },
        },
        required: ['skillName', 'path'],
      },
    },
    {
      name: 'skill_search',
      description:
        'Search across skill content to find relevant information. Useful when you need to find specific details within skills.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string', description: 'The search query' },
          skillNames: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional list of skill names to search within',
          },
          topK: {
            type: 'number',
            description: 'Maximum number of results to return (default: 5)',
          },
        },
        required: ['query'],
      },
    },
  ];
}
