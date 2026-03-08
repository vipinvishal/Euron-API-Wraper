"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  RefreshCw,
  Sparkles,
  Key,
  Star,
  CreditCard,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryTabs, type ActiveCategory } from "@/components/CategoryTabs";
import { SearchBar } from "@/components/SearchBar";
import { ModelCard } from "@/components/ModelCard";
import { ModelDrawer } from "@/components/ModelDrawer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { categorizeModels, groupByCategory } from "@/lib/categorize-models";
import { FALLBACK_MODELS } from "@/lib/fallback-models";
import type { CategorizedModel, ModelCategory, ModelPricing } from "@/lib/types";
import { useModelStatus } from "@/hooks/useModelStatus";

type PricingFilter = "all" | ModelPricing;

function maskApiKey(key: string) {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 6) + "••••••••" + key.slice(-4);
}

function ModelGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-4 w-10 rounded-md" />
          </div>
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-3 w-20 rounded" />
          <div className="flex gap-1">
            <Skeleton className="h-4 w-12 rounded-full" />
            <Skeleton className="h-4 w-10 rounded-full" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState<string>("");
  const [models, setModels] = useState<CategorizedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>("all");
  const [search, setSearch] = useState("");
  const [selectedModel, setSelectedModel] = useState<CategorizedModel | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pricingFilter, setPricingFilter] = useState<PricingFilter>("all");

  const allModelIds = useMemo(() => models.map((m) => m.id), [models]);
  const statusMap = useModelStatus(allModelIds, apiKey);

  const fetchModels = useCallback(
    async (key: string) => {
      setLoading(true);

      const loadFallback = () => {
        setModels(categorizeModels(FALLBACK_MODELS));
      };

      try {
        // Try direct browser fetch to the Euri API
        let res: Response | null = null;
        try {
          res = await fetch("https://api.euri.ai/v1/models", {
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            cache: "no-store",
          });
        } catch {
          // Browser can't reach api.euri.ai — try server proxy as last resort
          try {
            res = await fetch("/api/models", {
              headers: { "x-api-key": key },
              cache: "no-store",
            });
          } catch {
            // Both failed — use fallback
            loadFallback();
            return;
          }
        }

        if (!res || !res.ok) {
          if (res?.status === 401 || res?.status === 403) {
            localStorage.removeItem("euri_api_key");
            router.replace("/");
            return;
          }
          // API reachable but returned error — still show fallback
          loadFallback();
          return;
        }

        const data = await res.json();

        // Handle OpenAI format { data: [...] }, or { models: [...] }, or a plain array
        let raw: unknown[] = [];
        if (Array.isArray(data)) raw = data;
        else if (Array.isArray(data?.data)) raw = data.data;
        else if (Array.isArray(data?.models)) raw = data.models;

        if (raw.length === 0) {
          loadFallback();
          return;
        }

        setModels(categorizeModels(raw as Parameters<typeof categorizeModels>[0]));
      } catch {
        loadFallback();
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const key = localStorage.getItem("euri_api_key");
    if (!key) {
      router.replace("/");
      return;
    }
    setApiKey(key);
    // Read pricing preference saved on landing page
    const savedPricing = localStorage.getItem("euri_pricing_filter") as PricingFilter | null;
    if (savedPricing) setPricingFilter(savedPricing);
    fetchModels(key);
  }, [fetchModels, router, refreshKey]);

  function handleDisconnect() {
    localStorage.removeItem("euri_api_key");
    router.replace("/");
  }

  const grouped = useMemo(() => groupByCategory(models), [models]);

  const categoryCounts = useMemo(() => {
    const counts: Record<ActiveCategory, number> = {
      all: models.length,
      chat: grouped.chat.length,
      image: grouped.image.length,
      vision: grouped.vision.length,
      audio: grouped.audio.length,
      embedding: grouped.embedding.length,
      code: grouped.code.length,
      reasoning: grouped.reasoning.length,
    };
    return counts;
  }, [models, grouped]);

  const filteredModels = useMemo(() => {
    let list: CategorizedModel[] =
      activeCategory === "all"
        ? models
        : grouped[activeCategory as ModelCategory] ?? [];

    // Apply pricing filter
    if (pricingFilter !== "all") {
      list = list.filter((m) => m.pricing === pricingFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeCategory, models, grouped, search, pricingFilter]);

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle gradient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-60 -left-60 w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute top-1/2 -right-60 w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      {/* Top navbar */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-background/80 backdrop-blur-xl">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight hidden sm:block">Euri Explorer</span>
          </div>

          {/* API Key indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-mono text-muted-foreground hidden sm:flex">
            <Key className="w-3 h-3 text-green-400" />
            <span>{maskApiKey(apiKey)}</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={loading}
              className="h-8 gap-1.5 text-xs hidden sm:flex"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Disconnect</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">
            Model Explorer
          </h1>
          <p className="text-muted-foreground text-sm">
            {loading
              ? "Loading models..."
              : `${models.length} models available`}
          </p>
        </motion.div>


        {/* Controls */}
        <div className="space-y-4 mb-6">
            {/* Category tabs */}
            {!loading ? (
              <CategoryTabs
                counts={categoryCounts}
                active={activeCategory}
                onSelect={setActiveCategory}
              />
            ) : (
              <div className="flex gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-24 rounded-lg" />
                ))}
              </div>
            )}

            {/* Search + pricing filter */}
            <div className="flex items-center gap-3 flex-wrap">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search by model name or provider..."
                className="flex-1 max-w-sm"
              />

              {/* Pricing toggle */}
              <div className="flex items-center gap-1 p-1 rounded-lg border border-white/10 bg-background/50">
                {([
                  { value: "all",  label: "All",  icon: LayoutGrid, color: "text-purple-400" },
                  { value: "free", label: "Free", icon: Star,        color: "text-green-400"  },
                  { value: "paid", label: "Paid", icon: CreditCard,  color: "text-amber-400"  },
                ] as { value: PricingFilter; label: string; icon: React.ElementType; color: string }[]).map(({ value, label, icon: Icon, color }) => (
                  <motion.button
                    key={value}
                    onClick={() => {
                      setPricingFilter(value);
                      localStorage.setItem("euri_pricing_filter", value);
                    }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                      pricingFilter === value
                        ? "bg-card shadow-sm border border-white/15 text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className={`w-3 h-3 ${pricingFilter === value ? color : ""}`} />
                    {label}
                  </motion.button>
                ))}
              </div>

              {!loading && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {filteredModels.length} result{filteredModels.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
        </div>

        {/* Model grid */}
        {loading ? (
          <ModelGridSkeleton />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeCategory}-${search}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {filteredModels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground font-medium">No models found</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    {search ? `No results for "${search}"` : "This category has no accessible models"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredModels.map((model, i) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      index={i}
                      onClick={setSelectedModel}
                      statusEntry={statusMap[model.id]}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Model detail drawer */}
      <ModelDrawer
        model={selectedModel}
        statusEntry={selectedModel ? statusMap[selectedModel.id] : undefined}
        onClose={() => setSelectedModel(null)}
      />
    </div>
  );
}
