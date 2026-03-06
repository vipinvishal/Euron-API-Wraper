import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EURI_BASE = "https://api.euri.ai/v1";

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing API key. Pass it in the x-api-key header." },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(`${EURI_BASE}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      // Next.js built-in cache — revalidate every hour server-side
      next: { revalidate: 3600 },
    });

    const rawText = await response.text();

    if (!response.ok) {
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(rawText); } catch { /* not JSON */ }

      const message =
        (parsed?.error as string | undefined) ||
        (parsed?.message as string | undefined) ||
        rawText ||
        `HTTP ${response.status} ${response.statusText}`;

      return NextResponse.json(
        {
          error: message,
          status: response.status,
          hint:
            response.status === 401 || response.status === 403
              ? "Your API key appears to be invalid or expired."
              : response.status === 404
              ? "The /v1/models endpoint was not found on the Euri API."
              : "Check that your API key is correct and has model access.",
        },
        { status: response.status }
      );
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: "Euri API returned a non-JSON response.", raw: rawText.slice(0, 500) },
        { status: 502 }
      );
    }

    // Normalise response shape
    if (Array.isArray(data)) {
      data = { object: "list", data };
    } else if (Array.isArray(data.models)) {
      data = { object: "list", data: data.models };
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Could not reach the Euri API server.",
        details: message,
        hint: "Make sure the server has outbound internet access to api.euri.ai",
      },
      { status: 502 }
    );
  }
}
