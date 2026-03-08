export type ModelLiveStatus = "active" | "deprecated" | "unavailable" | "unknown" | "checking";

export interface ModelStatusEntry {
  status: ModelLiveStatus;
  checkedAt: number; // unix ms
  message?: string;
  replacement?: string;
}

const CACHE_KEY = "euri_model_status_cache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// Curated deprecation data — used as instant hints before live check.
// All 46 models currently listed on euron.one/euri (March 2026) are ACTIVE.
// This list is used only for models the live API may still return that are
// known to be deprecated upstream.
// ---------------------------------------------------------------------------
export const KNOWN_DEPRECATED: Record<string, { reason: string; replacement?: string }> = {
  // Google — older Gemini versions deprecated March 2026
  "gemini-pro": {
    reason: "Deprecated — shut down March 9 2026. Migrate to Gemini 2.0 Flash.",
    replacement: "gemini-2.0-flash",
  },
  "gemini-pro-vision": {
    reason: "Deprecated — replaced by multimodal Gemini 2.x models.",
    replacement: "gemini-2.0-flash",
  },
  "gemini-1.0-pro": {
    reason: "Deprecated by Google. Use Gemini 2.5 Flash.",
    replacement: "gemini-2.5-flash",
  },
  "gemini-1.5-pro": {
    reason: "Superseded by Gemini 2.5 Pro.",
    replacement: "gemini-2.5-pro",
  },
  "gemini-1.5-flash": {
    reason: "Superseded by Gemini 2.5 Flash.",
    replacement: "gemini-2.5-flash",
  },

  // OpenAI — legacy models
  "gpt-4-turbo-preview": {
    reason: "Preview version deprecated. Use GPT-4.1 or GPT-5.",
    replacement: "gpt-4.1",
  },
  "gpt-4-turbo": {
    reason: "Superseded by GPT-4.1 and GPT-5 series.",
    replacement: "gpt-4.1",
  },
  "gpt-4": {
    reason: "Superseded by GPT-4.1 and GPT-5 series.",
    replacement: "gpt-4.1",
  },
  "gpt-4o": {
    reason: "Superseded by GPT-4.1 and GPT-5 series on Euron.",
    replacement: "gpt-4.1",
  },
  "gpt-3.5-turbo": {
    reason: "Legacy model. Use GPT-4.1 Nano (free) for better results.",
    replacement: "gpt-4.1-nano",
  },
  "text-embedding-ada-002": {
    reason: "Legacy embedding model. Use text-embedding-3-small.",
    replacement: "text-embedding-3-small",
  },
  "dall-e-2": {
    reason: "Older generation. Not available on Euron — use newer image models.",
    replacement: "gemini-3-pro-image-preview",
  },

  // Anthropic — older Claude versions
  "claude-3-5-sonnet-20241022": {
    reason: "Superseded by Claude Sonnet 4 on Euron.",
    replacement: "claude-sonnet-4",
  },
  "claude-3-5-haiku-20241022": {
    reason: "Superseded by Claude Haiku 4.5 on Euron.",
    replacement: "claude-haiku-4-5",
  },
  "claude-3-opus-20240229": {
    reason: "Superseded by Claude Opus 4 on Euron.",
    replacement: "claude-opus-4",
  },
  "claude-3-sonnet-20240229": {
    reason: "Superseded by Claude Sonnet 4 on Euron.",
    replacement: "claude-sonnet-4",
  },
  "claude-3-haiku-20240307": {
    reason: "Superseded by Claude Haiku 4.5 on Euron.",
    replacement: "claude-haiku-4-5",
  },

  // Meta — older Llama versions
  "llama-3.1-70b-instruct": {
    reason: "Superseded by Llama 3.3 70B Versatile on Euron.",
    replacement: "llama-3.3-70b-versatile",
  },
  "llama-3-70b-instruct": {
    reason: "Superseded by Llama 4 Scout on Euron.",
    replacement: "llama-4-scout-17b-16e-instruct",
  },
};

// ---------------------------------------------------------------------------
// Cache helpers (localStorage, browser-only)
// ---------------------------------------------------------------------------
function readCache(): Record<string, ModelStatusEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ModelStatusEntry>) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, ModelStatusEntry>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage full — ignore
  }
}

export function getCachedStatus(modelId: string): ModelStatusEntry | null {
  const cache = readCache();
  const entry = cache[modelId];
  if (!entry) return null;
  if (Date.now() - entry.checkedAt > CACHE_TTL_MS) return null; // expired
  return entry;
}

export function setCachedStatus(modelId: string, entry: ModelStatusEntry) {
  const cache = readCache();
  cache[modelId] = entry;
  writeCache(cache);
}

export function clearStatusCache() {
  if (typeof window !== "undefined") localStorage.removeItem(CACHE_KEY);
}

// ---------------------------------------------------------------------------
// Instant hint from curated list (before live check)
// ---------------------------------------------------------------------------
export function getInstantHint(modelId: string): ModelStatusEntry | null {
  const deprecated = KNOWN_DEPRECATED[modelId.toLowerCase()];
  if (!deprecated) return null;
  return {
    status: "deprecated",
    checkedAt: Date.now(),
    message: deprecated.reason,
    replacement: deprecated.replacement,
  };
}

// ---------------------------------------------------------------------------
// Deprecation signal detection from API error messages
// ---------------------------------------------------------------------------
export function parseDeprecationSignal(
  httpStatus: number,
  body: string
): ModelLiveStatus {
  const lower = body.toLowerCase();

  // Explicit deprecation keywords
  if (
    lower.includes("deprecated") ||
    lower.includes("discontinu") ||
    lower.includes("shut down") ||
    lower.includes("sunset")
  )
    return "deprecated";

  // Model not found / doesn't exist
  if (
    httpStatus === 404 ||
    lower.includes("model_not_found") ||
    lower.includes("does not exist") ||
    lower.includes("not found") ||
    lower.includes("no such model") ||
    lower.includes("invalid model") ||
    lower.includes("model not supported")
  )
    return "unavailable";

  // Auth errors mean model exists but key lacks access
  if (httpStatus === 401 || httpStatus === 403) return "active";

  // Rate limit — model is alive
  if (httpStatus === 429) return "active";

  // 2xx / partial success — definitely active
  if (httpStatus >= 200 && httpStatus < 300) return "active";

  return "unknown";
}
