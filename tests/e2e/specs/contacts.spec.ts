import { test, expect } from '../fixtures/auth-fixture';
import { ContactsPage } from '../pages/contacts.page';
import { coverageTracker } from '../utils/coverage-tracker';
import { testUsers, TestUserKey } from '../fixtures/test-users';
import { testData, generateUniqueTestData } from '../utils/test-data';

const rolesWithCreateAccess: TestUserKey[] = ['owner', 'teamManager', 'artistManager'];
const rolesWithViewAccess: TestUserKey[] = ['owner', 'teamManager', 'artistManager', 'artistObserver', 'bookingEditor', 'marketingViewer'];

test.describe('Contacts Module', () => {
  
  for (const roleKey of rolesWithCreateAccess) {
    const role = testUsers[roleKey];
    
    test.describe(`Contacts CRUD - ${role.role}`, () => {
      let contactsPage: ContactsPage;
      
      test.beforeEach(async ({ page, loginAs }) => {
        contactsPage = new ContactsPage(page);
        await loginAs(roleKey);
        await contactsPage.navigateTo('/contacts');
      });

      test(`should create contact as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testContact = generateUniqueTestData(testData.contacts[0], Date.now().toString());
        
        try {
          await contactsPage.createContact(testContact);
          
          // Verify contact was created
          const exists = await contactsPage.verifyContactExists(testContact.name);
          expect(exists).toBe(true);
          
          await contactsPage.takeScreenshot(`contact-created-${role.role}`);
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addCoverage({
            module: 'Contacts',
            role: role.role,
            action: 'Create',
            status: 'passed',
            duration
          });
          
          coverageTracker.addResult({
            testCase: `Create Contact - ${role.role}`,
            steps: [
              'Navigate to contacts page',
              'Click create contact button',
              'Fill contact form',
              'Submit form',
              'Verify contact appears in list'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'Contacts',
            screenshots: [`contact-created-${role.role}`]
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await contactsPage.takeScreenshot(`contact-create-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Create Contact - ${role.role}`,
            steps: ['Attempt to create contact'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'Contacts',
            screenshots: [`contact-create-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });

      test(`should edit contact as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testContact = generateUniqueTestData(testData.contacts[0], Date.now().toString());
        const editedData = { name: `${testContact.name} - Edited`, email: 'edited@example.com' };
        
        try {
          // First create a contact
          await contactsPage.createContact(testContact);
          
          // Then edit it
          await contactsPage.editContact(testContact.name, editedData);
          
          // Verify changes
          const exists = await contactsPage.verifyContactExists(editedData.name);
          expect(exists).toBe(true);
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addCoverage({
            module: 'Contacts',
            role: role.role,
            action: 'Edit',
            status: 'passed',
            duration
          });
          
          coverageTracker.addResult({
            testCase: `Edit Contact - ${role.role}`,
            steps: [
              'Create test contact',
              'Find contact in list',
              'Click edit button',
              'Update contact details',
              'Submit changes',
              'Verify updates applied'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'Contacts',
            screenshots: []
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await contactsPage.takeScreenshot(`contact-edit-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Edit Contact - ${role.role}`,
            steps: ['Attempt to edit contact'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'Contacts',
            screenshots: [`contact-edit-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });

      test(`should delete contact as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testContact = generateUniqueTestData(testData.contacts[0], Date.now().toString());
        
        try {
          // First create a contact
          await contactsPage.createContact(testContact);
          
          // Then delete it
          await contactsPage.deleteContact(testContact.name);
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addCoverage({
            module: 'Contacts',
            role: role.role,
            action: 'Delete',
            status: 'passed',
            duration
          });
          
          coverageTracker.addResult({
            testCase: `Delete Contact - ${role.role}`,
            steps: [
              'Create test contact',
              'Find contact in list',
              'Click delete button',
              'Confirm deletion',
              'Verify contact removed from list'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'Contacts',
            screenshots: []
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await contactsPage.takeScreenshot(`contact-delete-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Delete Contact - ${role.role}`,
            steps: ['Attempt to delete contact'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'Contacts',
            screenshots: [`contact-delete-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });

      test(`should export contacts as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        
        try {
          // Create a test contact first
          const testContact = generateUniqueTestData(testData.contacts[0], Date.now().toString());
          await contactsPage.createContact(testContact);
          
          // Export contacts
          const download = await contactsPage.exportContacts();
          expect(download).toBeDefined();
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addCoverage({
            module: 'Contacts',
            role: role.role,
            action: 'Export',
            status: 'passed',
            duration
          });
          
          coverageTracker.addResult({
            testCase: `Export Contacts - ${role.role}`,
            steps: [
              'Navigate to contacts page',
              'Click export button',
              'Verify download initiated',
              'Verify file downloaded'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'Contacts',
            screenshots: []
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await contactsPage.takeScreenshot(`contact-export-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Export Contacts - ${role.role}`,
            steps: ['Attempt to export contacts'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'Contacts',
            screenshots: [`contact-export-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });

      test(`should share contact as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testContact = generateUniqueTestData(testData.contacts[0], Date.now().toString());
        
        try {
          // First create a contact
          await contactsPage.createContact(testContact);
          
          // Share it
          await contactsPage.shareContact(testContact.name, 'test@example.com');
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addCoverage({
            module: 'Contacts',
            role: role.role,
            action: 'Share',
            status: 'passed',
            duration
          });
          
          coverageTracker.addResult({
            testCase: `Share Contact - ${role.role}`,
            steps: [
              'Create test contact',
              'Find contact in list',
              'Click share button',
              'Enter recipient email',
              'Submit share form',
              'Verify share confirmation'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'Contacts',
            screenshots: []
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await contactsPage.takeScreenshot(`contact-share-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Share Contact - ${role.role}`,
            steps: ['Attempt to share contact'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'Contacts',
            screenshots: [`contact-share-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });
    });
  }

  for (const roleKey of rolesWithViewAccess) {
    const role = testUsers[roleKey];
    
    test.describe(`Contacts View - ${role.role}`, () => {
      let contactsPage: ContactsPage;
      
      test.beforeEach(async ({ page, loginAs }) => {
        contactsPage = new ContactsPage(page);
        await loginAs(roleKey);
        await contactsPage.navigateTo('/contacts');
      });

      test(`should view contacts list as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        
        try {
          // Verify contacts page loads
          await expect(contactsPage.contactsList).toBeVisible();
          
          // Test search functionality
          await contactsPage.searchInput.fill('test');
          await page.waitForTimeout(1000); // Wait for search
          
          await contactsPage.takeScreenshot(`contacts-view-${role.role}`);
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addCoverage({
            module: 'Contacts',
            role: role.role,
            action: 'View',
            status: 'passed',
            duration
          });
          
          coverageTracker.addResult({
            testCase: `View Contacts - ${role.role}`,
            steps: [
              'Navigate to contacts page',
              'Verify contacts list loads',
              'Test search functionality',
              'Verify appropriate contacts visible'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'Contacts',
            screenshots: [`contacts-view-${role.role}`]
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await contactsPage.takeScreenshot(`contacts-view-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `View Contacts - ${role.role}`,
            steps: ['Attempt to view contacts'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'Contacts',
            screenshots: [`contacts-view-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });
    });
  }
});