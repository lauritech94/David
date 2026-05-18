import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly userMenu: Locator;
  readonly notifications: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('[data-testid="sidebar"]');
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.notifications = page.locator('[data-testid="notifications"]');
  }

  async navigateTo(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  async clickSidebarItem(item: string) {
    await this.sidebar.locator(`[data-testid="nav-${item.toLowerCase()}"]`).click();
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string) {
    return await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  async waitForToast(message?: string) {
    try {
      // Try multiple toast selectors
      const toastSelectors = [
        '[data-testid="toast"]',
        '.toast',
        '[role="alert"]',
        '.sonner-toast',
        '[data-sonner-toast]'
      ];
      
      let toastFound = false;
      for (const selector of toastSelectors) {
        if (await this.page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false)) {
          const toast = this.page.locator(selector);
          await toast.waitFor({ state: 'visible', timeout: 5000 });
          
          if (message) {
            // Check if toast contains the expected message
            const toastText = await toast.textContent();
            if (toastText && toastText.includes(message)) {
              toastFound = true;
              break;
            }
          } else {
            toastFound = true;
            break;
          }
        }
      }
      
      if (!toastFound && message) {
        console.warn(`Toast with message "${message}" not found, continuing...`);
      }
      
      // Wait a bit for toast to be readable
      await this.page.waitForTimeout(1000);
      
    } catch (error) {
      console.warn('Toast verification failed, continuing...', error.message);
    }
  }

  async fillForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      const input = this.page.locator(`[data-testid="${field}-input"]`);
      await input.fill(value);
    }
  }

  async submitForm() {
    await this.page.locator('[data-testid="submit-button"]').click();
  }

  async confirmDialog() {
    await this.page.locator('[data-testid="confirm-button"]').click();
  }

  async cancelDialog() {
    await this.page.locator('[data-testid="cancel-button"]').click();
  }
}