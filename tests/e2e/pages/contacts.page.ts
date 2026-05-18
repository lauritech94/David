import { BasePage } from './base.page';
import { Page, Locator } from '@playwright/test';

export class ContactsPage extends BasePage {
  readonly createContactButton: Locator;
  readonly contactsList: Locator;
  readonly searchInput: Locator;
  readonly exportButton: Locator;

  constructor(page: Page) {
    super(page);
    this.createContactButton = page.locator('[data-testid="create-contact-button"]');
    this.contactsList = page.locator('[data-testid="contacts-list"]');
    this.searchInput = page.locator('[data-testid="search-contacts"]');
    this.exportButton = page.locator('[data-testid="export-contacts"]');
  }

  async createContact(contactData: {
    name: string;
    email: string;
    phone: string;
    company: string;
  }) {
    await this.createContactButton.click();
    
    await this.page.locator('[data-testid="contact-name-input"]').fill(contactData.name);
    await this.page.locator('[data-testid="contact-email-input"]').fill(contactData.email);
    await this.page.locator('[data-testid="contact-phone-input"]').fill(contactData.phone);
    await this.page.locator('[data-testid="contact-company-input"]').fill(contactData.company);
    
    await this.submitForm();
    await this.waitForToast('Contacto creado');
  }

  async editContact(contactName: string, newData: Partial<{
    name: string;
    email: string;
    phone: string;
    company: string;
  }>) {
    await this.findContact(contactName);
    await this.page.locator(`[data-testid="contact-${contactName}"] [data-testid="edit-button"]`).click();
    
    if (newData.name) {
      await this.page.locator('[data-testid="contact-name-input"]').fill(newData.name);
    }
    
    if (newData.email) {
      await this.page.locator('[data-testid="contact-email-input"]').fill(newData.email);
    }
    
    if (newData.phone) {
      await this.page.locator('[data-testid="contact-phone-input"]').fill(newData.phone);
    }
    
    if (newData.company) {
      await this.page.locator('[data-testid="contact-company-input"]').fill(newData.company);
    }
    
    await this.submitForm();
    await this.waitForToast('Contacto actualizado');
  }

  async deleteContact(contactName: string) {
    await this.findContact(contactName);
    await this.page.locator(`[data-testid="contact-${contactName}"] [data-testid="delete-button"]`).click();
    await this.confirmDialog();
    await this.waitForToast('Contacto eliminado');
  }

  async findContact(contactName: string) {
    await this.searchInput.fill(contactName);
    await this.page.locator(`[data-testid="contact-${contactName}"]`).waitFor({ state: 'visible' });
  }

  async exportContacts() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportButton.click();
    const download = await downloadPromise;
    return download;
  }

  async shareContact(contactName: string, email: string) {
    await this.findContact(contactName);
    await this.page.locator(`[data-testid="contact-${contactName}"] [data-testid="share-button"]`).click();
    await this.page.locator('[data-testid="share-email-input"]').fill(email);
    await this.page.locator('[data-testid="share-submit-button"]').click();
    await this.waitForToast('Contacto compartido');
  }

  async verifyContactExists(contactName: string) {
    await this.findContact(contactName);
    return await this.page.locator(`[data-testid="contact-${contactName}"]`).isVisible();
  }
}