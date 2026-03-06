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
// Curated deprecation data — used as instant hints before live check
// ---------------------------------------------------------------------------
export const KNOWN_DEPRECATED: Record<string, { reason: string; replacement?: string }> = {
  // Google Gemini
  "gemini-pro": {
    reason: "Deprecated — shut down March 9 2026 per Google's announcement.",
    replacement: "gemini-2.0-flash",
  },
  "gemini-pro-vision": {
    reason: "Deprecated — Gemini Pro Vision has been replaced by multimodal Gemini 1.5+.",
    replacement: "gemini-1.5-flash",
  },
  "gemini-1.0-pro": {
    reason: "Deprecated by Google.",
    replacement: "gemini-1.5-pro",
  },
  "gemini-1.0-pro-vision": {
    reason: "Deprecated by Google.",
    replacement: "gemini-1.5-pro",
  },

  // OpenAI
  "gpt-4-turbo-preview": {
    reason: "Preview version deprecated — replaced by stable gpt-4-turbo.",
    replacement: "gpt-4o",
  },
  "gpt-3.5-turbo-16k": {
    reason: "Deprecated — the standard gpt-3.5-turbo now supports 16K context.",
    replacement: "gpt-3.5-turbo",
  },
  "gpt-3.5-turbo-0613": {
    reason: "Snapshot deprecated by OpenAI.",
    replacement: "gpt-3.5-turbo",
  },
  "gpt-3.5-turbo-16k-0613": {
    reason: "Snapshot deprecated by OpenAI.",
    replacement: "gpt-3.5-turbo",
  },
  "gpt-4-0314": {
    reason: "Snapshot deprecated by OpenAI.",
    replacement: "gpt-4o",
  },
  "gpt-4-32k": {
    reason: "Deprecated — GPT-4 32K has been discontinued.",
    replacement: "gpt-4o",
  },
  "gpt-4-32k-0314": {
    reason: "Snapshot deprecated by OpenAI.",
    replacement: "gpt-4o",
  },
  "text-embedding-ada-002": {
    reason: "Legacy model — newer embeddings are faster and more accurate.",
    replacement: "text-embedding-3-small",
  },
  "text-davinci-003": {
    reason: "Deprecated — legacy completion model.",
    replacement: "gpt-3.5-turbo",
  },
  "text-davinci-002": {
    reason: "Deprecated — legacy completion model.",
    replacement: "gpt-3.5-turbo",
  },
  "code-davinci-002": {
    reason: "Deprecated — replaced by GPT-4 class models.",
    replacement: "gpt-4o",
  },
  "dall-e-2": {
    reason: "Older generation image model — DALL·E 3 is significantly better.",
    replacement: "dall-e-3",
  },

  // Anthropic
  "claude-instant-1.2": {
    reason: "Deprecated — Claude Instant has been discontinued.",
    replacement: "claude-3-haiku-20240307",
  },
  "claude-2.0": {
    reason: "Deprecated — Claude 2 series is no longer recommended.",
    replacement: "claude-3-5-haiku-20241022",
  },
  "claude-2.1": {
    reason: "Deprecated — Claude 2 series is no longer recommended.",
    replacement: "claude-3-5-haiku-20241022",
  },

  // Stability AI
  "stable-diffusion-v1-5": {
    reason: "Older Stability model — newer versions available.",
    replacement: "stable-diffusion-3",
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
