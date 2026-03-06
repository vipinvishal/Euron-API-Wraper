"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ModelLiveStatus, ModelStatusEntry } from "@/lib/model-status";
import {
  getCachedStatus,
  setCachedStatus,
  getInstantHint,
} from "@/lib/model-status";

export type StatusMap = Record<string, ModelStatusEntry>;

const CONCURRENCY = 3; // probe at most 3 models in parallel
const PROBE_DELAY_MS = 300; // stagger probes to avoid hammering the API

export function useModelStatus(modelIds: string[], apiKey: string) {
  const [statusMap, setStatusMap] = useState<StatusMap>({});
  const abortRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);

  const updateOne = useCallback((id: string, entry: ModelStatusEntry) => {
    setStatusMap((prev) => ({ ...prev, [id]: entry }));
    setCachedStatus(id, entry);
  }, []);

  const probeModel = useCallback(
    async (modelId: string, signal: AbortSignal): Promise<void> => {
      // 1. Instant hint from curated list (shows immediately)
      const hint = getInstantHint(modelId);
      if (hint) {
        updateOne(modelId, hint);
        // Still do a live check to confirm
      }

      // 2. Check cache (skip live probe if fresh)
      const cached = getCachedStatus(modelId);
      if (cached && cached.status !== "unknown") {
        updateOne(modelId, cached);
        return;
      }

      // 3. Mark as "checking"
      updateOne(modelId, { status: "checking", checkedAt: Date.now() });

      // 4. Try direct browser fetch first, fall back to server proxy
      let status: ModelLiveStatus = "unknown";
      let message: string | undefined;

      const tryDirect = async () => {
        const res = await fetch("https://api.euri.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: "user", content: "hi" }],
            max_tokens: 1,
            temperature: 0,
          }),
          signal,
        });
        const raw = await res.text();

        // parse status from response
        const { parseDeprecationSignal } = await import("@/lib/model-status");
        status = parseDeprecationSignal(res.status, raw);

        try {
          const parsed = JSON.parse(raw);
          const msg =
            parsed?.error?.message || parsed?.error || parsed?.message;
          if (typeof msg === "string") message = msg;
        } catch {
          // not JSON
        }
      };

      const tryProxy = async () => {
        const res = await fetch("/api/check-model", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelId, apiKey }),
          signal,
        });
        const data = await res.json();
        status = (data.status as ModelLiveStatus) ?? "unknown";
        message = data.message;
      };

      try {
        await tryDirect();
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        // CORS / network — fall back to server proxy
        try {
          await tryProxy();
        } catch (proxyErr) {
          if ((proxyErr as Error)?.name === "AbortError") return;
          status = "unknown";
        }
      }

      if (signal.aborted) return;

      updateOne(modelId, { status, checkedAt: Date.now(), message });
    },
    [apiKey, updateOne]
  );

  useEffect(() => {
    if (!apiKey || modelIds.length === 0) return;

    // Abort any previous run
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (runningRef.current) return;
    runningRef.current = true;

    // Seed UI instantly from cache / curated hints
    const initialMap: StatusMap = {};
    for (const id of modelIds) {
      const cached = getCachedStatus(id);
      if (cached) {
        initialMap[id] = cached;
      } else {
        const hint = getInstantHint(id);
        if (hint) initialMap[id] = hint;
      }
    }
    if (Object.keys(initialMap).length > 0) {
      setStatusMap(initialMap);
    }

    // Queue live probes for models that are unchecked or stale
    const toProbe = modelIds.filter((id) => {
      const cached = getCachedStatus(id);
      return !cached || cached.status === "unknown";
    });

    async function runQueue() {
      let i = 0;
      while (i < toProbe.length && !controller.signal.aborted) {
        const batch = toProbe.slice(i, i + CONCURRENCY);
        await Promise.allSettled(
          batch.map((id) => probeModel(id, controller.signal))
        );
        i += CONCURRENCY;
        if (i < toProbe.length && !controller.signal.aborted) {
          await new Promise((r) => setTimeout(r, PROBE_DELAY_MS));
        }
      }
      runningRef.current = false;
    }

    runQueue();

    return () => {
      controller.abort();
      runningRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelIds.join(","), apiKey]);

  return statusMap;
}
