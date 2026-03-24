// API route for fetching recent trades from Cortex Capital
// GET /api/cortex/trades?limit=10

import { NextRequest, NextResponse } from "next/server";
import { fetchRecentTrades } from "@/lib/cortex-capital-api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const result = await fetchRecentTrades(limit);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("[API] Cortex trades fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
