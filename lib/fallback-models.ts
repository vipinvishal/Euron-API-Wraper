import type { EuriModel } from "./types";

/**
 * Exact model list from https://euron.one/euri — March 2026
 * Only these models are shown and accessible via the Euron API Gateway.
 */
export const FALLBACK_MODELS: EuriModel[] = [

  // ── OpenAI (17 models) ────────────────────────────────────────────────────
  // Free (7)
  { id: "gpt-5-nano-2025-08-07",  object: "model", owned_by: "openai" },
  { id: "gpt-5-mini-2025-08-07",  object: "model", owned_by: "openai" },
  { id: "gpt-4.1-nano",           object: "model", owned_by: "openai" },
  { id: "gpt-4.1-mini",           object: "model", owned_by: "openai" },
  { id: "openai/gpt-oss-20b",     object: "model", owned_by: "openai" },
  { id: "openai/gpt-oss-120b",    object: "model", owned_by: "openai" },
  { id: "text-embedding-3-small", object: "model", owned_by: "openai" },
  // Premium (10)
  { id: "gpt-4.1",                object: "model", owned_by: "openai" },
  { id: "gpt-5",                  object: "model", owned_by: "openai" },
  { id: "gpt-5.1",                object: "model", owned_by: "openai" },
  { id: "gpt-5-mini",             object: "model", owned_by: "openai" },
  { id: "gpt-5-nano",             object: "model", owned_by: "openai" },
  { id: "o3",                     object: "model", owned_by: "openai" },
  { id: "o4-mini",                object: "model", owned_by: "openai" },
  { id: "gpt-5.3-instant",        object: "model", owned_by: "openai" },
  { id: "whisper-large-v3",       object: "model", owned_by: "openai" },
  { id: "whisper-large-v3-turbo", object: "model", owned_by: "openai" },

  // ── Google (11 models) ───────────────────────────────────────────────────
  // Free (9)
  { id: "gemini-2.0-flash",                      object: "model", owned_by: "google" },
  { id: "gemini-2.5-pro",                        object: "model", owned_by: "google" },
  { id: "gemini-2.5-flash",                      object: "model", owned_by: "google" },
  { id: "gemini-2.5-pro-preview-06-05",          object: "model", owned_by: "google" },
  { id: "gemini-2.5-flash-preview-05-20",        object: "model", owned_by: "google" },
  { id: "gemini-2.5-flash-lite-preview-06-17",   object: "model", owned_by: "google" },
  { id: "gemini-3-pro",                          object: "model", owned_by: "google" },
  { id: "gemini-embedding-001",                  object: "model", owned_by: "google" },
  { id: "gemini-3-pro-image-preview",            object: "model", owned_by: "google" },
  // Premium (2)
  { id: "gemini-3-flash",                        object: "model", owned_by: "google" },
  { id: "gemini-3.1-pro",                        object: "model", owned_by: "google" },

  // ── Anthropic (7 models) — all Premium ───────────────────────────────────
  { id: "claude-sonnet-4",   object: "model", owned_by: "anthropic" },
  { id: "claude-opus-4",     object: "model", owned_by: "anthropic" },
  { id: "claude-sonnet-4-6", object: "model", owned_by: "anthropic" },
  { id: "claude-opus-4-6",   object: "model", owned_by: "anthropic" },
  { id: "claude-sonnet-4-5", object: "model", owned_by: "anthropic" },
  { id: "claude-opus-4-5",   object: "model", owned_by: "anthropic" },
  { id: "claude-haiku-4-5",  object: "model", owned_by: "anthropic" },

  // ── Meta (4 models) — all Free ───────────────────────────────────────────
  { id: "llama-4-scout-17b-16e-instruct", object: "model", owned_by: "meta" },
  { id: "llama-3.3-70b-versatile",        object: "model", owned_by: "meta" },
  { id: "llama-3.1-8b-instant",           object: "model", owned_by: "meta" },
  { id: "llama-guard-4-12b",              object: "model", owned_by: "meta" },

  // ── Sarvam (3 models) ────────────────────────────────────────────────────
  { id: "sarvam-m",   object: "model", owned_by: "sarvam" }, // Free
  { id: "sarvam-stt", object: "model", owned_by: "sarvam" }, // Premium — Speech to Text
  { id: "sarvam-tts", object: "model", owned_by: "sarvam" }, // Premium — Text to Speech

  // ── Groq (2 models) — all Free ───────────────────────────────────────────
  { id: "groq/compound",      object: "model", owned_by: "groq" },
  { id: "groq/compound-mini", object: "model", owned_by: "groq" },

  // ── Alibaba (1 model) — Free ─────────────────────────────────────────────
  { id: "qwen/qwen3-32b", object: "model", owned_by: "alibaba" },

  // ── Together (1 model) — Free ────────────────────────────────────────────
  { id: "togethercomputer/m2-bert-80m-32k-retrieval", object: "model", owned_by: "together" },
];

export const FALLBACK_MODEL_IDS = new Set(FALLBACK_MODELS.map((m) => m.id));
