// API route for receiving Cortex Capital activity events
// POST /api/cortex/activity

import { NextRequest, NextResponse } from "next/server";
import { handleCortexActivityWebhook } from "@/agents/cortex-bridge";
import type { CortexActivityEvent } from "@/agents/activity-feed";

export async function POST(request: NextRequest) {
  try {
    const event: CortexActivityEvent = await request.json();

    // Validate event structure
    if (!event.agentRole || !event.activityType || !event.description) {
      return NextResponse.json(
        { success: false, error: "Invalid event structure" },
        { status: 400 }
      );
    }

    // Process event
    const result = await handleCortexActivityWebhook(event);

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] Cortex activity webhook error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Cortex Capital Activity Webhook Endpoint",
    method: "POST",
    body: {
      timestamp: "number",
      agentRole: "CortexAgentRole",
      activityType: "CortexActivityType",
      description: "string",
      metadata: "object (optional)",
    },
  });
}
