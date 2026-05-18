import { test as base, expect } from '@playwright/test';
import { testUsers, TestUserKey } from './test-users';

interface AuthFixture {
  authenticatedPage: any;
  loginAs: (userKey: TestUserKey) => Promise<void>;
  logout: () => Promise<void>;
}

export const test = base.extend<AuthFixture>({
  authenticatedPage: async ({ page }, use) => {
    await use(page);
  },

  loginAs: async ({ page }, use) => {
    const loginAs = async (userKey: TestUserKey) => {
      const user = testUsers[userKey];
      
      console.log(`🔐 Logging in as ${user.email} (${user.role})`);
      
      // Navigate to login page
      await page.goto('/auth', { waitUntil: 'networkidle' });
      
      // Wait for auth page to load
      await page.waitForSelector('[data-testid="email-input"], input[type="email"]', { timeout: 10000 });
      
      // Fill login form - try different selectors
      const emailInput = page.locator('[data-testid="email-input"], input[type="email"]').first();
      const passwordInput = page.locator('[data-testid="password-input"], input[type="password"]').first();
      
      await emailInput.fill(user.email);
      await passwordInput.fill(user.password);
      
      // Submit form - try different selectors
      const submitButton = page.locator('[data-testid="login-button"], button[type="submit"], button:has-text("Iniciar sesión"), button:has-text("Login")').first();
      await submitButton.click();
      
      // Wait for successful login - be more flexible with selectors
      try {
        await page.waitForSelector('[data-testid="dashboard-content"], [data-testid="user-menu"], .dashboard, main', { timeout: 15000 });
      } catch (error) {
        // If direct selectors fail, wait for URL change
        await page.waitForURL(url => !url.includes('/auth'), { timeout: 15000 });
      }
      
      // Verify we're logged in by checking for user-related elements
      const userIndicators = [
        '[data-testid="user-menu"]',
        '[data-testid="profile-menu"]', 
        'button:has-text("' + user.email + '")',
        '.user-menu',
        '[role="button"]:has-text("Dashboard")'
      ];
      
      let isLoggedIn = false;
      for (const selector of userIndicators) {
        if (await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false)) {
          isLoggedIn = true;
          break;
        }
      }
      
      if (!isLoggedIn) {
        throw new Error(`Login verification failed for ${user.email}. Could not find user menu or profile indicators.`);
      }
      
      console.log(`✅ Successfully logged in as ${user.email}`);
    };
    
    await use(loginAs);
  },

  logout: async ({ page }, use) => {
    const logout = async () => {
      console.log('🚪 Logging out');
      
      try {
        // Try to find and click user menu
        const userMenuSelectors = [
          '[data-testid="user-menu"]',
          '[data-testid="profile-menu"]',
          '.user-menu',
          'button:has([data-testid="user-avatar"])',
          'button[aria-label*="user" i]'
        ];
        
        let userMenuClicked = false;
        for (const selector of userMenuSelectors) {
          if (await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false)) {
            await page.locator(selector).click();
            userMenuClicked = true;
            break;
          }
        }
        
        if (!userMenuClicked) {
          console.warn('Could not find user menu, attempting direct logout');
        }
        
        // Try to find and click logout button
        const logoutSelectors = [
          '[data-testid="logout-button"]',
          'button:has-text("Cerrar sesión")',
          'button:has-text("Logout")',
          'button:has-text("Salir")',
          '[role="menuitem"]:has-text("Logout")'
        ];
        
        for (const selector of logoutSelectors) {
          if (await page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false)) {
            await page.locator(selector).click();
            break;
          }
        }
        
        // Wait for redirect to auth page or homepage
        await page.waitForURL(url => url.includes('/auth') || url.endsWith('/'), { timeout: 10000 });
        
      } catch (error) {
        console.warn('Logout may have failed, but continuing...', error.message);
        // Force navigate to auth page if logout fails
        await page.goto('/auth');
      }
      
      console.log('✅ Logout completed');
    };
    
    await use(logout);
  }
});

export { expect } from '@playwright/test';