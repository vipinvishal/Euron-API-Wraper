"use client";

import { useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Copy, Check, ChevronRight, AlertTriangle, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CategorizedModel } from "@/lib/types";
import { PROVIDER_INFO, CATEGORY_INFO } from "@/lib/types";
import { formatContextWindow } from "@/lib/categorize-models";
import type { ModelStatusEntry } from "@/lib/model-status";
import { cn } from "@/lib/utils";

const CAPABILITY_LABELS: Record<string, { label: string; color: string }> = {
  streaming:     { label: "Stream",   color: "bg-blue-500/10 text-blue-400 border-blue-500/20"     },
  "tool-calling":{ label: "Tools",    color: "bg-violet-500/10 text-violet-400 border-violet-500/20"},
  "json-mode":   { label: "JSON",     color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"},
  vision:        { label: "Vision",   color: "bg-pink-500/10 text-pink-400 border-pink-500/20"     },
  reasoning:     { label: "Reason",   color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"},
  "long-context":{ label: "Long-ctx", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"},
  fast:          { label: "Fast",     color: "bg-orange-500/10 text-orange-400 border-orange-500/20"},
  embeddings:    { label: "Embed",    color: "bg-teal-500/10 text-teal-400 border-teal-500/20"     },
};

function StatusBadge({ entry }: { entry: ModelStatusEntry | undefined }) {
  if (!entry) return null;
  switch (entry.status) {
    case "checking":
      return (
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />Checking
        </span>
      );
    case "deprecated":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 cursor-default">
              <AlertTriangle className="w-3 h-3" />Deprecated
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] text-xs">
            {entry.message || "This model is deprecated."}
            {entry.replacement && (
              <span className="block mt-1 text-muted-foreground">
                Use: <span className="font-mono text-foreground">{entry.replacement}</span>
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    case "unavailable":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded px-1.5 py-0.5 cursor-default">
              <XCircle className="w-3 h-3" />Unavailable
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] text-xs">
            {entry.message || "This model is not available."}
          </TooltipContent>
        </Tooltip>
      );
    case "active":
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
          <motion.span
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
          >
            <CheckCircle2 className="w-3 h-3" />
          </motion.span>
          Active
        </span>
      );
    default:
      return null;
  }
}

interface ModelCardProps {
  model: CategorizedModel;
  onClick: (model: CategorizedModel) => void;
  statusEntry?: ModelStatusEntry;
  index?: number;
}

export function ModelCard({ model, onClick, statusEntry, index = 0 }: ModelCardProps) {
  const [copied, setCopied] = useState(false);

  const providerInfo  = PROVIDER_INFO[model.provider];
  const categoryInfo  = CATEGORY_INFO[model.category];
  const isDeprecated  = statusEntry?.status === "deprecated";
  const isUnavailable = statusEntry?.status === "unavailable";

  /* 3-D tilt */
  const rotX  = useMotionValue(0);
  const rotY  = useMotionValue(0);
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);

  const rx = useTransform(rotX, v => `${v}deg`);
  const ry = useTransform(rotY, v => `${v}deg`);
  const glowBg = useTransform([glowX, glowY], ([x, y]) =>
    `radial-gradient(circle at ${x}% ${y}%, rgba(168,85,247,0.14) 0%, transparent 65%)`
  );

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const r  = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top)  / r.height;
    rotX.set((ny - 0.5) * -10);
    rotY.set((nx - 0.5) *  10);
    glowX.set(nx * 100);
    glowY.set(ny * 100);
  }

  function onMouseLeave() {
    animate(rotX,  0, { duration: 0.5, ease: "easeOut" });
    animate(rotY,  0, { duration: 0.5, ease: "easeOut" });
    animate(glowX, 50, { duration: 0.5 });
    animate(glowY, 50, { duration: 0.5 });
  }

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(model.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.97 }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={() => onClick(model)}
      style={{
        rotateX: rx,
        rotateY: ry,
        transformStyle: "preserve-3d",
        transformPerspective: 700,
      }}
      className={cn(
        "group relative cursor-pointer rounded-xl border bg-card p-4 transition-colors duration-200",
        isDeprecated  ? "border-amber-500/20 hover:border-amber-500/40"
        : isUnavailable ? "border-red-500/20 hover:border-red-500/30 opacity-70"
        : "border-border hover:border-white/25"
      )}
    >
      {/* Moving glow on hover */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: glowBg }}
      />

      {/* Deprecated top stripe */}
      {isDeprecated && (
        <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-gradient-to-r from-amber-500/60 to-amber-400/20" />
      )}

      {/* Top row */}
      <div className="relative flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {/* Category dot */}
          <motion.div
            className={cn("w-2 h-2 rounded-full shrink-0", categoryInfo.color.replace("text-", "bg-").replace("-400", "-500"))}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 3, delay: index * 0.15, ease: "easeInOut" }}
          />
          {/* Provider badge */}
          <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-md", providerInfo.bgColor, providerInfo.color)}>
            {providerInfo.label}
          </span>
          {/* Live status */}
          <StatusBadge entry={statusEntry} />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={handleCopy}
                whileTap={{ scale: 0.85 }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
              >
                {copied
                  ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                  : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>{copied ? "Copied!" : "Copy model ID"}</p></TooltipContent>
          </Tooltip>

          <motion.div
            className="text-muted-foreground/40 group-hover:text-muted-foreground"
            animate={{}} // reactive via CSS group
            whileHover={{ x: 2 }}
          >
            <ChevronRight className="w-4 h-4" />
          </motion.div>
        </div>
      </div>

      {/* Model ID */}
      <p
        className={cn(
          "relative font-mono text-sm font-medium leading-tight mb-3 truncate",
          isDeprecated ? "text-amber-200/80" : isUnavailable ? "text-muted-foreground" : "text-foreground"
        )}
        title={model.id}
      >
        {model.id}
      </p>

      {/* Context window */}
      {model.contextWindow && (
        <p className="relative text-xs text-muted-foreground mb-3">
          {formatContextWindow(model.contextWindow)}
        </p>
      )}

      {/* Capability chips */}
      {model.capabilities.length > 0 && (
        <div className="relative flex flex-wrap gap-1">
          {model.capabilities.slice(0, 4).map((cap, ci) => {
            const info = CAPABILITY_LABELS[cap];
            if (!info) return null;
            return (
              <motion.div
                key={cap}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(index * 0.04, 0.4) + ci * 0.05 }}
              >
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5 h-auto border", info.color)}>
                  {info.label}
                </Badge>
              </motion.div>
            );
          })}
          {model.capabilities.length > 4 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-auto">
              +{model.capabilities.length - 4}
            </Badge>
          )}
        </div>
      )}
    </motion.div>
  );
}
