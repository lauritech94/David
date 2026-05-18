import { test, expect } from '../fixtures/auth-fixture';
import { BudgetsPage } from '../pages/budgets.page';
import { coverageTracker } from '../utils/coverage-tracker';
import { testUsers, TestUserKey } from '../fixtures/test-users';
import { testData, generateUniqueTestData } from '../utils/test-data';

const rolesWithCreateAccess: TestUserKey[] = ['owner', 'teamManager', 'artistManager'];
const rolesWithViewAccess: TestUserKey[] = ['owner', 'teamManager', 'artistManager', 'bookingEditor'];

test.describe('Budgets Module', () => {
  
  for (const roleKey of rolesWithCreateAccess) {
    const role = testUsers[roleKey];
    
    test.describe(`Budgets CRUD - ${role.role}`, () => {
      let budgetsPage: BudgetsPage;
      
      test.beforeEach(async ({ page, loginAs }) => {
        budgetsPage = new BudgetsPage(page);
        await loginAs(roleKey);
        await budgetsPage.navigateTo('/budgets');
      });

      test(`should create budget as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testBudget = generateUniqueTestData(testData.budgets[0], Date.now().toString());
        
        try {
          await budgetsPage.createBudget(testBudget);
          
          // Verify budget was created
          const exists = await budgetsPage.verifyBudgetExists(testBudget.name);
          expect(exists).toBe(true);
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addCoverage({
            module: 'Budgets',
            role: role.role,
            action: 'Create',
            status: 'passed',
            duration
          });
          
          coverageTracker.addResult({
            testCase: `Create Budget - ${role.role}`,
            steps: [
              'Navigate to budgets page',
              'Click create budget button',
              'Fill budget form',
              'Add budget categories',
              'Submit form',
              'Verify budget appears in list'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'Budgets',
            screenshots: []
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await budgetsPage.takeScreenshot(`budget-create-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Create Budget - ${role.role}`,
            steps: ['Attempt to create budget'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'Budgets',
            screenshots: [`budget-create-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });

      test(`should export budget as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testBudget = generateUniqueTestData(testData.budgets[0], Date.now().toString());
        
        try {
          // First create a budget
          await budgetsPage.createBudget(testBudget);
          
          // Export it
          const download = await budgetsPage.exportBudget(testBudget.name);
          expect(download).toBeDefined();
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addCoverage({
            module: 'Budgets',
            role: role.role,
            action: 'Export',
            status: 'passed',
            duration
          });
          
          coverageTracker.addResult({
            testCase: `Export Budget - ${role.role}`,
            steps: [
              'Create test budget',
              'Find budget in list',
              'Click export button',
              'Verify download initiated'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'Budgets',
            screenshots: []
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await budgetsPage.takeScreenshot(`budget-export-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Export Budget - ${role.role}`,
            steps: ['Attempt to export budget'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'Budgets',
            screenshots: [`budget-export-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });
    });
  }
});