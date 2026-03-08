import type {
  EuriModel,
  CategorizedModel,
  ModelCategory,
  ModelProvider,
  ModelCapability,
} from "./types";
import { isFreModel } from "./free-models";

function detectProvider(model: EuriModel): ModelProvider {
  const id = model.id.toLowerCase();
  const owner = (model.owned_by ?? "").toLowerCase();

  // Namespace-prefixed IDs (e.g. "openai/gpt-oss-20b", "groq/compound")
  if (id.startsWith("openai/"))          return "openai";
  if (id.startsWith("groq/"))            return "groq";
  if (id.startsWith("qwen/"))            return "alibaba";
  if (id.startsWith("togethercomputer/") || id.startsWith("together/")) return "together";

  // owned_by hints
  if (owner === "sarvam")   return "sarvam";
  if (owner === "groq")     return "groq";
  if (owner === "alibaba")  return "alibaba";
  if (owner === "together") return "together";

  // Model ID patterns
  if (id.includes("gpt") || id.startsWith("o1") || id.startsWith("o3") || id.startsWith("o4") || id.startsWith("o5") || owner.includes("openai")) return "openai";
  if (id.includes("claude") || owner.includes("anthropic")) return "anthropic";
  if (id.includes("gemini") || id.includes("bard") || owner.includes("google")) return "google";
  if (id.includes("llama") || id.includes("meta") || owner.includes("meta")) return "meta";
  if (id.includes("mistral") || id.includes("mixtral") || owner.includes("mistral")) return "mistral";
  if (id.includes("command") || id.includes("embed-") || owner.includes("cohere")) return "cohere";
  if (id.includes("stable-diffusion") || id.includes("sdxl") || id.includes("stability")) return "stability";
  if (id.includes("deepseek") || owner.includes("deepseek")) return "deepseek";
  if (id.includes("grok") || owner.includes("xai") || owner.includes("x-ai")) return "xai";
  if (id.includes("sarvam") || owner.includes("sarvam")) return "sarvam";
  if (id.includes("qwen") || owner.includes("alibaba") || owner.includes("qwen")) return "alibaba";

  return "other";
}

function detectCategory(model: EuriModel): ModelCategory {
  const id = model.id.toLowerCase();

  // Image generation
  if (
    id.includes("dall-e") || id.includes("dalle") ||
    id.includes("stable-diffusion") || id.includes("sdxl") ||
    id.includes("flux") || id.includes("imagen") ||
    id.includes("image-generation") || id.includes("text-to-image") ||
    id.includes("image-preview")                        // gemini-3-pro-image-preview
  ) return "image";

  // Audio — speech to text / text to speech
  if (
    id.includes("whisper") || id.includes("tts") ||
    id.includes("text-to-speech") || id.includes("speech-to-text") ||
    id.includes("transcri") || id.includes("audio") || id.includes("voice") ||
    id === "sarvam-stt" || id === "sarvam-tts"
  ) return "audio";

  // Embeddings
  if (
    id.includes("embed") || id.includes("text-embedding") ||
    id.includes("text-search") || id.includes("e5-") ||
    id.includes("bge-") || id.includes("sentence") ||
    id.includes("bert") || id.includes("retrieval")    // m2-bert-80m-32k-retrieval
  ) return "embedding";

  // Reasoning (o-series, thinking, r1 models)
  if (
    id === "o3" || id === "o4-mini" ||
    id.startsWith("o1") || id.startsWith("o3") || id.startsWith("o4") ||
    id.includes("-thinking") || id.includes("reasoner") ||
    id.includes("deepthink") ||
    (id.includes("deepseek") && id.includes("r1"))
  ) return "reasoning";

  // Code
  if (
    id.includes("code") || id.includes("codex") ||
    id.includes("starcoder") || id.includes("codellama") ||
    id.includes("codegemma") || id.includes("codestral")
  ) return "code";

  // Vision
  if (
    id.includes("vision") || id.includes("-vl") || id.includes("vl-") ||
    id.includes("pixtral") || id.includes("llava") ||
    id.includes("claude-") ||                          // all Claude models support vision
    id.includes("gemini-")                             // all Gemini models support vision
  ) return "vision";

  // Default: chat / text
  return "chat";
}

function detectCapabilities(model: EuriModel, category: ModelCategory): ModelCapability[] {
  const id = model.id.toLowerCase();
  const caps: ModelCapability[] = ["streaming"];

  if (category === "embedding") return ["embeddings"];
  if (category === "audio" && id.includes("tts")) return ["streaming"];
  if (category === "image") return [];

  // Tool calling: most modern GPT-4, Claude 3+, Gemini 1.5+
  if (
    id.includes("gpt-4") ||
    id.includes("gpt-3.5-turbo") ||
    id.includes("claude-3") ||
    id.includes("gemini") ||
    id.includes("mistral") ||
    id.includes("mixtral") ||
    id.includes("llama-3") ||
    id.includes("command-r")
  ) {
    caps.push("tool-calling");
  }

  // JSON mode
  if (
    id.includes("gpt-4") ||
    id.includes("gpt-3.5-turbo") ||
    id.includes("gemini") ||
    id.includes("mistral") ||
    id.includes("claude-3")
  ) {
    caps.push("json-mode");
  }

  // Vision capability
  if (category === "vision") caps.push("vision");

  // Reasoning
  if (category === "reasoning") caps.push("reasoning");

  // Long context
  if (
    id.includes("claude-3") ||
    id.includes("gemini-1.5") ||
    id.includes("gemini-2") ||
    id.includes("128k") ||
    id.includes("200k")
  ) {
    caps.push("long-context");
  }

  // Fast markers
  if (
    id.includes("mini") ||
    id.includes("nano") ||
    id.includes("flash") ||
    id.includes("haiku") ||
    id.includes("instant") ||
    id.includes("turbo") ||
    id.includes("lite")
  ) {
    caps.push("fast");
  }

  return caps;
}

function detectContextWindow(id: string): number | undefined {
  const lower = id.toLowerCase();
  if (lower.includes("200k")) return 200000;
  if (lower.includes("128k")) return 128000;
  if (lower.includes("32k"))  return 32000;
  if (lower.includes("16k"))  return 16000;
  if (lower.includes("8k"))   return 8000;
  if (lower.includes("4k"))   return 4096;

  // Claude 4.x
  if (lower.includes("claude-opus-4") || lower.includes("claude-sonnet-4") || lower.includes("claude-haiku-4")) return 200000;

  // Gemini 3.x / 2.5
  if (lower.includes("gemini-3") || lower.includes("gemini-2.5")) return 1000000;
  if (lower.includes("gemini-2")) return 128000;

  // GPT-5.x / GPT-4.1
  if (lower.includes("gpt-5") || lower.includes("gpt-4.1")) return 128000;
  if (lower.includes("gpt-oss")) return 128000;

  // OpenAI o-series
  if (lower === "o3" || lower === "o4-mini") return 200000;

  // Llama 4
  if (lower.includes("llama-4")) return 524288;
  // Llama 3.x
  if (lower.includes("llama-3")) return 131072;

  // Groq Compound
  if (lower.includes("groq/compound")) return 128000;

  // Qwen 3
  if (lower.includes("qwen3")) return 131072;

  return undefined;
}

export function categorizeModels(models: EuriModel[]): CategorizedModel[] {
  return models.map((model) => {
    const category = detectCategory(model);
    const provider = detectProvider(model);
    const capabilities = detectCapabilities(model, category);
    const contextWindow = detectContextWindow(model.id);

    return {
      ...model,
      category,
      provider,
      capabilities,
      contextWindow,
      pricing: isFreModel(model.id) ? "free" : "paid",
    };
  });
}

export function groupByCategory(
  models: CategorizedModel[]
): Record<ModelCategory, CategorizedModel[]> {
  const groups: Record<ModelCategory, CategorizedModel[]> = {
    chat: [],
    image: [],
    vision: [],
    audio: [],
    embedding: [],
    code: [],
    reasoning: [],
  };

  for (const model of models) {
    groups[model.category].push(model);
  }

  return groups;
}

export function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(0)}M ctx`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K ctx`;
  return `${tokens} ctx`;
}
