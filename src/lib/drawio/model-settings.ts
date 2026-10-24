/** Maximum completion tokens per model family. */
function maxOutputTokensFor(model: string): number {
  // llama-4-scout caps completions at 8192 tokens; gpt-oss allows far more.
  if (/llama-4-scout/.test(model)) return 8192;
  // Gemini Flash can emit a dense diagram without spending the cap on thoughts.
  if (/gemini|gemma/.test(model)) return 32768;
  return 16000;
}

/** Budget for native graph output plus reasoning; reasoning stays private. */
export function nativeModelSettings(model: string): {
  temperature: number;
  maxOutputTokens: number;
  maxRetries: number;
} {
  return {
    temperature: 0.35,
    maxOutputTokens: maxOutputTokensFor(model),
    maxRetries: 1,
  };
}
