import type { EuriModel } from "./types";

/**
 * Curated list of models known to be available on the Euri API Gateway.
 * Used when the live /v1/models endpoint cannot be reached.
 */
export const FALLBACK_MODELS: EuriModel[] = [
  // OpenAI — Chat / GPT
  { id: "gpt-4o", object: "model", owned_by: "openai" },
  { id: "gpt-4o-mini", object: "model", owned_by: "openai" },
  { id: "gpt-4-turbo", object: "model", owned_by: "openai" },
  { id: "gpt-4-turbo-preview", object: "model", owned_by: "openai" },
  { id: "gpt-4", object: "model", owned_by: "openai" },
  { id: "gpt-3.5-turbo", object: "model", owned_by: "openai" },
  { id: "gpt-3.5-turbo-16k", object: "model", owned_by: "openai" },
  { id: "gpt-4.1-nano", object: "model", owned_by: "openai" },
  { id: "gpt-4.1-mini", object: "model", owned_by: "openai" },

  // OpenAI — Reasoning
  { id: "o1", object: "model", owned_by: "openai" },
  { id: "o1-mini", object: "model", owned_by: "openai" },
  { id: "o1-preview", object: "model", owned_by: "openai" },
  { id: "o3-mini", object: "model", owned_by: "openai" },

  // OpenAI — Image
  { id: "dall-e-3", object: "model", owned_by: "openai" },
  { id: "dall-e-2", object: "model", owned_by: "openai" },

  // OpenAI — Audio
  { id: "whisper-1", object: "model", owned_by: "openai" },
  { id: "tts-1", object: "model", owned_by: "openai" },
  { id: "tts-1-hd", object: "model", owned_by: "openai" },

  // OpenAI — Embeddings
  { id: "text-embedding-3-small", object: "model", owned_by: "openai" },
  { id: "text-embedding-3-large", object: "model", owned_by: "openai" },
  { id: "text-embedding-ada-002", object: "model", owned_by: "openai" },

  // Anthropic — Claude 3.5
  { id: "claude-3-5-sonnet-20241022", object: "model", owned_by: "anthropic" },
  { id: "claude-3-5-haiku-20241022", object: "model", owned_by: "anthropic" },
  { id: "claude-3-5-sonnet-20240620", object: "model", owned_by: "anthropic" },

  // Anthropic — Claude 3
  { id: "claude-3-opus-20240229", object: "model", owned_by: "anthropic" },
  { id: "claude-3-sonnet-20240229", object: "model", owned_by: "anthropic" },
  { id: "claude-3-haiku-20240307", object: "model", owned_by: "anthropic" },

  // Google — Gemini
  { id: "gemini-2.5-flash", object: "model", owned_by: "google" },
  { id: "gemini-2.0-flash", object: "model", owned_by: "google" },
  { id: "gemini-2.0-flash-lite", object: "model", owned_by: "google" },
  { id: "gemini-1.5-pro", object: "model", owned_by: "google" },
  { id: "gemini-1.5-flash", object: "model", owned_by: "google" },
  { id: "gemini-1.5-flash-8b", object: "model", owned_by: "google" },
  { id: "gemini-pro", object: "model", owned_by: "google" },

  // Google — Embeddings
  { id: "text-embedding-004", object: "model", owned_by: "google" },

  // Meta — Llama 3
  { id: "llama-3.3-70b-instruct", object: "model", owned_by: "meta" },
  { id: "llama-3.1-405b-instruct", object: "model", owned_by: "meta" },
  { id: "llama-3.1-70b-instruct", object: "model", owned_by: "meta" },
  { id: "llama-3.1-8b-instruct", object: "model", owned_by: "meta" },
  { id: "llama-3-70b-instruct", object: "model", owned_by: "meta" },
  { id: "llama-3-8b-instruct", object: "model", owned_by: "meta" },
  { id: "llama-3.2-11b-vision-instruct", object: "model", owned_by: "meta" },
  { id: "llama-3.2-90b-vision-instruct", object: "model", owned_by: "meta" },

  // Mistral
  { id: "mistral-large-latest", object: "model", owned_by: "mistral" },
  { id: "mistral-medium-latest", object: "model", owned_by: "mistral" },
  { id: "mistral-small-latest", object: "model", owned_by: "mistral" },
  { id: "mistral-7b-instruct", object: "model", owned_by: "mistral" },
  { id: "mixtral-8x7b-instruct", object: "model", owned_by: "mistral" },
  { id: "mixtral-8x22b-instruct", object: "model", owned_by: "mistral" },
  { id: "codestral-latest", object: "model", owned_by: "mistral" },
  { id: "pixtral-12b-2409", object: "model", owned_by: "mistral" },

  // DeepSeek
  { id: "deepseek-r1", object: "model", owned_by: "deepseek" },
  { id: "deepseek-v3", object: "model", owned_by: "deepseek" },
  { id: "deepseek-chat", object: "model", owned_by: "deepseek" },
  { id: "deepseek-coder", object: "model", owned_by: "deepseek" },
  { id: "deepseek-r1-distill-llama-70b", object: "model", owned_by: "deepseek" },

  // xAI — Grok
  { id: "grok-2-1212", object: "model", owned_by: "xai" },
  { id: "grok-2-vision-1212", object: "model", owned_by: "xai" },
  { id: "grok-beta", object: "model", owned_by: "xai" },

  // Cohere
  { id: "command-r-plus", object: "model", owned_by: "cohere" },
  { id: "command-r", object: "model", owned_by: "cohere" },
  { id: "command-light", object: "model", owned_by: "cohere" },
  { id: "embed-english-v3.0", object: "model", owned_by: "cohere" },
  { id: "embed-multilingual-v3.0", object: "model", owned_by: "cohere" },

  // Stability AI — Image
  { id: "stable-diffusion-3", object: "model", owned_by: "stability" },
  { id: "stable-diffusion-xl-1024-v1-0", object: "model", owned_by: "stability" },
  { id: "stable-image-ultra", object: "model", owned_by: "stability" },
];

export const FALLBACK_MODEL_IDS = new Set(FALLBACK_MODELS.map((m) => m.id));
