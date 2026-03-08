/**
 * Models available on the Euron free tier.
 * Source: https://euron.one/euri
 *
 * All other models are considered paid.
 */
export const FREE_MODEL_IDS = new Set<string>([
  // OpenAI — free tier
  "gpt-4o-mini",
  "gpt-4.1-nano",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-16k",

  // Google — Gemini free tier
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-pro",

  // Meta — Llama (open-source, free on Euron)
  "llama-3.3-70b-instruct",
  "llama-3.1-405b-instruct",
  "llama-3.1-70b-instruct",
  "llama-3.1-8b-instruct",
  "llama-3-70b-instruct",
  "llama-3-8b-instruct",
  "llama-3.2-11b-vision-instruct",
  "llama-3.2-90b-vision-instruct",

  // Mistral — open-source
  "mistral-7b-instruct",
  "mixtral-8x7b-instruct",
  "mixtral-8x22b-instruct",
  "mistral-small-latest",

  // DeepSeek — free on Euron
  "deepseek-chat",
  "deepseek-coder",
  "deepseek-r1",
  "deepseek-v3",
  "deepseek-r1-distill-llama-70b",

  // Google Embeddings
  "text-embedding-004",
]);

export function isFreModel(modelId: string): boolean {
  return FREE_MODEL_IDS.has(modelId);
}
