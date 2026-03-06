import { NextRequest, NextResponse } from "next/server";
import { parseDeprecationSignal } from "@/lib/model-status";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { modelId?: string; apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { modelId, apiKey } = body;
  if (!modelId || !apiKey) {
    return NextResponse.json({ error: "modelId and apiKey are required" }, { status: 400 });
  }

  // Make the smallest possible request to probe the model
  const probeBody = JSON.stringify({
    model: modelId,
    messages: [{ role: "user", content: "hi" }],
    max_tokens: 1,
    temperature: 0,
  });

  try {
    const res = await fetch("https://api.euri.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: probeBody,
      signal: AbortSignal.timeout(12000), // 12s timeout per model
    });

    const rawText = await res.text();
    const status = parseDeprecationSignal(res.status, rawText);

    // Try to extract error message for display
    let message: string | undefined;
    try {
      const parsed = JSON.parse(rawText);
      message =
        parsed?.error?.message ||
        parsed?.error ||
        parsed?.message ||
        undefined;
      if (typeof message !== "string") message = undefined;
    } catch {
      // ignore
    }

    return NextResponse.json({ status, message });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    // Timeout or network failure — can't determine status
    return NextResponse.json({ status: "unknown", message: msg });
  }
}
