// Cortex Capital - Test Tradier Integration
// Verify API connection and data fetching

import { getUserProfile, getAccounts, getPositions, getBalances } from '../integrations/tradier';
import { analyzePortfolio } from '../agents/analyst';

const testTradier = async () => {
  console.log('🔬 Testing Tradier API integration...\n');

  try {
    // 1. Get user profile
    console.log('1️⃣ Fetching user profile...');
    const profile = await getUserProfile();
    console.log('✅ Profile:', {
      id: profile.id,
      name: profile.name,
      account_number: profile.account.account_number,
    });

    // 2. Get accounts
    console.log('\n2️⃣ Fetching accounts...');
    const accounts = await getAccounts();
    console.log('✅ Accounts:', accounts);

    // 3. Get positions
    const accountId = accounts[0];
    console.log(`\n3️⃣ Fetching positions for account ${accountId}...`);
    const positions = await getPositions(accountId);
    console.log(`✅ Found ${positions.length} positions:`);
    positions.forEach((pos) => {
      console.log(`  - ${pos.symbol}: ${pos.quantity} shares @ $${pos.cost_basis.toFixed(2)}`);
    });

    // 4. Get balances
    console.log(`\n4️⃣ Fetching balances for account ${accountId}...`);
    const balances = await getBalances(accountId);
    console.log('✅ Balances:', {
      total_equity: balances.total_equity,
      total_cash: balances.total_cash,
      market_value: balances.market_value,
    });

    // 5. Analyze portfolio
    console.log(`\n5️⃣ Running ANALYST agent...`);
    const report = await analyzePortfolio(accountId);
    console.log('✅ ANALYST Report:');
    console.log(JSON.stringify(report, null, 2));

    console.log('\n🎉 All tests passed!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
};

testTradier();
