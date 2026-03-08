/**
 * Exact Free model IDs from https://euron.one/euri — March 2026
 * All other models on the platform are Premium (wallet credits required).
 */
export const FREE_MODEL_IDS = new Set<string>([
  // OpenAI — Free
  "gpt-5-nano-2025-08-07",
  "gpt-5-mini-2025-08-07",
  "gpt-4.1-nano",
  "gpt-4.1-mini",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "text-embedding-3-small",

  // Google — Free
  "gemini-2.0-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-pro-preview-06-05",
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.5-flash-lite-preview-06-17",
  "gemini-3-pro",
  "gemini-embedding-001",
  "gemini-3-pro-image-preview",

  // Meta — all Free
  "llama-4-scout-17b-16e-instruct",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "llama-guard-4-12b",

  // Sarvam — Free
  "sarvam-m",

  // Groq — all Free
  "groq/compound",
  "groq/compound-mini",

  // Alibaba — Free
  "qwen/qwen3-32b",

  // Together — Free
  "togethercomputer/m2-bert-80m-32k-retrieval",
]);

export function isFreModel(modelId: string): boolean {
  return FREE_MODEL_IDS.has(modelId);
}
