import { BasePage } from './base.page';
import { Page, Locator } from '@playwright/test';

export class ProjectsPage extends BasePage {
  readonly createProjectButton: Locator;
  readonly projectsList: Locator;
  readonly searchInput: Locator;
  readonly filterDropdown: Locator;

  constructor(page: Page) {
    super(page);
    this.createProjectButton = page.locator('[data-testid="create-project-button"]');
    this.projectsList = page.locator('[data-testid="projects-list"]');
    this.searchInput = page.locator('[data-testid="search-projects"]');
    this.filterDropdown = page.locator('[data-testid="filter-projects"]');
  }

  async createProject(projectData: {
    name: string;
    description: string;
    artists: string[];
  }) {
    await this.createProjectButton.click();
    
    await this.page.locator('[data-testid="project-name-input"]').fill(projectData.name);
    await this.page.locator('[data-testid="project-description-input"]').fill(projectData.description);
    
    // Select artists
    for (const artist of projectData.artists) {
      await this.page.locator('[data-testid="artist-selector"]').click();
      await this.page.locator(`text=${artist}`).click();
    }
    
    await this.submitForm();
    await this.waitForToast('Proyecto creado');
  }

  async editProject(projectName: string, newData: Partial<{
    name: string;
    description: string;
  }>) {
    await this.findProject(projectName);
    await this.page.locator(`[data-testid="project-${projectName}"] [data-testid="edit-button"]`).click();
    
    if (newData.name) {
      await this.page.locator('[data-testid="project-name-input"]').fill(newData.name);
    }
    
    if (newData.description) {
      await this.page.locator('[data-testid="project-description-input"]').fill(newData.description);
    }
    
    await this.submitForm();
    await this.waitForToast('Proyecto actualizado');
  }

  async deleteProject(projectName: string) {
    await this.findProject(projectName);
    await this.page.locator(`[data-testid="project-${projectName}"] [data-testid="delete-button"]`).click();
    await this.confirmDialog();
    await this.waitForToast('Proyecto eliminado');
  }

  async findProject(projectName: string) {
    await this.searchInput.fill(projectName);
    await this.page.locator(`[data-testid="project-${projectName}"]`).waitFor({ state: 'visible' });
  }

  async openProject(projectName: string) {
    await this.findProject(projectName);
    await this.page.locator(`[data-testid="project-${projectName}"]`).click();
  }

  async verifyProjectExists(projectName: string) {
    await this.findProject(projectName);
    return await this.page.locator(`[data-testid="project-${projectName}"]`).isVisible();
  }

  async verifyProjectNotExists(projectName: string) {
    await this.searchInput.fill(projectName);
    await this.page.waitForTimeout(1000); // Wait for search to complete
    return !(await this.page.locator(`[data-testid="project-${projectName}"]`).isVisible());
  }
}