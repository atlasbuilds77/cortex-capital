// Test Authentication Flow
// Run with: tsx test-auth-flow.ts

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';

interface TestResult {
  test: string;
  status: 'pass' | 'fail';
  message: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ test: name, status: 'pass', message: 'Success' });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({
      test: name,
      status: 'fail',
      message: error.response?.data?.error || error.message,
    });
    console.log(`❌ ${name}: ${error.response?.data?.error || error.message}`);
  }
}

async function runTests() {
  console.log('🧪 Testing Cortex Capital Authentication Flow\n');
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';
  let accessToken = '';
  let refreshToken = '';
  let userId = '';
  
  // 1. Health Check
  await test('Health Check', async () => {
    const response = await axios.get(`${API_URL}/health`);
    if (response.data.status !== 'ok') {
      throw new Error('Health check failed');
    }
  });
  
  // 2. Detailed Health Check
  await test('Detailed Health Check', async () => {
    const response = await axios.get(`${API_URL}/health/detailed`);
    if (!response.data.checks.database) {
      throw new Error('Database health check missing');
    }
  });
  
  // 3. Signup
  await test('Signup', async () => {
    const response = await axios.post(`${API_URL}/api/auth/signup`, {
      email: testEmail,
      password: testPassword,
      tier: 'scout',
      risk_profile: 'moderate',
    });
    
    if (!response.data.success) {
      throw new Error('Signup failed');
    }
    
    accessToken = response.data.data.access_token;
    refreshToken = response.data.data.refresh_token;
    userId = response.data.data.user.id;
    
    if (!accessToken || !refreshToken) {
      throw new Error('No tokens returned');
    }
  });
  
  // 4. Get Current User
  await test('Get Current User', async () => {
    const response = await axios.get(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (response.data.data.email !== testEmail) {
      throw new Error('User email mismatch');
    }
  });
  
  // 5. Get User Profile
  await test('Get User Profile', async () => {
    const response = await axios.get(`${API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!response.data.data.constraints) {
      throw new Error('User preferences not found');
    }
  });
  
  // 6. Update Profile
  await test('Update Profile', async () => {
    await axios.put(
      `${API_URL}/api/user/profile`,
      { tier: 'operator' },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  });
  
  // 7. Update Preferences
  await test('Update Preferences', async () => {
    await axios.put(
      `${API_URL}/api/user/preferences`,
      {
        risk_profile: 'aggressive',
        day_trading_allocation: 0.1,
        options_allocation: 0.15,
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  });
  
  // 8. Refresh Token
  await test('Refresh Token', async () => {
    const response = await axios.post(`${API_URL}/api/auth/refresh`, {
      refresh_token: refreshToken,
    });
    
    if (!response.data.data.access_token) {
      throw new Error('No new access token');
    }
    
    // Update access token for next tests
    accessToken = response.data.data.access_token;
  });
  
  // 9. List Brokers (should be empty)
  await test('List Brokers', async () => {
    const response = await axios.get(`${API_URL}/api/brokers`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!Array.isArray(response.data.data)) {
      throw new Error('Brokers response not an array');
    }
  });
  
  // 10. Test Invalid Token
  await test('Reject Invalid Token', async () => {
    try {
      await axios.get(`${API_URL}/api/user/profile`, {
        headers: { Authorization: 'Bearer invalid_token' },
      });
      throw new Error('Should have rejected invalid token');
    } catch (error: any) {
      if (error.response?.status !== 401) {
        throw new Error('Should return 401 for invalid token');
      }
    }
  });
  
  // 11. Test Missing Token
  await test('Reject Missing Token', async () => {
    try {
      await axios.get(`${API_URL}/api/user/profile`);
      throw new Error('Should have rejected missing token');
    } catch (error: any) {
      if (error.response?.status !== 401) {
        throw new Error('Should return 401 for missing token');
      }
    }
  });
  
  // 12. Logout
  await test('Logout', async () => {
    await axios.post(
      `${API_URL}/api/auth/logout`,
      { refresh_token: refreshToken },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  });
  
  // 13. Test Revoked Token
  await test('Reject Revoked Token', async () => {
    try {
      await axios.post(`${API_URL}/api/auth/refresh`, {
        refresh_token: refreshToken,
      });
      throw new Error('Should have rejected revoked token');
    } catch (error: any) {
      if (error.response?.status !== 401) {
        throw new Error('Should return 401 for revoked token');
      }
    }
  });
  
  // 14. Login Again
  await test('Login', async () => {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: testEmail,
      password: testPassword,
    });
    
    if (!response.data.success) {
      throw new Error('Login failed');
    }
    
    accessToken = response.data.data.access_token;
  });
  
  // 15. Delete Account
  await test('Delete Account', async () => {
    await axios.delete(`${API_URL}/api/user`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  });
  
  // 16. Verify Account Deleted
  await test('Verify Account Deleted', async () => {
    try {
      await axios.post(`${API_URL}/api/auth/login`, {
        email: testEmail,
        password: testPassword,
      });
      throw new Error('Should not be able to login with deleted account');
    } catch (error: any) {
      if (error.response?.status !== 401) {
        throw new Error('Should return 401 for deleted account');
      }
    }
  });
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => r.status === 'fail')
      .forEach(r => console.log(`   - ${r.test}: ${r.message}`));
  }
  
  console.log('\n' + '='.repeat(50));
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
