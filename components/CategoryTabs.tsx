"use client";

import { motion } from "framer-motion";
import {
  MessageSquare,
  ImageIcon,
  Eye,
  AudioLines,
  Layers,
  Code2,
  Brain,
  LayoutGrid,
} from "lucide-react";
import type { ModelCategory } from "@/lib/types";
import { CATEGORY_INFO } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<ModelCategory | "all", React.ElementType> = {
  all: LayoutGrid,
  chat: MessageSquare,
  image: ImageIcon,
  vision: Eye,
  audio: AudioLines,
  embedding: Layers,
  code: Code2,
  reasoning: Brain,
};

export type ActiveCategory = ModelCategory | "all";

interface CategoryTabsProps {
  counts: Record<ModelCategory | "all", number>;
  active: ActiveCategory;
  onSelect: (cat: ActiveCategory) => void;
}

const TAB_ORDER: ActiveCategory[] = [
  "all",
  "chat",
  "reasoning",
  "vision",
  "code",
  "image",
  "audio",
  "embedding",
];

export function CategoryTabs({ counts, active, onSelect }: CategoryTabsProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {TAB_ORDER.map((cat) => {
        const count = counts[cat] ?? 0;
        if (cat !== "all" && count === 0) return null;

        const Icon = ICONS[cat];
        const isActive = active === cat;
        const info = cat !== "all" ? CATEGORY_INFO[cat] : null;

        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 rounded-lg bg-white/10 border border-white/15"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <Icon
              className={cn(
                "w-3.5 h-3.5 relative z-10",
                isActive && info ? info.color : ""
              )}
            />
            <span className="relative z-10 capitalize">
              {cat === "all" ? "All" : CATEGORY_INFO[cat].label}
            </span>
            <span
              className={cn(
                "relative z-10 text-xs font-mono px-1.5 py-0.5 rounded-md min-w-[20px] text-center",
                isActive
                  ? "bg-white/15 text-foreground"
                  : "bg-white/5 text-muted-foreground"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
