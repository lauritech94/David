import { test, expect } from '../fixtures/auth-fixture';
import { EPKsPage } from '../pages/epks.page';
import { coverageTracker } from '../utils/coverage-tracker';
import { testUsers, TestUserKey } from '../fixtures/test-users';
import { testData, generateUniqueTestData } from '../utils/test-data';

const rolesWithCreateAccess: TestUserKey[] = ['owner', 'teamManager', 'artistManager'];
const rolesWithViewAccess: TestUserKey[] = ['owner', 'teamManager', 'artistManager', 'artistObserver'];

test.describe('EPKs Module', () => {
  
  for (const roleKey of rolesWithCreateAccess) {
    const role = testUsers[roleKey];
    
    test.describe(`EPKs Complete Flow - ${role.role}`, () => {
      let epksPage: EPKsPage;
      let createdEPKs: string[] = [];
      
      test.beforeEach(async ({ page, loginAs }) => {
        epksPage = new EPKsPage(page);
        await loginAs(roleKey);
        await epksPage.navigateTo('/epks');
        createdEPKs = [];
      });

      test.afterEach(async ({ page }) => {
        // Cleanup created EPKs
        for (const epkTitle of createdEPKs) {
          try {
            await epksPage.deleteEPK(epkTitle);
            console.log(`✅ Cleaned up EPK: ${epkTitle}`);
          } catch (error) {
            console.warn(`⚠️ Failed to cleanup EPK: ${epkTitle}`, error);
          }
        }
      });

      test(`should create complete EPK with media as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testEPK = {
          ...generateUniqueTestData(testData.epks[0], Date.now().toString()),
          title: `[TEST] ${generateUniqueTestData(testData.epks[0], Date.now().toString()).title}`
        };
        createdEPKs.push(testEPK.title);
        
        try {
          // Create base EPK
          await epksPage.createEPK(testEPK);
          
          // Add press release (dummy PDF)
          await epksPage.findEPK(testEPK.title);
          await page.locator(`[data-testid="epk-${testEPK.title}"] [data-testid="edit-button"]`).click();
          
          // Add press release
          await page.locator('[data-testid="add-document-button"]').click();
          await page.locator('[data-testid="document-type-select"]').selectOption('press-release');
          await page.locator('[data-testid="document-title-input"]').fill('[TEST] Nota de Prensa');
          
          // Create dummy PDF content (we'll simulate file upload)
          await page.locator('[data-testid="document-url-input"]').fill('https://example.com/dummy-press-release.pdf');
          await page.locator('[data-testid="add-document-submit"]').click();
          await epksPage.waitForToast('Documento añadido');
          
          // Add photos
          for (let i = 1; i <= 2; i++) {
            await page.locator('[data-testid="add-photo-button"]').click();
            await page.locator('[data-testid="photo-title-input"]').fill(`[TEST] Foto ${i}`);
            await page.locator('[data-testid="photo-url-input"]').fill(`https://picsum.photos/800/600?random=${i}`);
            await page.locator('[data-testid="add-photo-submit"]').click();
            await epksPage.waitForToast('Foto añadida');
          }
          
          // Add rider PDF
          await page.locator('[data-testid="add-document-button"]').click();
          await page.locator('[data-testid="document-type-select"]').selectOption('rider');
          await page.locator('[data-testid="document-title-input"]').fill('[TEST] Rider Técnico');
          await page.locator('[data-testid="document-url-input"]').fill('https://example.com/dummy-rider.pdf');
          await page.locator('[data-testid="add-document-submit"]').click();
          await epksPage.waitForToast('Documento añadido');
          
          // Add private video
          await page.locator('[data-testid="add-video-button"]').click();
          await page.locator('[data-testid="video-title-input"]').fill('[TEST] Video Privado');
          await page.locator('[data-testid="video-url-input"]').fill('https://vimeo.com/123456789');
          await page.locator('[data-testid="video-privacy-select"]').selectOption('private');
          await page.locator('[data-testid="add-video-submit"]').click();
          await epksPage.waitForToast('Video añadido');
          
          await epksPage.takeScreenshot(`epk-media-added-${role.role}`);
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addCoverage({
            module: 'EPKs',
            role: role.role,
            action: 'Create',
            status: 'passed',
            duration
          });
          
          coverageTracker.addResult({
            testCase: `Create Complete EPK - ${role.role}`,
            steps: [
              'Create base EPK',
              'Add press release PDF',
              'Add 2 dummy photos',
              'Add rider PDF',
              'Add private video',
              'Verify all media added'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'EPKs',
            screenshots: [`epk-media-added-${role.role}`]
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await epksPage.takeScreenshot(`epk-create-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Create Complete EPK - ${role.role}`,
            steps: ['Attempt to create EPK with media'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'EPKs',
            screenshots: [`epk-create-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });

      test(`should add contacts by role as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testEPK = {
          ...generateUniqueTestData(testData.epks[0], Date.now().toString()),
          title: `[TEST] ${generateUniqueTestData(testData.epks[0], Date.now().toString()).title}`
        };
        createdEPKs.push(testEPK.title);
        
        const contacts = [
          { role: 'Tour Manager', name: '[TEST] Juan Pérez', email: 'juan@test.com', phone: '+34 600 111 111' },
          { role: 'Booking', name: '[TEST] María López', email: 'maria@test.com', phone: '+34 600 222 222' },
          { role: 'Management', name: '[TEST] Carlos García', email: 'carlos@test.com', phone: '+34 600 333 333' }
        ];
        
        try {
          // Create base EPK
          await epksPage.createEPK(testEPK);
          
          // Add contacts
          await epksPage.findEPK(testEPK.title);
          await page.locator(`[data-testid="epk-${testEPK.title}"] [data-testid="edit-button"]`).click();
          
          for (const contact of contacts) {
            await page.locator('[data-testid="add-contact-button"]').click();
            await page.locator('[data-testid="contact-role-select"]').selectOption(contact.role.toLowerCase().replace(' ', '_'));
            await page.locator('[data-testid="contact-name-input"]').fill(contact.name);
            await page.locator('[data-testid="contact-email-input"]').fill(contact.email);
            await page.locator('[data-testid="contact-phone-input"]').fill(contact.phone);
            await page.locator('[data-testid="add-contact-submit"]').click();
            await epksPage.waitForToast('Contacto añadido');
          }
          
          // Verify contacts appear in EPK
          for (const contact of contacts) {
            await expect(page.locator(`text=${contact.name}`)).toBeVisible();
            await expect(page.locator(`text=${contact.email}`)).toBeVisible();
          }
          
          await epksPage.takeScreenshot(`epk-contacts-added-${role.role}`);
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addResult({
            testCase: `Add EPK Contacts - ${role.role}`,
            steps: [
              'Create base EPK',
              'Add Tour Manager contact',
              'Add Booking contact',
              'Add Management contact',
              'Verify all contacts visible'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'EPKs',
            screenshots: [`epk-contacts-added-${role.role}`]
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await epksPage.takeScreenshot(`epk-contacts-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Add EPK Contacts - ${role.role}`,
            steps: ['Attempt to add EPK contacts'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'EPKs',
            screenshots: [`epk-contacts-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });

      test(`should publish private EPK with password as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testEPK = {
          ...generateUniqueTestData(testData.epks[0], Date.now().toString()),
          title: `[TEST] ${generateUniqueTestData(testData.epks[0], Date.now().toString()).title}`
        };
        const password = 'test123456';
        createdEPKs.push(testEPK.title);
        
        try {
          // Create base EPK
          await epksPage.createEPK(testEPK);
          
          // Publish with password
          await epksPage.findEPK(testEPK.title);
          await page.locator(`[data-testid="epk-${testEPK.title}"] [data-testid="publish-button"]`).click();
          
          await page.locator('[data-testid="privacy-mode-select"]').selectOption('private');
          await page.locator('[data-testid="epk-password-input"]').fill(password);
          await page.locator('[data-testid="publish-submit"]').click();
          await epksPage.waitForToast('EPK publicado');
          
          // Get the public link
          const publicLink = await page.locator('[data-testid="public-link"]').textContent();
          expect(publicLink).toBeTruthy();
          
          // Test access without password (should be blocked)
          const newPage = await page.context().newPage();
          await newPage.goto(publicLink!);
          
          await expect(newPage.locator('[data-testid="password-prompt"]')).toBeVisible();
          await expect(newPage.locator('[data-testid="epk-content"]')).not.toBeVisible();
          
          // Test access with wrong password
          await newPage.locator('[data-testid="password-input"]').fill('wrongpassword');
          await newPage.locator('[data-testid="password-submit"]').click();
          await expect(newPage.locator('[data-testid="password-error"]')).toBeVisible();
          
          // Test access with correct password
          await newPage.locator('[data-testid="password-input"]').fill(password);
          await newPage.locator('[data-testid="password-submit"]').click();
          await expect(newPage.locator('[data-testid="epk-content"]')).toBeVisible();
          await expect(newPage.locator(`text=${testEPK.title}`)).toBeVisible();
          
          await newPage.close();
          
          await epksPage.takeScreenshot(`epk-private-published-${role.role}`);
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addCoverage({
            module: 'EPKs',
            role: role.role,
            action: 'Share',
            status: 'passed',
            duration
          });
          
          coverageTracker.addResult({
            testCase: `Publish Private EPK - ${role.role}`,
            steps: [
              'Create base EPK',
              'Set privacy to private',
              'Set password',
              'Publish EPK',
              'Test access without password (blocked)',
              'Test access with wrong password (blocked)',
              'Test access with correct password (allowed)'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'EPKs',
            screenshots: [`epk-private-published-${role.role}`]
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await epksPage.takeScreenshot(`epk-private-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Publish Private EPK - ${role.role}`,
            steps: ['Attempt to publish private EPK'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'EPKs',
            screenshots: [`epk-private-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });

      test(`should download press kit ZIP as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testEPK = {
          ...generateUniqueTestData(testData.epks[0], Date.now().toString()),
          title: `[TEST] ${generateUniqueTestData(testData.epks[0], Date.now().toString()).title}`
        };
        createdEPKs.push(testEPK.title);
        
        try {
          // Create EPK with some media
          await epksPage.createEPK(testEPK);
          
          // Add some dummy media
          await epksPage.findEPK(testEPK.title);
          await page.locator(`[data-testid="epk-${testEPK.title}"] [data-testid="edit-button"]`).click();
          
          // Add a photo
          await page.locator('[data-testid="add-photo-button"]').click();
          await page.locator('[data-testid="photo-title-input"]').fill('[TEST] Press Photo');
          await page.locator('[data-testid="photo-url-input"]').fill('https://picsum.photos/800/600?random=999');
          await page.locator('[data-testid="add-photo-submit"]').click();
          await epksPage.waitForToast('Foto añadida');
          
          // Add a document
          await page.locator('[data-testid="add-document-button"]').click();
          await page.locator('[data-testid="document-type-select"]').selectOption('press-release');
          await page.locator('[data-testid="document-title-input"]').fill('[TEST] Bio');
          await page.locator('[data-testid="document-url-input"]').fill('https://example.com/bio.pdf');
          await page.locator('[data-testid="add-document-submit"]').click();
          await epksPage.waitForToast('Documento añadido');
          
          // Download press kit
          const download = await epksPage.downloadEPK(testEPK.title);
          expect(download).toBeDefined();
          expect(download.suggestedFilename()).toMatch(/press-kit.*\.zip$/);
          
          // Save the download to verify contents (in a real scenario)
          const downloadPath = `test-results/downloads/${download.suggestedFilename()}`;
          await download.saveAs(downloadPath);
          
          // Verify file was downloaded and has content
          const fs = require('fs');
          const stats = fs.statSync(downloadPath);
          expect(stats.size).toBeGreaterThan(0);
          
          await epksPage.takeScreenshot(`epk-download-${role.role}`);
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addCoverage({
            module: 'EPKs',
            role: role.role,
            action: 'Export',
            status: 'passed',
            duration
          });
          
          coverageTracker.addResult({
            testCase: `Download Press Kit ZIP - ${role.role}`,
            steps: [
              'Create EPK with media',
              'Add photo to EPK',
              'Add document to EPK',
              'Download press kit ZIP',
              'Verify download completed',
              'Verify ZIP file has content'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'EPKs',
            screenshots: [`epk-download-${role.role}`]
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await epksPage.takeScreenshot(`epk-download-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Download Press Kit ZIP - ${role.role}`,
            steps: ['Attempt to download press kit'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'EPKs',
            screenshots: [`epk-download-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });
    });
  }
});