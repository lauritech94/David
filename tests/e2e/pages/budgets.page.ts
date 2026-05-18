import { BasePage } from './base.page';
import { Page, Locator } from '@playwright/test';

export class BudgetsPage extends BasePage {
  readonly createBudgetButton: Locator;
  readonly budgetsList: Locator;
  readonly searchInput: Locator;
  readonly templateSelector: Locator;

  constructor(page: Page) {
    super(page);
    this.createBudgetButton = page.locator('[data-testid="create-budget-button"]');
    this.budgetsList = page.locator('[data-testid="budgets-list"]');
    this.searchInput = page.locator('[data-testid="search-budgets"]');
    this.templateSelector = page.locator('[data-testid="template-selector"]');
  }

  async createBudget(budgetData: {
    name: string;
    totalAmount: number;
    categories: { name: string; amount: number; }[];
  }) {
    await this.createBudgetButton.click();
    
    await this.page.locator('[data-testid="budget-name-input"]').fill(budgetData.name);
    await this.page.locator('[data-testid="budget-total-input"]').fill(budgetData.totalAmount.toString());
    
    // Add categories
    for (const category of budgetData.categories) {
      await this.page.locator('[data-testid="add-category-button"]').click();
      await this.page.locator('[data-testid="category-name-input"]:last-of-type').fill(category.name);
      await this.page.locator('[data-testid="category-amount-input"]:last-of-type').fill(category.amount.toString());
    }
    
    await this.submitForm();
    await this.waitForToast('Presupuesto creado');
  }

  async editBudget(budgetName: string, newData: Partial<{
    name: string;
    totalAmount: number;
  }>) {
    await this.findBudget(budgetName);
    await this.page.locator(`[data-testid="budget-${budgetName}"] [data-testid="edit-button"]`).click();
    
    if (newData.name) {
      await this.page.locator('[data-testid="budget-name-input"]').fill(newData.name);
    }
    
    if (newData.totalAmount) {
      await this.page.locator('[data-testid="budget-total-input"]').fill(newData.totalAmount.toString());
    }
    
    await this.submitForm();
    await this.waitForToast('Presupuesto actualizado');
  }

  async deleteBudget(budgetName: string) {
    await this.findBudget(budgetName);
    await this.page.locator(`[data-testid="budget-${budgetName}"] [data-testid="delete-button"]`).click();
    await this.confirmDialog();
    await this.waitForToast('Presupuesto eliminado');
  }

  async findBudget(budgetName: string) {
    await this.searchInput.fill(budgetName);
    await this.page.locator(`[data-testid="budget-${budgetName}"]`).waitFor({ state: 'visible' });
  }

  async duplicateBudget(budgetName: string, newName: string) {
    await this.findBudget(budgetName);
    await this.page.locator(`[data-testid="budget-${budgetName}"] [data-testid="duplicate-button"]`).click();
    await this.page.locator('[data-testid="budget-name-input"]').fill(newName);
    await this.submitForm();
    await this.waitForToast('Presupuesto duplicado');
  }

  async exportBudget(budgetName: string) {
    await this.findBudget(budgetName);
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.locator(`[data-testid="budget-${budgetName}"] [data-testid="export-button"]`).click();
    const download = await downloadPromise;
    return download;
  }

  async createFromTemplate(templateName: string, budgetName: string) {
    await this.createBudgetButton.click();
    await this.templateSelector.click();
    await this.page.locator(`text=${templateName}`).click();
    await this.page.locator('[data-testid="budget-name-input"]').fill(budgetName);
    await this.submitForm();
    await this.waitForToast('Presupuesto creado desde plantilla');
  }

  async verifyBudgetExists(budgetName: string) {
    await this.findBudget(budgetName);
    return await this.page.locator(`[data-testid="budget-${budgetName}"]`).isVisible();
  }
}