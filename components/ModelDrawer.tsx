"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Code2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CategorizedModel } from "@/lib/types";
import { PROVIDER_INFO, CATEGORY_INFO } from "@/lib/types";
import { formatContextWindow } from "@/lib/categorize-models";
import type { ModelStatusEntry } from "@/lib/model-status";
import { cn } from "@/lib/utils";

const CAPABILITY_LABELS: Record<string, string> = {
  streaming: "Streaming",
  "tool-calling": "Tool Calling",
  "json-mode": "JSON Mode",
  vision: "Vision / Multimodal",
  reasoning: "Extended Reasoning",
  "long-context": "Long Context",
  fast: "Fast Response",
  embeddings: "Vector Embeddings",
};

interface DocLink {
  label: string;
  url: string;
}

function getProviderDocLink(modelId: string, provider: string): DocLink {
  const id = modelId.toLowerCase();

  // OpenAI — link to the specific model's page when possible
  if (provider === "openai") {
    if (id.startsWith("o1") || id.startsWith("o3") || id.startsWith("o4"))
      return { label: "OpenAI o-series docs", url: "https://platform.openai.com/docs/models#o1" };
    if (id.includes("gpt-4o"))
      return { label: "GPT-4o docs", url: "https://platform.openai.com/docs/models/gpt-4o" };
    if (id.includes("gpt-4"))
      return { label: "GPT-4 docs", url: "https://platform.openai.com/docs/models/gpt-4-turbo-and-gpt-4" };
    if (id.includes("gpt-3.5"))
      return { label: "GPT-3.5 docs", url: "https://platform.openai.com/docs/models/gpt-3-5-turbo" };
    if (id.includes("dall-e"))
      return { label: "DALL·E docs", url: "https://platform.openai.com/docs/models/dall-e" };
    if (id.includes("whisper"))
      return { label: "Whisper docs", url: "https://platform.openai.com/docs/models/whisper" };
    if (id.includes("tts"))
      return { label: "TTS docs", url: "https://platform.openai.com/docs/models/tts" };
    if (id.includes("embed"))
      return { label: "Embeddings docs", url: "https://platform.openai.com/docs/models/text-embedding" };
    return { label: "OpenAI model docs", url: "https://platform.openai.com/docs/models" };
  }

  // Anthropic Claude
  if (provider === "anthropic") {
    if (id.includes("claude-3-5"))
      return { label: "Claude 3.5 docs", url: "https://docs.anthropic.com/en/docs/about-claude/models" };
    if (id.includes("claude-3"))
      return { label: "Claude 3 docs", url: "https://docs.anthropic.com/en/docs/about-claude/models" };
    return { label: "Anthropic model docs", url: "https://docs.anthropic.com/en/docs/about-claude/models" };
  }

  // Google Gemini
  if (provider === "google") {
    if (id.includes("gemini-2.5"))
      return { label: "Gemini 2.5 docs", url: "https://ai.google.dev/gemini-api/docs/models/gemini#gemini-2.5-flash-preview" };
    if (id.includes("gemini-2.0"))
      return { label: "Gemini 2.0 docs", url: "https://ai.google.dev/gemini-api/docs/models/gemini#gemini-2.0-flash" };
    if (id.includes("gemini-1.5"))
      return { label: "Gemini 1.5 docs", url: "https://ai.google.dev/gemini-api/docs/models/gemini#gemini-1.5-flash" };
    if (id.includes("embed"))
      return { label: "Google Embeddings docs", url: "https://ai.google.dev/gemini-api/docs/embeddings" };
    return { label: "Google Gemini docs", url: "https://ai.google.dev/gemini-api/docs/models/gemini" };
  }

  // Meta Llama
  if (provider === "meta") {
    if (id.includes("llama-3.1") || id.includes("llama-3.2") || id.includes("llama-3.3"))
      return { label: "Llama 3 docs", url: "https://www.llama.com/docs/model-cards-and-prompt-formats/llama3_1/" };
    return { label: "Meta Llama docs", url: "https://www.llama.com/docs/overview" };
  }

  // Mistral
  if (provider === "mistral") {
    if (id.includes("codestral"))
      return { label: "Codestral docs", url: "https://docs.mistral.ai/capabilities/code_generation/" };
    if (id.includes("pixtral"))
      return { label: "Pixtral docs", url: "https://docs.mistral.ai/capabilities/vision/" };
    if (id.includes("embed"))
      return { label: "Mistral Embeddings docs", url: "https://docs.mistral.ai/capabilities/embeddings/" };
    return { label: "Mistral model docs", url: "https://docs.mistral.ai/getting-started/models/models_overview/" };
  }

  // DeepSeek
  if (provider === "deepseek") {
    if (id.includes("r1"))
      return { label: "DeepSeek-R1 docs", url: "https://api-docs.deepseek.com/news/news250120" };
    return { label: "DeepSeek API docs", url: "https://api-docs.deepseek.com/" };
  }

  // xAI Grok
  if (provider === "xai") {
    return { label: "xAI Grok docs", url: "https://docs.x.ai/docs/models" };
  }

  // Cohere
  if (provider === "cohere") {
    if (id.includes("embed"))
      return { label: "Cohere Embed docs", url: "https://docs.cohere.com/docs/embed-2" };
    return { label: "Cohere model docs", url: "https://docs.cohere.com/docs/models" };
  }

  // Stability AI
  if (provider === "stability") {
    return { label: "Stability AI docs", url: "https://platform.stability.ai/docs/api-reference" };
  }

  // Fallback — Euri API reference
  return { label: "Euri API documentation", url: "https://euron.one/euri" };
}

function generatePythonSnippet(modelId: string): string {
  return `from openai import OpenAI

client = OpenAI(
    base_url="https://api.euri.ai/v1",
    api_key="YOUR_EURI_API_KEY",
)

response = client.chat.completions.create(
    model="${modelId}",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello! What can you do?"},
    ],
    max_tokens=1024,
    temperature=0.7,
)

print(response.choices[0].message.content)`;
}

function generateJSSnippet(modelId: string): string {
  return `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.euri.ai/v1",
  apiKey: "YOUR_EURI_API_KEY",
});

const response = await client.chat.completions.create({
  model: "${modelId}",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello! What can you do?" },
  ],
  max_tokens: 1024,
  temperature: 0.7,
});

console.log(response.choices[0].message.content);`;
}

function generateCurlSnippet(modelId: string): string {
  return `curl https://api.euri.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_EURI_API_KEY" \\
  -d '{
    "model": "${modelId}",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello! What can you do?"}
    ],
    "max_tokens": 1024,
    "temperature": 0.7
  }'`;
}

interface CodeBlockProps {
  code: string;
  language: string;
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group rounded-lg overflow-hidden border border-white/10 bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/8 bg-white/5">
        <span className="text-xs text-muted-foreground font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono leading-relaxed text-slate-300 overflow-x-auto whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

interface ModelDrawerProps {
  model: CategorizedModel | null;
  statusEntry?: ModelStatusEntry;
  onClose: () => void;
}

export function ModelDrawer({ model, statusEntry, onClose }: ModelDrawerProps) {
  const isOpen = !!model;

  if (!model) {
    return <Sheet open={false} onOpenChange={onClose}><SheetContent /></Sheet>;
  }

  const providerInfo = PROVIDER_INFO[model.provider];
  const categoryInfo = CATEGORY_INFO[model.category];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 overflow-y-auto border-l border-white/10 bg-background"
      >
        <SheetHeader className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold truncate max-w-xs">
              Model Details
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {/* Model header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs font-medium px-2 py-1 rounded-lg", providerInfo.bgColor, providerInfo.color)}>
                {providerInfo.label}
              </span>
              <span className={cn("text-xs font-medium px-2 py-1 rounded-lg", categoryInfo.bgColor, categoryInfo.color)}>
                {categoryInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <code className="text-sm font-mono font-semibold text-foreground break-all">{model.id}</code>
              <button
                onClick={() => navigator.clipboard.writeText(model.id)}
                className="shrink-0 p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            {model.contextWindow && (
              <p className="text-sm text-muted-foreground">
                Context window: <span className="text-foreground font-medium">{formatContextWindow(model.contextWindow)}</span>
                {" "}({model.contextWindow.toLocaleString()} tokens)
              </p>
            )}
          </motion.div>

          {/* Live status block */}
          {statusEntry && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.04 }}
            >
              {statusEntry.status === "checking" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  Checking live model status…
                </div>
              )}

              {statusEntry.status === "active" && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Model is active and responding
                </div>
              )}

              {statusEntry.status === "deprecated" && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-medium text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Deprecated Model
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {statusEntry.message || "This model has been deprecated by its provider."}
                  </p>
                  {statusEntry.replacement && (
                    <div className="flex items-center gap-2 text-xs text-amber-300/80 pt-1">
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      Migrate to:{" "}
                      <code className="font-mono bg-amber-500/15 px-1.5 py-0.5 rounded text-amber-200">
                        {statusEntry.replacement}
                      </code>
                    </div>
                  )}
                </div>
              )}

              {statusEntry.status === "unavailable" && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/8 p-4 space-y-1">
                  <div className="flex items-center gap-2 text-red-300 font-medium text-sm">
                    <XCircle className="w-4 h-4 shrink-0" />
                    Model Unavailable
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {statusEntry.message || "This model is not available via the Euri API."}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Capabilities */}
          {model.capabilities.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="space-y-2"
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Capabilities</p>
              <div className="flex flex-wrap gap-2">
                {model.capabilities.map((cap) => (
                  <Badge
                    key={cap}
                    variant="secondary"
                    className="text-xs gap-1.5 py-1 px-2.5"
                  >
                    <Code2 className="w-3 h-3" />
                    {CAPABILITY_LABELS[cap] ?? cap}
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}

          {/* Code snippets */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="space-y-3"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Quick Start</p>

            <Tabs defaultValue="python">
              <TabsList className="h-8 bg-white/5">
                <TabsTrigger value="python" className="text-xs h-6">Python</TabsTrigger>
                <TabsTrigger value="javascript" className="text-xs h-6">JavaScript</TabsTrigger>
                <TabsTrigger value="curl" className="text-xs h-6">cURL</TabsTrigger>
              </TabsList>
              <TabsContent value="python" className="mt-3">
                <CodeBlock code={generatePythonSnippet(model.id)} language="python" />
              </TabsContent>
              <TabsContent value="javascript" className="mt-3">
                <CodeBlock code={generateJSSnippet(model.id)} language="javascript" />
              </TabsContent>
              <TabsContent value="curl" className="mt-3">
                <CodeBlock code={generateCurlSnippet(model.id)} language="bash" />
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Provider docs link */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.15 }}
            className="space-y-2"
          >
            {(() => {
              const doc = getProviderDocLink(model.id, model.provider);
              return (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  {doc.label}
                </a>
              );
            })()}
          </motion.div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
