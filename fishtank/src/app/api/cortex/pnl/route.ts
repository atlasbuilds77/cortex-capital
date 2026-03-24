// API route for fetching live P&L from Cortex Capital
// GET /api/cortex/pnl

import { NextResponse } from "next/server";
import { fetchLivePnL } from "@/lib/cortex-capital-api";

export async function GET() {
  try {
    const result = await fetchLivePnL();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("[API] Cortex P&L fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
