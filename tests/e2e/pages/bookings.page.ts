import { BasePage } from './base.page';
import { Page, Locator } from '@playwright/test';

export class BookingsPage extends BasePage {
  readonly createBookingButton: Locator;
  readonly bookingsList: Locator;
  readonly calendarView: Locator;
  readonly kanbanView: Locator;
  readonly viewToggle: Locator;

  constructor(page: Page) {
    super(page);
    this.createBookingButton = page.locator('[data-testid="create-booking-button"]');
    this.bookingsList = page.locator('[data-testid="bookings-list"]');
    this.calendarView = page.locator('[data-testid="calendar-view"]');
    this.kanbanView = page.locator('[data-testid="kanban-view"]');
    this.viewToggle = page.locator('[data-testid="view-toggle"]');
  }

  async createBooking(bookingData: {
    title: string;
    venue: string;
    date: string;
    fee: number;
  }) {
    await this.createBookingButton.click();
    
    await this.page.locator('[data-testid="booking-title-input"]').fill(bookingData.title);
    await this.page.locator('[data-testid="booking-venue-input"]').fill(bookingData.venue);
    await this.page.locator('[data-testid="booking-date-input"]').fill(bookingData.date);
    await this.page.locator('[data-testid="booking-fee-input"]').fill(bookingData.fee.toString());
    
    await this.submitForm();
    await this.waitForToast('Booking creado');
  }

  async editBooking(bookingTitle: string, newData: Partial<{
    title: string;
    venue: string;
    date: string;
    fee: number;
  }>) {
    await this.findBooking(bookingTitle);
    await this.page.locator(`[data-testid="booking-${bookingTitle}"] [data-testid="edit-button"]`).click();
    
    if (newData.title) {
      await this.page.locator('[data-testid="booking-title-input"]').fill(newData.title);
    }
    
    if (newData.venue) {
      await this.page.locator('[data-testid="booking-venue-input"]').fill(newData.venue);
    }
    
    if (newData.date) {
      await this.page.locator('[data-testid="booking-date-input"]').fill(newData.date);
    }
    
    if (newData.fee) {
      await this.page.locator('[data-testid="booking-fee-input"]').fill(newData.fee.toString());
    }
    
    await this.submitForm();
    await this.waitForToast('Booking actualizado');
  }

  async deleteBooking(bookingTitle: string) {
    await this.findBooking(bookingTitle);
    await this.page.locator(`[data-testid="booking-${bookingTitle}"] [data-testid="delete-button"]`).click();
    await this.confirmDialog();
    await this.waitForToast('Booking eliminado');
  }

  async findBooking(bookingTitle: string) {
    await this.page.locator('[data-testid="search-bookings"]').fill(bookingTitle);
    await this.page.locator(`[data-testid="booking-${bookingTitle}"]`).waitFor({ state: 'visible' });
  }

  async switchToCalendarView() {
    await this.viewToggle.click();
    await this.page.locator('[data-testid="calendar-view-option"]').click();
    await this.calendarView.waitFor({ state: 'visible' });
  }

  async switchToKanbanView() {
    await this.viewToggle.click();
    await this.page.locator('[data-testid="kanban-view-option"]').click();
    await this.kanbanView.waitFor({ state: 'visible' });
  }

  async dragBookingInKanban(bookingTitle: string, toColumn: string) {
    await this.switchToKanbanView();
    const booking = this.page.locator(`[data-testid="booking-${bookingTitle}"]`);
    const targetColumn = this.page.locator(`[data-testid="kanban-column-${toColumn}"]`);
    
    await booking.dragTo(targetColumn);
    await this.waitForToast('Booking actualizado');
  }

  async updateBookingStatus(bookingTitle: string, status: string) {
    await this.findBooking(bookingTitle);
    await this.page.locator(`[data-testid="booking-${bookingTitle}"] [data-testid="status-dropdown"]`).click();
    await this.page.locator(`[data-testid="status-${status}"]`).click();
    await this.waitForToast('Estado actualizado');
  }

  async verifyBookingExists(bookingTitle: string) {
    await this.findBooking(bookingTitle);
    return await this.page.locator(`[data-testid="booking-${bookingTitle}"]`).isVisible();
  }
}