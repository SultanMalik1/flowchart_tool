import { describe, expect, it } from 'vitest';
import { automaticDiagramTitle } from './diagram-title';

describe('automatic diagram names', () => {
  it('names an unnamed diagram and normalizes model whitespace', () => {
    expect(
      automaticDiagramTitle(
        'Untitled',
        '  Refund approval\nflowchart  ',
        'create',
        false
      )
    ).toBe('Refund approval flowchart');
    expect(
      automaticDiagramTitle(
        'Untitled',
        'Refund approval flowchart',
        'patch',
        false
      )
    ).toBe('Refund approval flowchart');
    expect(
      automaticDiagramTitle('Untitled', 'Untitled', 'create', false)
    ).toBeNull();
  });
  it('keeps a user name even during a rebuild or when the user clears it', () => {
    expect(
      automaticDiagramTitle(
        'Finance approval V2',
        'Refund flow',
        'replace',
        true
      )
    ).toBeNull();
    expect(automaticDiagramTitle('', 'Refund flow', 'create', true)).toBeNull();
  });
  it('keeps an automatic name for local edits and can rename a full rebuild', () => {
    expect(
      automaticDiagramTitle('Refund flow', 'Approval flow', 'patch', false)
    ).toBeNull();
    expect(
      automaticDiagramTitle(
        'Refund flow',
        'Service architecture',
        'replace',
        false
      )
    ).toBe('Service architecture');
  });
});
