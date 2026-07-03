/**
 * Published per-1M-token USD rates. Sonnet 5 intro pricing is valid through
 * 2026-08-31 — update if it reverts to standard ($3/$15) after that date.
 */
export const CLAUDE_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 2.0, output: 10.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
};

/** gpt-image-1 published per-1M-token rates. */
export const OPENAI_IMAGE_PRICING = {
  textInput: 5.0,
  imageInput: 10.0,
  imageOutput: 40.0,
};

export function claudeCost(
  model: string,
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
  },
): number {
  const p = CLAUDE_PRICING[model];
  if (!p) return 0;
  const base = usage.input_tokens * p.input + usage.output_tokens * p.output;
  const cacheRead = (usage.cache_read_input_tokens ?? 0) * p.input * 0.1;
  const cacheWrite = (usage.cache_creation_input_tokens ?? 0) * p.input * 1.25;
  return (base + cacheRead + cacheWrite) / 1_000_000;
}

export function imageCost(usage?: {
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: { text_tokens?: number; image_tokens?: number };
}): number {
  if (!usage) return 0;
  const textIn = usage.input_tokens_details?.text_tokens ?? 0;
  const imgIn = usage.input_tokens_details?.image_tokens ?? 0;
  const imgOut = usage.output_tokens ?? 0;
  return (
    (textIn * OPENAI_IMAGE_PRICING.textInput +
      imgIn * OPENAI_IMAGE_PRICING.imageInput +
      imgOut * OPENAI_IMAGE_PRICING.imageOutput) /
    1_000_000
  );
}
