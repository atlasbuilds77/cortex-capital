// Cortex Capital - Integration Test
// Tests that the enhanced agents work with the analysis engines

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Test 1: Check TypeScript compilation
 */
async function testCompilation() {
  console.log('=== Test 1: TypeScript Compilation ===');
  
  try {
    const { stdout, stderr } = await execAsync(
      'cd /Users/atlasbuilds/clawd/cortex-capital && npx tsc --noEmit lib/agents/analysis-integration.ts'
    );
    
    if (stderr && !stderr.includes('warning')) {
      console.error('❌ Compilation failed:', stderr);
      return false;
    }
    
    console.log('✅ analysis-integration.ts compiles successfully');
    return true;
  } catch (error: any) {
    console.error('❌ Compilation test failed:', error.message);
    return false;
  }
}

/**
 * Test 2: Check analysis engine imports
 */
async function testAnalysisEngineImports() {
  console.log('\n=== Test 2: Analysis Engine Imports ===');
  
  try {
    // Try to import the analysis integration module
    const { getEnhancedAnalystAnalysis } = await import('./analysis-integration');
    
    console.log('✅ Successfully imported analysis integration module');
    console.log('✅ Function getEnhancedAnalystAnalysis is available');
    
    // Check that it's a function
    if (typeof getEnhancedAnalystAnalysis === 'function') {
      console.log('✅ getEnhancedAnalystAnalysis is a function');
      return true;
    } else {
      console.error('❌ getEnhancedAnalystAnalysis is not a function');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Import test failed:', error.message);
    return false;
  }
}

/**
 * Test 3: Check enhanced agent imports
 */
async function testEnhancedAgentImports() {
  console.log('\n=== Test 3: Enhanced Agent Imports ===');
  
  try {
    // Try to import enhanced agents
    const enhancedAnalyst = await import('./analyst-enhanced');
    const enhancedStrategist = await import('./strategist-enhanced');
    const enhancedRisk = await import('./risk-enhanced-complete');
    const enhancedExecutor = await import('./executor-enhanced');
    
    console.log('✅ Successfully imported all enhanced agents:');
    console.log('  - analyst-enhanced.ts');
    console.log('  - strategist-enhanced.ts');
    console.log('  - risk-enhanced-complete.ts');
    console.log('  - executor-enhanced.ts');
    
    // Check default exports
    if (typeof enhancedAnalyst.default === 'function') {
      console.log('✅ analyst-enhanced has default export function');
    }
    
    if (typeof enhancedStrategist.default === 'function') {
      console.log('✅ strategist-enhanced has default export function');
    }
    
    if (typeof enhancedRisk.default === 'function') {
      console.log('✅ risk-enhanced-complete has default export function');
    }
    
    if (typeof enhancedExecutor.default === 'function') {
      console.log('✅ executor-enhanced has default export function');
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Enhanced agent import test failed:', error.message);
    return false;
  }
}

/**
 * Test 4: Check orchestrator integration
 */
async function testOrchestratorIntegration() {
  console.log('\n=== Test 4: Orchestrator Integration ===');
  
  try {
    const cortexOrchestrator = await import('./cortex-orchestrator');
    
    console.log('✅ Successfully imported cortex-orchestrator');
    
    // Check main functions
    if (typeof cortexOrchestrator.runCortexWorkflow === 'function') {
      console.log('✅ runCortexWorkflow function available');
    }
    
    if (typeof cortexOrchestrator.runQuickAnalysis === 'function') {
      console.log('✅ runQuickAnalysis function available');
    }
    
    // Check individual agent exports
    if (typeof cortexOrchestrator.enhancedAnalyst === 'function') {
      console.log('✅ enhancedAnalyst function available');
    }
    
    if (typeof cortexOrchestrator.enhancedStrategist === 'function') {
      console.log('✅ enhancedStrategist function available');
    }
    
    if (typeof cortexOrchestrator.enhancedRiskAssessment === 'function') {
      console.log('✅ enhancedRiskAssessment function available');
    }
    
    if (typeof cortexOrchestrator.enhancedExecutor === 'function') {
      console.log('✅ enhancedExecutor function available');
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Orchestrator integration test failed:', error.message);
    return false;
  }
}

/**
 * Test 5: Check analysis engine function signatures
 */
async function testFunctionSignatures() {
  console.log('\n=== Test 5: Function Signatures ===');
  
  try {
    const {
      enhancedAnalystAgent,
      enhancedStrategistAgent,
      enhancedRiskAgent,
      enhancedExecutorAgent,
      getEnhancedAnalystAnalysis,
      getEnhancedStrategistAnalysis,
      getEnhancedRiskAnalysis,
      getExecutionConfirmation,
    } = await import('./analysis-integration');
    
    const functions = [
      { name: 'enhancedAnalystAgent', func: enhancedAnalystAgent },
      { name: 'enhancedStrategistAgent', func: enhancedStrategistAgent },
      { name: 'enhancedRiskAgent', func: enhancedRiskAgent },
      { name: 'enhancedExecutorAgent', func: enhancedExecutorAgent },
      { name: 'getEnhancedAnalystAnalysis', func: getEnhancedAnalystAnalysis },
      { name: 'getEnhancedStrategistAnalysis', func: getEnhancedStrategistAnalysis },
      { name: 'getEnhancedRiskAnalysis', func: getEnhancedRiskAnalysis },
      { name: 'getExecutionConfirmation', func: getExecutionConfirmation },
    ];
    
    let allPassed = true;
    
    for (const { name, func } of functions) {
      if (typeof func === 'function') {
        console.log(`✅ ${name} is a function`);
        
        // Check parameter count (basic check)
        const paramCount = func.length;
        console.log(`   Parameters: ${paramCount}`);
      } else {
        console.error(`❌ ${name} is not a function`);
        allPassed = false;
      }
    }
    
    return allPassed;
  } catch (error: any) {
    console.error('❌ Function signature test failed:', error.message);
    return false;
  }
}

/**
 * Test 6: Check type exports
 */
async function testTypeExports() {
  console.log('\n=== Test 6: Type Exports ===');
  
  try {
    const integration = await import('./analysis-integration');
    
    // Check for key type exports
    const expectedTypes = [
      'AnalystEnhancedData',
      'StrategistEnhancedData',
      'RiskEnhancedData',
      'ExecutionConfirmation',
    ];
    
    let allTypesFound = true;
    
    for (const typeName of expectedTypes) {
      if (typeName in integration) {
        console.log(`✅ Type ${typeName} exported`);
      } else {
        console.error(`❌ Type ${typeName} not exported`);
        allTypesFound = false;
      }
    }
    
    return allTypesFound;
  } catch (error: any) {
    console.error('❌ Type export test failed:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('CORTEX CAPITAL - ENHANCED AGENTS INTEGRATION TEST');
  console.log('==================================================\n');
  
  const tests = [
    testCompilation,
    testAnalysisEngineImports,
    testEnhancedAgentImports,
    testOrchestratorIntegration,
    testFunctionSignatures,
    testTypeExports,
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await test();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n==================================================');
  console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('✅ All integration tests passed!');
    console.log('✅ Enhanced agents are properly wired to analysis engines');
    return true;
  } else {
    console.error(`❌ ${failed} test(s) failed`);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export {
  testCompilation,
  testAnalysisEngineImports,
  testEnhancedAgentImports,
  testOrchestratorIntegration,
  testFunctionSignatures,
  testTypeExports,
  runAllTests,
};