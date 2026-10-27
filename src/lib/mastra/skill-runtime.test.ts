import { expect, it } from 'vitest';
import { runDrawioSkillTool } from './skill-runtime';

it('returns the same style reference Mastra feeds back after skill_read', () => {
  const content = runDrawioSkillTool('skill_read', {
    skillName: 'drawio-native',
    path: 'references/styles.md',
  });
  expect(content).toContain('Patch style changes are a map');
});

it('activates drawio-native with the bundled reference list', () => {
  const content = runDrawioSkillTool('skill', { name: 'drawio-native' });
  expect(content).toContain('references/complex-flow.md');
  expect(content).toContain('CURRENT DOCUMENT is the only authority');
});
