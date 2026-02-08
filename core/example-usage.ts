// Example usage of the Proposal Service
import { ProposalService } from './proposal-service';

async function runExamples() {
  console.log('=== Autonomous Trading Company - Proposal Service Examples ===\n');
  
  const proposalService = new ProposalService();

  // Example 1: Signal analysis proposal (should auto-approve)
  console.log('1. Signal Analysis Proposal (should auto-approve):');
  console.log('---------------------------------------------------');
  const analysisResult = await proposalService.createProposalAndMaybeAutoApprove(
    'intel',
    'Analyze BTC volume spike',
    ['analyze_signal'],
    {
      token: 'BTC',
      signal_source: 'volume_spike',
      confidence: 0.75
    }
  );
  
  console.log(`Success: ${analysisResult.success}`);
  console.log(`Auto-approved: ${analysisResult.auto_approved}`);
  if (analysisResult.error) console.log(`Error: ${analysisResult.error}`);
  if (analysisResult.mission) console.log(`Mission ID: ${analysisResult.mission.id}`);
  console.log();

  // Example 2: Trade proposal (should require roundtable)
  console.log('2. Trade Proposal (should require roundtable):');
  console.log('----------------------------------------------');
  const tradeResult = await proposalService.createProposalAndMaybeAutoApprove(
    'atlas',
    'Buy SOL at $150',
    ['execute_trade'],
    {
      token: 'SOL',
      entry_price: 150,
      size: 0.4,
      target: 180,
      stop_loss: 130
    }
  );
  
  console.log(`Success: ${tradeResult.success}`);
  console.log(`Auto-approved: ${tradeResult.auto_approved}`);
  console.log(`Status: ${tradeResult.proposal?.status}`);
  if (tradeResult.error) console.log(`Error: ${tradeResult.error}`);
  console.log();

  // Example 3: Multi-step proposal with trade (should require roundtable)
  console.log('3. Multi-step Proposal with Trade (should require roundtable):');
  console.log('--------------------------------------------------------------');
  const multiStepResult = await proposalService.createProposalAndMaybeAutoApprove(
    'sage',
    'Analyze and potentially trade ETH',
    ['analyze_signal', 'calculate_risk', 'execute_trade'],
    {
      token: 'ETH',
      entry_price: 3200,
      size: 0.2
    }
  );
  
  console.log(`Success: ${multiStepResult.success}`);
  console.log(`Auto-approved: ${multiStepResult.auto_approved}`);
  console.log(`Status: ${multiStepResult.proposal?.status}`);
  console.log();

  // Example 4: Using helper method for trade
  console.log('4. Using createTradeProposal helper:');
  console.log('------------------------------------');
  const helperResult = await proposalService.createTradeProposal(
    'scout',
    'AVAX',
    40,
    2.5,
    48,
    36
  );
  
  console.log(`Success: ${helperResult.success}`);
  console.log(`Auto-approved: ${helperResult.auto_approved}`);
  console.log();

  // Example 5: Test cap gates directly
  console.log('5. Testing Cap Gates Directly:');
  console.log('-------------------------------');
  const gateFunctions = proposalService.getAllCapGateFunctions();
  
  // Test execute_trade gate
  const tradeGateResult = await gateFunctions.execute_trade({
    size: 0.5,
    entry_price: 150
  });
  console.log(`Execute trade gate: ${tradeGateResult.allowed ? 'PASS' : 'FAIL'} - ${tradeGateResult.reason}`);
  
  // Test analyze_signal gate
  const analysisGateResult = await gateFunctions.analyze_signal();
  console.log(`Analyze signal gate: ${analysisGateResult.allowed ? 'PASS' : 'FAIL'} - ${analysisGateResult.reason}`);
  console.log();

  // Example 6: Policy engine usage
  console.log('6. Policy Engine Examples:');
  console.log('---------------------------');
  const policyEngine = proposalService.getPolicyEngine();
  
  const autoApprovePolicy = await policyEngine.getPolicy('auto_approve');
  console.log('Auto-approve policy:', JSON.stringify(autoApprovePolicy, null, 2));
  
  const requiresRoundtable = await policyEngine.requiresRoundtable('execute_trade');
  console.log(`Execute trade requires roundtable: ${requiresRoundtable}`);
  
  const shouldAutoApprove = await policyEngine.evaluateAutoApprove(['analyze_signal', 'calculate_risk']);
  console.log(`Should auto-approve [analyze_signal, calculate_risk]: ${shouldAutoApprove}`);
  
  const shouldNotAutoApprove = await policyEngine.evaluateAutoApprove(['execute_trade']);
  console.log(`Should auto-approve [execute_trade]: ${shouldNotAutoApprove}`);
  console.log();

  // Example 7: Edge case - empty steps
  console.log('7. Edge Case - Empty Steps (should fail):');
  console.log('-----------------------------------------');
  const emptyResult = await proposalService.createProposalAndMaybeAutoApprove(
    'observer',
    'Empty proposal',
    [] as any,
    {}
  );
  
  console.log(`Success: ${emptyResult.success}`);
  console.log(`Error: ${emptyResult.error}`);
  console.log();

  console.log('=== Examples Complete ===');
}

// Run the examples
runExamples().catch(console.error);