import { expect, it } from 'vitest';
import { nativeModelSettings } from './model-settings';

it('reserves visible XML budget within each Groq model completion limit', () => {
  expect(nativeModelSettings('openai/gpt-oss-120b').maxOutputTokens).toBe(
    16000
  );
  expect(
    nativeModelSettings('meta-llama/llama-4-scout-17b-16e-instruct')
      .maxOutputTokens
  ).toBe(8192);
  expect(nativeModelSettings('gemini-3.8-flash').maxOutputTokens).toBe(32768);
});
