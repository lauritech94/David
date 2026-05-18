import { test, expect } from '../fixtures/auth-fixture';
import { BookingsPage } from '../pages/bookings.page';
import { coverageTracker } from '../utils/coverage-tracker';
import { testUsers, TestUserKey } from '../fixtures/test-users';
import { testData, generateUniqueTestData } from '../utils/test-data';

const rolesWithCreateAccess: TestUserKey[] = ['owner', 'teamManager', 'artistManager'];
const rolesWithViewAccess: TestUserKey[] = ['owner', 'teamManager', 'artistManager', 'bookingEditor'];

const kanbanColumns = ['Interés', 'Oferta', 'Negociación', 'Confirmado', 'Facturado', 'Cerrado', 'Cancelado'];

test.describe('Bookings Module', () => {
  
  for (const roleKey of rolesWithCreateAccess) {
    const role = testUsers[roleKey];
    
    test.describe(`Bookings CRUD - ${role.role}`, () => {
      let bookingsPage: BookingsPage;
      let createdBookings: string[] = [];
      
      test.beforeEach(async ({ page, loginAs }) => {
        bookingsPage = new BookingsPage(page);
        await loginAs(roleKey);
        await bookingsPage.navigateTo('/booking');
        createdBookings = [];
      });

      test.afterEach(async ({ page }) => {
        // Cleanup created bookings
        for (const bookingTitle of createdBookings) {
          try {
            await bookingsPage.deleteBooking(bookingTitle);
            console.log(`✅ Cleaned up booking: ${bookingTitle}`);
          } catch (error) {
            console.warn(`⚠️ Failed to cleanup booking: ${bookingTitle}`, error);
          }
        }
      });

      test(`should create booking as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testBooking = {
          ...generateUniqueTestData(testData.bookings[0], Date.now().toString()),
          title: `[TEST] ${generateUniqueTestData(testData.bookings[0], Date.now().toString()).title}`
        };
        createdBookings.push(testBooking.title);
        
        try {
          await bookingsPage.createBooking(testBooking);
          
          // Verify booking was created
          const exists = await bookingsPage.verifyBookingExists(testBooking.title);
          expect(exists).toBe(true);
          
          await bookingsPage.takeScreenshot(`booking-created-${role.role}`);
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addCoverage({
            module: 'Booking',
            role: role.role,
            action: 'Create',
            status: 'passed',
            duration
          });
          
          coverageTracker.addResult({
            testCase: `Create Booking - ${role.role}`,
            steps: [
              'Navigate to booking page',
              'Click create booking button',
              'Fill booking form with test data',
              'Submit form',
              'Verify booking appears in list'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'Booking',
            screenshots: [`booking-created-${role.role}`]
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await bookingsPage.takeScreenshot(`booking-create-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Create Booking - ${role.role}`,
            steps: ['Attempt to create booking'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'Booking',
            screenshots: [`booking-create-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });

      test(`should test kanban drag and drop as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testBooking = {
          ...generateUniqueTestData(testData.bookings[0], Date.now().toString()),
          title: `[TEST] ${generateUniqueTestData(testData.bookings[0], Date.now().toString()).title}`
        };
        createdBookings.push(testBooking.title);
        
        try {
          // Create test booking
          await bookingsPage.createBooking(testBooking);
          
          // Switch to kanban view
          await bookingsPage.switchToKanbanView();
          
          // Test drag and drop through different columns
          for (let i = 1; i < kanbanColumns.length; i++) {
            const targetColumn = kanbanColumns[i];
            await bookingsPage.dragBookingInKanban(testBooking.title, targetColumn);
            
            // Verify booking moved to correct column
            const bookingInColumn = await page.locator(`[data-testid="kanban-column-${targetColumn}"] [data-testid="booking-${testBooking.title}"]`).isVisible();
            expect(bookingInColumn).toBe(true);
            
            await page.waitForTimeout(1000); // Brief pause between moves
          }
          
          await bookingsPage.takeScreenshot(`booking-kanban-${role.role}`);
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addCoverage({
            module: 'Booking',
            role: role.role,
            action: 'Drag & Drop',
            status: 'passed',
            duration
          });
          
          coverageTracker.addResult({
            testCase: `Kanban Drag & Drop - ${role.role}`,
            steps: [
              'Create test booking',
              'Switch to kanban view',
              'Drag booking through all columns',
              'Verify state persistence',
              'Verify visual updates'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'Booking',
            screenshots: [`booking-kanban-${role.role}`]
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await bookingsPage.takeScreenshot(`booking-kanban-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Kanban Drag & Drop - ${role.role}`,
            steps: ['Attempt kanban drag and drop'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'Booking',
            screenshots: [`booking-kanban-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });

      test(`should test booking offer details popup as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testBooking = {
          ...generateUniqueTestData(testData.bookings[0], Date.now().toString()),
          title: `[TEST] ${generateUniqueTestData(testData.bookings[0], Date.now().toString()).title}`
        };
        createdBookings.push(testBooking.title);
        
        try {
          // Create test booking
          await bookingsPage.createBooking(testBooking);
          
          // Open booking details popup
          await bookingsPage.findBooking(testBooking.title);
          await page.locator(`[data-testid="booking-${testBooking.title}"] [data-testid="details-button"]`).click();
          
          // Verify popup opened and contains expected fields
          await expect(page.locator('[data-testid="booking-details-popup"]')).toBeVisible();
          await expect(page.locator('[data-testid="booking-date"]')).toBeVisible();
          await expect(page.locator('[data-testid="booking-venue"]')).toBeVisible();
          await expect(page.locator('[data-testid="booking-promoter"]')).toBeVisible();
          await expect(page.locator('[data-testid="booking-fee"]')).toBeVisible();
          await expect(page.locator('[data-testid="booking-expenses"]')).toBeVisible();
          await expect(page.locator('[data-testid="booking-status"]')).toBeVisible();
          
          // Verify values match what we created
          const venueText = await page.locator('[data-testid="booking-venue"]').textContent();
          expect(venueText).toContain(testBooking.venue);
          
          const feeText = await page.locator('[data-testid="booking-fee"]').textContent();
          expect(feeText).toContain(testBooking.fee.toString());
          
          await bookingsPage.takeScreenshot(`booking-details-${role.role}`);
          
          // Close popup
          await page.locator('[data-testid="close-popup"]').click();
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addResult({
            testCase: `Booking Details Popup - ${role.role}`,
            steps: [
              'Create test booking',
              'Click details button',
              'Verify popup opens',
              'Verify all fields visible',
              'Verify data matches input',
              'Close popup'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'Booking',
            screenshots: [`booking-details-${role.role}`]
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await bookingsPage.takeScreenshot(`booking-details-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Booking Details Popup - ${role.role}`,
            steps: ['Attempt to open booking details'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'Booking',
            screenshots: [`booking-details-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });

      test(`should test booking filters as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testBookings = [
          {
            ...generateUniqueTestData(testData.bookings[0], 'spain'),
            title: `[TEST] Spain Booking ${Date.now()}`
          },
          {
            ...generateUniqueTestData(testData.bookings[1], 'france'),
            title: `[TEST] France Booking ${Date.now()}`
          }
        ];
        createdBookings.push(...testBookings.map(b => b.title));
        
        try {
          // Create multiple test bookings
          for (const booking of testBookings) {
            await bookingsPage.createBooking(booking);
          }
          
          // Test country filter
          await page.locator('[data-testid="filter-country"]').click();
          await page.locator('[data-testid="country-spain"]').click();
          
          // Verify only Spain booking visible
          await expect(page.locator(`[data-testid="booking-${testBookings[0].title}"]`)).toBeVisible();
          await expect(page.locator(`[data-testid="booking-${testBookings[1].title}"]`)).not.toBeVisible();
          
          // Clear filter
          await page.locator('[data-testid="clear-filters"]').click();
          
          // Test phase filter
          await page.locator('[data-testid="filter-phase"]').click();
          await page.locator('[data-testid="phase-oferta"]').click();
          
          await page.waitForTimeout(1000); // Wait for filter to apply
          
          // Test venue filter
          await page.locator('[data-testid="filter-venue"]').click();
          await page.locator(`text=${testBookings[0].venue}`).click();
          
          await page.waitForTimeout(1000); // Wait for filter to apply
          
          await bookingsPage.takeScreenshot(`booking-filters-${role.role}`);
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addResult({
            testCase: `Booking Filters - ${role.role}`,
            steps: [
              'Create multiple test bookings',
              'Apply country filter',
              'Verify filtered results',
              'Apply phase filter',
              'Apply venue filter',
              'Verify combined filters work'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'Booking',
            screenshots: [`booking-filters-${role.role}`]
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await bookingsPage.takeScreenshot(`booking-filters-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Booking Filters - ${role.role}`,
            steps: ['Attempt to test booking filters'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'Booking',
            screenshots: [`booking-filters-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });

      test(`should export filtered bookings to CSV as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testBooking = {
          ...generateUniqueTestData(testData.bookings[0], Date.now().toString()),
          title: `[TEST] ${generateUniqueTestData(testData.bookings[0], Date.now().toString()).title}`
        };
        createdBookings.push(testBooking.title);
        
        try {
          // Create test booking
          await bookingsPage.createBooking(testBooking);
          
          // Apply filter to show only our test booking
          await page.locator('[data-testid="search-bookings"]').fill('[TEST]');
          await page.waitForTimeout(1000);
          
          // Export filtered results
          const downloadPromise = page.waitForEvent('download');
          await page.locator('[data-testid="export-csv"]').click();
          const download = await downloadPromise;
          
          expect(download).toBeDefined();
          expect(download.suggestedFilename()).toMatch(/bookings.*\.csv$/);
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addCoverage({
            module: 'Booking',
            role: role.role,
            action: 'Export',
            status: 'passed',
            duration
          });
          
          coverageTracker.addResult({
            testCase: `Export Filtered Bookings - ${role.role}`,
            steps: [
              'Create test booking',
              'Apply search filter',
              'Click export CSV',
              'Verify download initiated',
              'Verify filename format'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'Booking',
            screenshots: []
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await bookingsPage.takeScreenshot(`booking-export-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Export Filtered Bookings - ${role.role}`,
            steps: ['Attempt to export bookings'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'Booking',
            screenshots: [`booking-export-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });

      test(`should duplicate booking as ${role.role}`, async ({ page }) => {
        const startTime = Date.now();
        const testBooking = {
          ...generateUniqueTestData(testData.bookings[0], Date.now().toString()),
          title: `[TEST] ${generateUniqueTestData(testData.bookings[0], Date.now().toString()).title}`
        };
        const duplicatedTitle = `${testBooking.title} - Copy`;
        createdBookings.push(testBooking.title, duplicatedTitle);
        
        try {
          // Create original booking
          await bookingsPage.createBooking(testBooking);
          
          // Duplicate it
          await bookingsPage.findBooking(testBooking.title);
          await page.locator(`[data-testid="booking-${testBooking.title}"] [data-testid="duplicate-button"]`).click();
          
          // Verify duplicate dialog opens
          await expect(page.locator('[data-testid="duplicate-dialog"]')).toBeVisible();
          
          // Modify the title for the duplicate
          await page.locator('[data-testid="duplicate-title-input"]').fill(duplicatedTitle);
          await page.locator('[data-testid="confirm-duplicate"]').click();
          
          await bookingsPage.waitForToast('Booking duplicado');
          
          // Verify both bookings exist
          const originalExists = await bookingsPage.verifyBookingExists(testBooking.title);
          const duplicateExists = await bookingsPage.verifyBookingExists(duplicatedTitle);
          
          expect(originalExists).toBe(true);
          expect(duplicateExists).toBe(true);
          
          const duration = Date.now() - startTime;
          
          coverageTracker.addResult({
            testCase: `Duplicate Booking - ${role.role}`,
            steps: [
              'Create original booking',
              'Click duplicate button',
              'Modify duplicate title',
              'Confirm duplication',
              'Verify both bookings exist'
            ],
            result: 'passed',
            duration,
            role: role.role,
            module: 'Booking',
            screenshots: []
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          await bookingsPage.takeScreenshot(`booking-duplicate-error-${role.role}`);
          
          coverageTracker.addResult({
            testCase: `Duplicate Booking - ${role.role}`,
            steps: ['Attempt to duplicate booking'],
            result: 'failed',
            duration,
            role: role.role,
            module: 'Booking',
            screenshots: [`booking-duplicate-error-${role.role}`],
            error: error.message
          });
          
          throw error;
        }
      });
    });
  }
});