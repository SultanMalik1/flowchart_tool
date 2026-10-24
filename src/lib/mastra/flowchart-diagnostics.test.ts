import { describe, expect, it, vi } from 'vitest';
import {
  classifyFlowchartError,
  extractSafeValidationIssues,
  logFlowchartDiagnostic,
  providerLimitMessage,
} from './flowchart-diagnostics';

describe('flowchart diagnostics', () => {
  it('classifies a provider token limit and keeps the wait time', () => {
    const message =
      'Rate limit reached for model openai/gpt-oss-120b on tokens per minute (TPM). Please try again in 27.2s.';
    expect(classifyFlowchartError(new Error(message))).toBe(
      'rate_limit_exceeded'
    );
    expect(providerLimitMessage(message)).toBe(
      'The AI provider is limiting requests for this model. Wait about 28 seconds, then try again.'
    );
  });

  it('classifies nested patch failures without exposing diagram data', () => {
    const error = new Error(
      'Error executing tool generate_flowchart: Node close_ticket does not exist',
      {
        cause: new Error('Node close_ticket does not exist'),
      }
    );

    expect(classifyFlowchartError(error)).toBe('semantic_entity_missing');
  });

  it('keeps only validation issue paths and codes', () => {
    const error = {
      name: 'AI_InvalidToolInputError',
      message: 'secret prompt and tool input',
      cause: {
        issues: [
          {
            code: 'invalid_type',
            path: ['patch', 'operations', 0, 'semanticId'],
            message: 'Expected a value containing close_ticket',
            received: 'close_ticket',
          },
        ],
      },
    };

    expect(extractSafeValidationIssues(error)).toEqual([
      {
        code: 'invalid_type',
        path: 'patch.operations.[number].semanticId',
      },
    ]);
  });

  it('writes a bounded structured record without raw errors or content', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    logFlowchartDiagnostic({
      requestId: 'request-1',
      stage: 'tool_validation',
      status: 'failed',
      code: 'invalid_tool_input',
      errorName: 'AI_InvalidToolInputError',
      validationIssues: [
        { code: 'invalid_type', path: 'patch.operations.[number].semanticId' },
      ],
      rawError: 'secret prompt',
    } as Parameters<typeof logFlowchartDiagnostic>[0] & {
      rawError: string;
    });

    const output = consoleError.mock.calls.flat().join(' ');
    expect(output).toContain('request-1');
    expect(output).toContain('invalid_tool_input');
    expect(output).toContain('patch.operations.[number].semanticId');
    expect(output).not.toContain('secret prompt');
    expect(output).not.toContain('close_ticket');

    consoleError.mockRestore();
  });
});
