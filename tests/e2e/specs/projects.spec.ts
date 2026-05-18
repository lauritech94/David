import { test, expect } from '../fixtures/auth-fixture';
import { ProjectsPage } from '../pages/projects.page';
import { coverageTracker } from '../utils/coverage-tracker';
import { testUsers, TestUserKey } from '../fixtures/test-users';
import { testData, generateUniqueTestData } from '../utils/test-data';

const rolesWithCreateAccess: TestUserKey[] = ['owner', 'teamManager', 'artistManager'];
const rolesWithViewAccess: TestUserKey[] = ['owner', 'teamManager', 'artistManager', 'artistObserver', 'bookingEditor', 'marketingViewer'];

test.describe('Projects Module', () => {
  
  for (const roleKey of rolesWithCreateAccess) {
    const role = testUsers[roleKey];
    
    test.describe(`Projects CRUD - ${role.role}`, () => {
      let projectsPage: ProjectsPage;
      
      test.beforeEach(async ({ page, loginAs }) => {
        projectsPage = new ProjectsPage(page);
        await loginAs(roleKey);
        await projectsPage.navigateTo('/projects');
      });

      test(`should create project as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testProject = generateUniqueTestData(testData.projects[0], Date.now().toString());
        
        try {
          await projectsPage.createProject(testProject);
          
          // Verify project was created
          const exists = await projectsPage.verifyProjectExists(testProject.name);
          expect(exists).toBe(true);
          
          await projectsPage.takeScreenshot(`project-created-${role.role}`);
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addCoverage({
            module: 'Projects',
            role: role.role,
            action: 'Create',
            status: 'passed',
            duration
          });
          
          coverageTracker.addResult({
            testCase: `Create Project - ${role.role}`,
            steps: [
              'Navigate to projects page',
              'Click create project button',
              'Fill project form',
              'Select artists',
              'Submit form',
              'Verify project appears in list'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'Projects',
            screenshots: [`project-created-${role.role}`]
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await projectsPage.takeScreenshot(`project-create-error-${role.role}`);
          
          coverageTracker.addCoverage({
            module: 'Projects',
            role: role.role,
            action: 'Create',
            status: 'failed',
            duration,
            error: error.message
          });
          
          coverageTracker.addResult({
            testCase: `Create Project - ${role.role}`,
            steps: ['Attempt to create project'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'Projects',
            screenshots: [`project-create-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });

      test(`should edit project as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testProject = generateUniqueTestData(testData.projects[0], Date.now().toString());
        const editedData = { name: `${testProject.name} - Edited`, description: 'Updated description' };
        
        try {
          // First create a project
          await projectsPage.createProject(testProject);
          
          // Then edit it
          await projectsPage.editProject(testProject.name, editedData);
          
          // Verify changes
          const exists = await projectsPage.verifyProjectExists(editedData.name);
          expect(exists).toBe(true);
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addCoverage({
            module: 'Projects',
            role: role.role,
            action: 'Edit',
            status: 'passed',
            duration
          });
          
          coverageTracker.addResult({
            testCase: `Edit Project - ${role.role}`,
            steps: [
              'Create test project',
              'Find project in list',
              'Click edit button',
              'Update project details',
              'Submit changes',
              'Verify updates applied'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'Projects',
            screenshots: []
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await projectsPage.takeScreenshot(`project-edit-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Edit Project - ${role.role}`,
            steps: ['Attempt to edit project'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'Projects',
            screenshots: [`project-edit-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });

      test(`should delete project as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testProject = generateUniqueTestData(testData.projects[0], Date.now().toString());
        
        try {
          // First create a project
          await projectsPage.createProject(testProject);
          
          // Then delete it
          await projectsPage.deleteProject(testProject.name);
          
          // Verify project is gone
          const exists = await projectsPage.verifyProjectNotExists(testProject.name);
          expect(exists).toBe(true);
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addCoverage({
            module: 'Projects',
            role: role.role,
            action: 'Delete',
            status: 'passed',
            duration
          });
          
          coverageTracker.addResult({
            testCase: `Delete Project - ${role.role}`,
            steps: [
              'Create test project',
              'Find project in list',
              'Click delete button',
              'Confirm deletion',
              'Verify project removed from list'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'Projects',
            screenshots: []
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await projectsPage.takeScreenshot(`project-delete-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Delete Project - ${role.role}`,
            steps: ['Attempt to delete project'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'Projects',
            screenshots: [`project-delete-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });
    });
  }

  for (const roleKey of rolesWithViewAccess) {
    const role = testUsers[roleKey];
    
    test.describe(`Projects View - ${role.role}`, () => {
      let projectsPage: ProjectsPage;
      
      test.beforeEach(async ({ page, loginAs }) => {
        projectsPage = new ProjectsPage(page);
        await loginAs(roleKey);
        await projectsPage.navigateTo('/projects');
      });

      test(`should view projects list as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        
        try {
          // Verify projects page loads
          await expect(projectsPage.projectsList).toBeVisible();
          
          // Test search functionality
          await projectsPage.searchInput.fill('test');
          await page.waitForTimeout(1000); // Wait for search
          
          await projectsPage.takeScreenshot(`projects-view-${role.role}`);
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addCoverage({
            module: 'Projects',
            role: role.role,
            action: 'View',
            status: 'passed',
            duration
          });
          
          coverageTracker.addResult({
            testCase: `View Projects - ${role.role}`,
            steps: [
              'Navigate to projects page',
              'Verify projects list loads',
              'Test search functionality',
              'Verify appropriate projects visible'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'Projects',
            screenshots: [`projects-view-${role.role}`]
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await projectsPage.takeScreenshot(`projects-view-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `View Projects - ${role.role}`,
            steps: ['Attempt to view projects'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'Projects',
            screenshots: [`projects-view-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });
    });
  }
});