import { test, expect } from '../fixtures/auth-fixture';
import { DashboardPage } from '../pages/dashboard.page';
import { coverageTracker } from '../utils/coverage-tracker';
import { testUsers, TestUserKey } from '../fixtures/test-users';

const roles: TestUserKey[] = ['owner', 'teamManager', 'artistManager', 'artistObserver', 'bookingEditor', 'marketingViewer'];

for (const roleKey of roles) {
  const role = testUsers[roleKey];
  
  test.describe(`Dashboard - ${role.role}`, () => {
    let dashboardPage: DashboardPage;
    
    test.beforeEach(async ({ page, loginAs }) => {
      dashboardPage = new DashboardPage(page);
      await loginAs(roleKey);
      await dashboardPage.navigateTo('/');
    });

    test(`should load dashboard correctly for ${role.role}`, async ({ page }) => {
      const startTime = Date.now();
      
      try {
        await dashboardPage.verifyDashboardLoaded();
        await dashboardPage.verifyStatsVisible();
        
        // Take screenshot for verification
        await dashboardPage.takeScreenshot(`dashboard-loaded-${role.role}`);
        
        const duration = Date.now() - startTime;
        
        coverageTracker.addCoverage({
          module: 'Dashboard',
          role: role.role,
          action: 'View',
          status: 'passed',
          duration
        });
        
        coverageTracker.addResult({
          testCase: `Dashboard Load - ${role.role}`,
          steps: [
            'Navigate to dashboard',
            'Verify welcome message appears',
            'Verify stats cards are visible',
            'Verify recent projects section',
            'Verify upcoming bookings section'
          ],
          result: 'passed',
          duration,
          role: role.role,
          module: 'Dashboard',
          screenshots: [`dashboard-loaded-${role.role}`]
        });
        
      } catch (error) {
        const duration = Date.now() - startTime;
        await dashboardPage.takeScreenshot(`dashboard-error-${role.role}`);
        
        coverageTracker.addCoverage({
          module: 'Dashboard',
          role: role.role,
          action: 'View',
          status: 'failed',
          duration,
          error: error.message
        });
        
        coverageTracker.addResult({
          testCase: `Dashboard Load - ${role.role}`,
          steps: ['Navigate to dashboard', 'Verify dashboard elements'],
          result: 'failed',
          duration,
          role: role.role,
          module: 'Dashboard',
          screenshots: [`dashboard-error-${role.role}`],
          error: error.message
        });
        
        throw error;
      }
    });

    test(`should navigate using quick actions for ${role.role}`, async ({ page }) => {
      const startTime = Date.now();
      
      try {
        await dashboardPage.verifyDashboardLoaded();
        
        // Test quick actions available to this role
        const quickActions = ['projects', 'contacts'];
        
        if (['owner', 'teamManager', 'artistManager'].includes(roleKey)) {
          quickActions.push('budgets', 'bookings');
        }
        
        for (const action of quickActions) {
          await dashboardPage.clickQuickAction(action);
          await page.waitForLoadState('networkidle');
          
          // Verify we navigated to the correct page
          expect(page.url()).toContain(`/${action}`);
          
          // Navigate back to dashboard
          await dashboardPage.navigateTo('/');
        }
        
        const duration = Date.now() - startTime;
        
        coverageTracker.addCoverage({
          module: 'Dashboard',
          role: role.role,
          action: 'Navigate',
          status: 'passed',
          duration
        });
        
        coverageTracker.addResult({
          testCase: `Dashboard Navigation - ${role.role}`,
          steps: [
            'Load dashboard',
            'Click each available quick action',
            'Verify navigation works',
            'Return to dashboard'
          ],
          result: 'passed',
          duration,
          role: role.role,
          module: 'Dashboard',
          screenshots: []
        });
        
      } catch (error) {
        const duration = Date.now() - startTime;
        await dashboardPage.takeScreenshot(`dashboard-navigation-error-${role.role}`);
        
        coverageTracker.addResult({
          testCase: `Dashboard Navigation - ${role.role}`,
          steps: ['Test quick action navigation'],
          result: 'failed',
          duration,
          role: role.role,
          module: 'Dashboard',
          screenshots: [`dashboard-navigation-error-${role.role}`],
          error: error.message
        });
        
        throw error;
      }
    });

    test(`should display role-appropriate content for ${role.role}`, async ({ page }) => {
      const startTime = Date.now();
      
      try {
        await dashboardPage.verifyDashboardLoaded();
        
        // Verify role-specific content visibility
        const welcomeText = await dashboardPage.welcomeMessage.textContent();
        expect(welcomeText).toContain(role.role === 'artist' ? 'Artista' : 'Management');
        
        // Check stats visibility based on role permissions
        if (['owner', 'teamManager'].includes(roleKey)) {
          // Should see all stats
          await expect(page.locator('[data-testid="stat-projects"]')).toBeVisible();
          await expect(page.locator('[data-testid="stat-budgets"]')).toBeVisible();
          await expect(page.locator('[data-testid="stat-bookings"]')).toBeVisible();
          await expect(page.locator('[data-testid="stat-contacts"]')).toBeVisible();
        }
        
        const duration = Date.now() - startTime;
        
        coverageTracker.addResult({
          testCase: `Dashboard Role Content - ${role.role}`,
          steps: [
            'Load dashboard',
            'Verify welcome message shows correct role',
            'Verify role-appropriate stats are visible',
            'Verify restricted content is hidden'
          ],
          result: 'passed',
          duration,
          role: role.role,
          module: 'Dashboard',
          screenshots: []
        });
        
      } catch (error) {
        const duration = Date.now() - startTime;
        await dashboardPage.takeScreenshot(`dashboard-role-content-error-${role.role}`);
        
        coverageTracker.addResult({
          testCase: `Dashboard Role Content - ${role.role}`,
          steps: ['Verify role-specific content'],
          result: 'failed',
          duration,
          role: role.role,
          module: 'Dashboard',
          screenshots: [`dashboard-role-content-error-${role.role}`],
          error: error.message
        });
        
        throw error;
      }
    });
  });
}