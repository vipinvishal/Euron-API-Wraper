export interface EuriModel {
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
}

export interface EuriModelsResponse {
  object: string;
  data: EuriModel[];
}

export type ModelCategory =
  | "chat"
  | "image"
  | "vision"
  | "audio"
  | "embedding"
  | "code"
  | "reasoning";

export interface CategorizedModel extends EuriModel {
  category: ModelCategory;
  provider: ModelProvider;
  capabilities: ModelCapability[];
  contextWindow?: number;
}

export type ModelProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "meta"
  | "mistral"
  | "cohere"
  | "stability"
  | "deepseek"
  | "xai"
  | "other";

export type ModelCapability =
  | "streaming"
  | "tool-calling"
  | "json-mode"
  | "vision"
  | "reasoning"
  | "long-context"
  | "fast"
  | "embeddings";

export interface CategoryInfo {
  label: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const CATEGORY_INFO: Record<ModelCategory, CategoryInfo> = {
  chat: {
    label: "Chat & Text",
    description: "Conversational and text generation models",
    icon: "MessageSquare",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  image: {
    label: "Image Generation",
    description: "Create and edit images from text prompts",
    icon: "ImageIcon",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/20",
  },
  vision: {
    label: "Vision",
    description: "Analyze and understand images",
    icon: "Eye",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
  audio: {
    label: "Audio",
    description: "Speech-to-text and text-to-speech models",
    icon: "AudioLines",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
  },
  embedding: {
    label: "Embeddings",
    description: "Vector embedding generation for semantic search",
    icon: "Layers",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  code: {
    label: "Code",
    description: "Specialized models for code generation and analysis",
    icon: "Code2",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
  },
  reasoning: {
    label: "Reasoning",
    description: "Advanced reasoning and problem-solving models",
    icon: "Brain",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
  },
};

export const PROVIDER_INFO: Record<
  ModelProvider,
  { label: string; color: string; bgColor: string }
> = {
  openai: {
    label: "OpenAI",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  anthropic: {
    label: "Anthropic",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  google: {
    label: "Google",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  meta: {
    label: "Meta",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
  },
  mistral: {
    label: "Mistral",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  cohere: {
    label: "Cohere",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
  },
  stability: {
    label: "Stability AI",
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
  },
  deepseek: {
    label: "DeepSeek",
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
  },
  xai: {
    label: "xAI",
    color: "text-gray-400",
    bgColor: "bg-gray-500/10",
  },
  other: {
    label: "Other",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
  },
};
