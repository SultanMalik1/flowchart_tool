/** Gemini Flash completion budget. Thinking tokens are limited separately. */
function maxOutputTokensFor(): number {
  return 32768;
}

/** Budget for native graph output plus reasoning; reasoning stays private. */
export function nativeModelSettings(_model: string): {
  temperature: number;
  maxOutputTokens: number;
  maxRetries: number;
} {
  return {
    temperature: 0.35,
    maxOutputTokens: maxOutputTokensFor(),
    maxRetries: 1,
  };
}
