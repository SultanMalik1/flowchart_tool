import { expect, it } from 'vitest';
import { nativeModelSettings } from './model-settings';

it('reserves a Gemini completion budget for diagram XML', () => {
  expect(nativeModelSettings('gemini-flash-latest').maxOutputTokens).toBe(
    32768
  );
  expect(nativeModelSettings('gemini-2.5-flash').maxOutputTokens).toBe(32768);
});
