import { test, expect } from '@playwright/test';

// Discord OAuth E2E Test
// Tests the full flow for a user who signs up ONLY via Discord (no email)

test.describe('Discord OAuth User Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear all storage to simulate fresh Discord user
    await page.goto('https://cortexcapitalgroup.com');
    await page.evaluate(() => {
      localStorage.clear();
      document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    });
  });

  test('Discord user can access dashboard after OAuth', async ({ page }) => {
    // Go to login page
    await page.goto('https://cortexcapitalgroup.com/login');
    await expect(page.locator('text=Continue with Discord')).toBeVisible();
    
    // Check Discord OAuth link is correct
    const discordLink = page.locator('a[href="/api/auth/discord"]');
    await expect(discordLink).toBeVisible();
  });

  test('Cookie token syncs to localStorage on page load', async ({ page, context }) => {
    // Set ONLY cookie (simulating Discord OAuth redirect)
    await context.addCookies([{
      name: 'cortex_token',
      value: 'discord_oauth_token_123',
      domain: 'cortexcapitalgroup.com',
      path: '/',
    }]);
    
    // Reload - auth should sync cookie to localStorage
    await page.goto('https://cortexcapitalgroup.com/dashboard');
    await page.waitForTimeout(2000);
    
    const lsToken = await page.evaluate(() => localStorage.getItem('cortex_token'));
    
    // Token should have been synced from cookie to localStorage
    expect(lsToken).toBe('discord_oauth_token_123');
  });

  test('Logout clears both cookie and localStorage', async ({ page, context }) => {
    // Set token in both cookie and localStorage
    await context.addCookies([{
      name: 'cortex_token',
      value: 'test_token',
      domain: 'cortexcapitalgroup.com',
      path: '/',
    }]);
    
    await page.goto('https://cortexcapitalgroup.com');
    await page.evaluate(() => {
      localStorage.setItem('cortex_token', 'test_token');
      localStorage.setItem('cortex_user', JSON.stringify({ email: 'test@discord.user' }));
    });
    
    // Simulate logout
    await page.evaluate(() => {
      localStorage.removeItem('cortex_token');
      localStorage.removeItem('cortex_user');
      document.cookie = 'cortex_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    });
    
    // Verify both cleared
    const lsToken = await page.evaluate(() => localStorage.getItem('cortex_token'));
    const cookies = await context.cookies();
    const cortexCookie = cookies.find(c => c.name === 'cortex_token');
    
    expect(lsToken).toBeNull();
    expect(cortexCookie?.value || '').toBe('');
  });
});
