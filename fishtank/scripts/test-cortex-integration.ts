#!/usr/bin/env node
/**
 * Test script for Cortex Capital integration
 * Verifies API endpoints and data flow
 */

const CORTEX_API_BASE = process.env.CORTEX_API_URL || "http://localhost:3001";
const FISH_TANK_BASE = "http://localhost:3000";

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

async function testEndpoint(
  name: string,
  url: string,
  expectedFields?: string[]
): Promise<void> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      results.push({
        test: name,
        passed: false,
        message: `HTTP ${response.status}: ${response.statusText}`,
      });
      return;
    }

    const data = await response.json();

    if (expectedFields) {
      const missingFields = expectedFields.filter(
        (field) => !(field in data)
      );
      if (missingFields.length > 0) {
        results.push({
          test: name,
          passed: false,
          message: `Missing fields: ${missingFields.join(", ")}`,
        });
        return;
      }
    }

    results.push({
      test: name,
      passed: true,
      message: "OK",
    });
  } catch (error) {
    results.push({
      test: name,
      passed: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function testActivityPost(): Promise<void> {
  try {
    const activity = {
      timestamp: Date.now(),
      agentRole: "ANALYST",
      activityType: "analyzing",
      description: "Test activity from integration test",
      metadata: { test: true },
    };

    const response = await fetch(`${FISH_TANK_BASE}/api/cortex/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activity),
    });

    if (!response.ok) {
      results.push({
        test: "POST /api/cortex/activity",
        passed: false,
        message: `HTTP ${response.status}`,
      });
      return;
    }

    const data = await response.json();

    if (data.success) {
      results.push({
        test: "POST /api/cortex/activity",
        passed: true,
        message: "Activity posted successfully",
      });
    } else {
      results.push({
        test: "POST /api/cortex/activity",
        passed: false,
        message: data.error || "Failed to post activity",
      });
    }
  } catch (error) {
    results.push({
      test: "POST /api/cortex/activity",
      passed: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function runTests(): Promise<void> {
  console.log("\n🔧 Cortex Capital Fish Tank Integration Test\n");
  console.log(`Cortex API: ${CORTEX_API_BASE}`);
  console.log(`Fish Tank:  ${FISH_TANK_BASE}\n`);

  console.log("Testing Cortex Capital API...\n");

  // Test Cortex Capital endpoints
  await testEndpoint("Health Check", `${CORTEX_API_BASE}/health`, [
    "status",
    "version",
  ]);

  await testEndpoint("P&L Endpoint", `${CORTEX_API_BASE}/api/pnl`, [
    "totalPnL",
    "todayPnL",
    "accountValue",
  ]);

  await testEndpoint(
    "Trades Endpoint",
    `${CORTEX_API_BASE}/api/trades/recent?limit=5`
  );

  await testEndpoint(
    "Activity Endpoint",
    `${CORTEX_API_BASE}/api/activity?limit=10`
  );

  console.log("\nTesting Fish Tank API...\n");

  // Test Fish Tank endpoints
  await testEndpoint("Fish Tank P&L Proxy", `${FISH_TANK_BASE}/api/cortex/pnl`);

  await testEndpoint(
    "Fish Tank Trades Proxy",
    `${FISH_TANK_BASE}/api/cortex/trades?limit=5`
  );

  await testActivityPost();

  // Print results
  console.log("\n📊 Test Results\n");
  console.log("─".repeat(70));

  let passed = 0;
  let failed = 0;

  results.forEach((result) => {
    const icon = result.passed ? "✅" : "❌";
    console.log(`${icon} ${result.test.padEnd(40)} ${result.message}`);
    if (result.passed) passed++;
    else failed++;
  });

  console.log("─".repeat(70));
  console.log(`\nPassed: ${passed} | Failed: ${failed} | Total: ${results.length}\n`);

  if (failed > 0) {
    console.log("⚠️  Some tests failed. Check:\n");
    console.log("  1. Cortex Capital is running at", CORTEX_API_BASE);
    console.log("  2. Fish Tank is running at", FISH_TANK_BASE);
    console.log("  3. All required endpoints are implemented\n");
    console.log("See CORTEX_SETUP.md for endpoint specifications.\n");
    process.exit(1);
  } else {
    console.log("🎉 All tests passed! Cortex integration is working.\n");
    process.exit(0);
  }
}

// Run tests
runTests();
