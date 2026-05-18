import { BasePage } from './base.page';
import { Page, Locator } from '@playwright/test';

export class EPKsPage extends BasePage {
  readonly createEPKButton: Locator;
  readonly epksList: Locator;
  readonly searchInput: Locator;
  readonly previewButton: Locator;

  constructor(page: Page) {
    super(page);
    this.createEPKButton = page.locator('[data-testid="create-epk-button"]');
    this.epksList = page.locator('[data-testid="epks-list"]');
    this.searchInput = page.locator('[data-testid="search-epks"]');
    this.previewButton = page.locator('[data-testid="preview-epk"]');
  }

  async createEPK(epkData: {
    title: string;
    description: string;
    artist: string;
  }) {
    await this.createEPKButton.click();
    
    await this.page.locator('[data-testid="epk-title-input"]').fill(epkData.title);
    await this.page.locator('[data-testid="epk-description-input"]').fill(epkData.description);
    
    // Select artist
    await this.page.locator('[data-testid="artist-selector"]').click();
    await this.page.locator(`text=${epkData.artist}`).click();
    
    await this.submitForm();
    await this.waitForToast('EPK creado');
  }

  async editEPK(epkTitle: string, newData: Partial<{
    title: string;
    description: string;
  }>) {
    await this.findEPK(epkTitle);
    await this.page.locator(`[data-testid="epk-${epkTitle}"] [data-testid="edit-button"]`).click();
    
    if (newData.title) {
      await this.page.locator('[data-testid="epk-title-input"]').fill(newData.title);
    }
    
    if (newData.description) {
      await this.page.locator('[data-testid="epk-description-input"]').fill(newData.description);
    }
    
    await this.submitForm();
    await this.waitForToast('EPK actualizado');
  }

  async deleteEPK(epkTitle: string) {
    await this.findEPK(epkTitle);
    await this.page.locator(`[data-testid="epk-${epkTitle}"] [data-testid="delete-button"]`).click();
    await this.confirmDialog();
    await this.waitForToast('EPK eliminado');
  }

  async findEPK(epkTitle: string) {
    await this.searchInput.fill(epkTitle);
    await this.page.locator(`[data-testid="epk-${epkTitle}"]`).waitFor({ state: 'visible' });
  }

  async addMediaToEPK(epkTitle: string, mediaType: 'image' | 'video' | 'audio', filePath: string) {
    await this.findEPK(epkTitle);
    await this.page.locator(`[data-testid="epk-${epkTitle}"] [data-testid="edit-button"]`).click();
    
    await this.page.locator(`[data-testid="add-${mediaType}-button"]`).click();
    
    // Handle file upload
    const fileInput = this.page.locator(`[data-testid="${mediaType}-upload"]`);
    await fileInput.setInputFiles(filePath);
    
    await this.page.locator('[data-testid="upload-submit"]').click();
    await this.waitForToast('Media añadido');
  }

  async previewEPK(epkTitle: string) {
    await this.findEPK(epkTitle);
    await this.page.locator(`[data-testid="epk-${epkTitle}"] [data-testid="preview-button"]`).click();
    
    // Wait for preview to load
    await this.page.waitForSelector('[data-testid="epk-preview"]');
  }

  async shareEPK(epkTitle: string, email: string) {
    await this.findEPK(epkTitle);
    await this.page.locator(`[data-testid="epk-${epkTitle}"] [data-testid="share-button"]`).click();
    await this.page.locator('[data-testid="share-email-input"]').fill(email);
    await this.page.locator('[data-testid="share-submit-button"]').click();
    await this.waitForToast('EPK compartido');
  }

  async downloadEPK(epkTitle: string) {
    await this.findEPK(epkTitle);
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.locator(`[data-testid="epk-${epkTitle}"] [data-testid="download-button"]`).click();
    const download = await downloadPromise;
    return download;
  }

  async verifyEPKExists(epkTitle: string) {
    await this.findEPK(epkTitle);
    return await this.page.locator(`[data-testid="epk-${epkTitle}"]`).isVisible();
  }

  async verifyMediaInEPK(epkTitle: string, mediaType: string, mediaName: string) {
    await this.previewEPK(epkTitle);
    return await this.page.locator(`[data-testid="epk-${mediaType}-${mediaName}"]`).isVisible();
  }
}