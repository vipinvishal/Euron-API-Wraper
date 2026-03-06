import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Used by Docker HEALTHCHECK and ALB health checks
export async function GET() {
  return NextResponse.json(
    { status: "ok", timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
