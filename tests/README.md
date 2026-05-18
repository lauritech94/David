# E2E Testing Suite

Comprehensive end-to-end testing suite for the Artist Management Platform with role-based testing, data isolation, and automatic cleanup.

## Quick Start

```bash
# Install Playwright browsers
npm run test:install

# Run complete test suite with reporting
npm run test:e2e

# Run smoke tests only (quick validation)
npm run test:smoke

# Generate coverage matrix report
npm run test:coverage

# Run tests with UI mode
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug
```

## Test Coverage

- **Dashboard**: Load, navigation, role-specific content
- **Projects**: CRUD operations, permissions by role
- **Contacts**: Create, edit, delete, export, share
- **Budgets**: Create, edit, export, templates, duplication
- **Bookings**: CRUD, kanban drag & drop (7 phases), filters, CSV export
- **EPKs**: Complete flow with media, contacts, private links, ZIP download

## Test Users

- `owner@demo.com` - Full workspace access
- `team_manager@demo.com` - Team and project management
- `artist_manager@demo.com` - Rita Payés management
- `artist_observer@demo.com` - Rita Payés observer
- `booking_editor@demo.com` - Gira 2025 project editor
- `marketing_viewer@demo.com` - Campaña PR project viewer

## Data Isolation & Cleanup

- All test objects prefixed with `[TEST]` for identification
- Automatic cleanup after each test case
- Verification scan to ensure no test data remains
- Cleanup tracking in reports (created vs deleted count)
- Test suite fails if uncleaned objects detected

## Reports

After running tests, find timestamped reports at:
- **HTML Report**: `test-results/reports/YYYY-MM-DD/test-report.html`
- **JSON Report**: `test-results/reports/YYYY-MM-DD/test-report.json`
- **Failures CSV**: `test-results/reports/YYYY-MM-DD/failures.csv`
- **Coverage Matrix**: `test-results/reports/YYYY-MM-DD/coverage-matrix.csv`
- **Cleanup Report**: `test-results/reports/YYYY-MM-DD/cleanup-report.txt`
- **Screenshots**: Captured on failures for debugging

## Test Scripts

- `test:e2e` - Complete test suite with full reporting
- `test:smoke` - Quick smoke tests (dashboard + key flows)
- `test:coverage` - Generate coverage matrix CSV
- `test:e2e:ui` - Interactive test runner
- `test:e2e:headed` - Visual test execution
- `test:e2e:debug` - Debug mode for test development

## Architecture

- **Page Objects**: Modular page representations with cleanup methods
- **Fixtures**: Authentication and user management
- **Enhanced Coverage Tracker**: Real-time tracking with cleanup monitoring
- **Test Data**: Reusable test data with `[TEST]` prefixing
- **Multi-role Testing**: Comprehensive permission testing
- **Automated Cleanup**: Ensures no test data pollution