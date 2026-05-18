interface TestCleanupEntry {
  type: 'project' | 'contact' | 'budget' | 'booking' | 'epk';
  id: string;
  title: string;
  created: string;
  deleted?: string;
  status: 'created' | 'deleted' | 'failed_cleanup';
}

interface CoverageEntry {
  module: string;
  role: string;
  action: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  timestamp: string;
}

interface TestResult {
  testCase: string;
  steps: string[];
  result: 'passed' | 'failed' | 'skipped';
  duration: number;
  role: string;
  module: string;
  screenshots: string[];
  error?: string;
  timestamp: string;
  cleanup?: TestCleanupEntry[];
}

export class EnhancedCoverageTracker {
  private coverage: CoverageEntry[] = [];
  private results: TestResult[] = [];
  private cleanup: TestCleanupEntry[] = [];

  addCoverage(entry: Omit<CoverageEntry, 'timestamp'>) {
    this.coverage.push({
      ...entry,
      timestamp: new Date().toISOString()
    });
  }

  addResult(result: Omit<TestResult, 'timestamp'>) {
    this.results.push({
      ...result,
      timestamp: new Date().toISOString()
    });
  }

  addCleanupEntry(entry: Omit<TestCleanupEntry, 'created'>) {
    this.cleanup.push({
      ...entry,
      created: new Date().toISOString()
    });
  }

  markAsDeleted(id: string) {
    const entry = this.cleanup.find(c => c.id === id);
    if (entry) {
      entry.deleted = new Date().toISOString();
      entry.status = 'deleted';
    }
  }

  markCleanupFailed(id: string) {
    const entry = this.cleanup.find(c => c.id === id);
    if (entry) {
      entry.status = 'failed_cleanup';
    }
  }

  getUncleanedItems() {
    return this.cleanup.filter(c => c.status !== 'deleted');
  }

  getCoverageMatrix() {
    const modules = ['Dashboard', 'Projects', 'Contacts', 'Budgets', 'Booking', 'EPKs'];
    const roles = ['OWNER', 'TEAM_MANAGER', 'ARTIST_MANAGER', 'ARTIST_OBSERVER', 'EDITOR', 'VIEWER'];
    const actions = ['View', 'Create', 'Edit', 'Delete', 'Export', 'Share', 'Drag & Drop'];

    const matrix: any = {};

    modules.forEach(module => {
      matrix[module] = {};
      roles.forEach(role => {
        matrix[module][role] = {};
        actions.forEach(action => {
          const coverage = this.coverage.find(
            c => c.module === module && c.role === role && c.action === action
          );
          matrix[module][role][action] = coverage ? coverage.status : 'not_tested';
        });
      });
    });

    return matrix;
  }

  generateHTMLReport(): string {
    const matrix = this.getCoverageMatrix();
    const failedTests = this.results.filter(r => r.result === 'failed');
    const passedTests = this.results.filter(r => r.result === 'passed');
    const totalTests = this.results.length;
    const successRate = totalTests > 0 ? (passedTests.length / totalTests * 100).toFixed(2) : '0';
    const uncleanedItems = this.getUncleanedItems();
    const cleanupStats = this.getCleanupStats();

    return `
<!DOCTYPE html>
<html>
<head>
    <title>E2E Test Report - ${new Date().toLocaleDateString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .stat h3 { margin: 0; font-size: 2em; }
        .stat p { margin: 5px 0 0 0; opacity: 0.9; }
        .cleanup-section { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .cleanup-section.success { background: #d4edda; border-color: #c3e6cb; }
        .cleanup-section.danger { background: #f8d7da; border-color: #f5c6cb; }
        .matrix { margin: 30px 0; }
        .matrix table { width: 100%; border-collapse: collapse; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .matrix th { background: #343a40; color: white; padding: 12px; text-align: center; }
        .matrix td { border: 1px solid #dee2e6; padding: 8px; text-align: center; }
        .passed { background: #28a745; color: white; font-weight: bold; }
        .failed { background: #dc3545; color: white; font-weight: bold; }
        .skipped { background: #ffc107; color: black; font-weight: bold; }
        .not_tested { background: #6c757d; color: white; }
        .test-results { margin: 30px 0; }
        .test-case { margin: 15px 0; border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden; }
        .test-case.failed { border-color: #dc3545; }
        .test-case.passed { border-color: #28a745; }
        .test-header { padding: 15px; font-weight: bold; }
        .test-header.failed { background: #f8d7da; color: #721c24; }
        .test-header.passed { background: #d4edda; color: #155724; }
        .test-content { padding: 15px; }
        .screenshots img { max-width: 200px; margin: 5px; border: 1px solid #dee2e6; border-radius: 4px; }
        .cleanup-list { max-height: 300px; overflow-y: auto; }
        .cleanup-item { padding: 8px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        .cleanup-item.failed { background: #ffebee; }
        .cleanup-item.success { background: #e8f5e9; }
        details { margin: 10px 0; }
        summary { cursor: pointer; font-weight: bold; padding: 10px; background: #f8f9fa; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 E2E Test Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>Artist Management Platform - Complete Test Suite</p>
        </div>

        <div class="stats">
            <div class="stat">
                <h3>${totalTests}</h3>
                <p>Total Tests</p>
            </div>
            <div class="stat">
                <h3>${passedTests.length}</h3>
                <p>Passed</p>
            </div>
            <div class="stat">
                <h3>${failedTests.length}</h3>
                <p>Failed</p>
            </div>
            <div class="stat">
                <h3>${successRate}%</h3>
                <p>Success Rate</p>
            </div>
            <div class="stat">
                <h3>${cleanupStats.created}</h3>
                <p>Objects Created</p>
            </div>
            <div class="stat">
                <h3>${cleanupStats.deleted}</h3>
                <p>Objects Cleaned</p>
            </div>
        </div>

        <div class="cleanup-section ${uncleanedItems.length === 0 ? 'success' : 'danger'}">
            <h2>🧹 Data Cleanup Status</h2>
            <p><strong>Created:</strong> ${cleanupStats.created} | <strong>Deleted:</strong> ${cleanupStats.deleted} | <strong>Remaining:</strong> ${uncleanedItems.length}</p>
            
            ${uncleanedItems.length > 0 ? `
                <h3>⚠️ Uncleaned Test Objects:</h3>
                <div class="cleanup-list">
                    ${uncleanedItems.map(item => `
                        <div class="cleanup-item failed">
                            <span><strong>[TEST] ${item.title}</strong> (${item.type})</span>
                            <span style="color: #dc3545;">❌ Not cleaned</span>
                        </div>
                    `).join('')}
                </div>
                <p style="color: #dc3545; font-weight: bold;">❌ TEST SUITE FAILED - Uncleaned test data detected!</p>
            ` : `
                <p style="color: #28a745; font-weight: bold;">✅ All test objects successfully cleaned up!</p>
            `}
        </div>

        <div class="matrix">
            <h2>📊 Coverage Matrix (Module × Role × Action)</h2>
            <table>
                <thead>
                    <tr>
                        <th>Module</th>
                        <th>Role</th>
                        <th>View</th>
                        <th>Create</th>
                        <th>Edit</th>
                        <th>Delete</th>
                        <th>Export</th>
                        <th>Share</th>
                        <th>Drag & Drop</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(matrix).map(([module, roles]: [string, any]) =>
                      Object.entries(roles).map(([role, actions]: [string, any]) =>
                        `<tr>
                            <td><strong>${module}</strong></td>
                            <td><strong>${role}</strong></td>
                            ${Object.entries(actions).map(([action, status]) =>
                              `<td class="${status}">${status === 'not_tested' ? 'N/T' : status}</td>`
                            ).join('')}
                        </tr>`
                      ).join('')
                    ).join('')}
                </tbody>
            </table>
        </div>

        <div class="test-results">
            <h2>📋 Detailed Test Results</h2>
            ${this.results.map(result => `
                <div class="test-case ${result.result}">
                    <div class="test-header ${result.result}">
                        ${result.testCase} - ${result.role} (${result.duration}ms)
                    </div>
                    <div class="test-content">
                        <p><strong>Module:</strong> ${result.module} | <strong>Status:</strong> ${result.result}</p>
                        ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
                        
                        <details>
                            <summary>Test Steps (${result.steps.length})</summary>
                            <ol>
                                ${result.steps.map(step => `<li>${step}</li>`).join('')}
                            </ol>
                        </details>

                        ${result.screenshots.length > 0 ? `
                            <details>
                                <summary>Screenshots (${result.screenshots.length})</summary>
                                <div class="screenshots">
                                    ${result.screenshots.map(screenshot => `<img src="${screenshot}" alt="Screenshot" onclick="window.open(this.src)">`).join('')}
                                </div>
                            </details>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  }

  generateJSONReport() {
    const cleanupStats = this.getCleanupStats();
    const uncleanedItems = this.getUncleanedItems();
    
    return {
      summary: {
        totalTests: this.results.length,
        passed: this.results.filter(r => r.result === 'passed').length,
        failed: this.results.filter(r => r.result === 'failed').length,
        skipped: this.results.filter(r => r.result === 'skipped').length,
        successRate: this.results.length > 0 ? (this.results.filter(r => r.result === 'passed').length / this.results.length * 100) : 0,
        timestamp: new Date().toISOString(),
        cleanup: {
          ...cleanupStats,
          remaining: uncleanedItems.length,
          cleanupSuccess: uncleanedItems.length === 0
        }
      },
      coverage: this.getCoverageMatrix(),
      results: this.results,
      failures: this.results.filter(r => r.result === 'failed'),
      cleanup: {
        all: this.cleanup,
        uncleaned: uncleanedItems,
        stats: cleanupStats
      }
    };
  }

  generateCSVReport(): string {
    const failures = this.results.filter(r => r.result === 'failed');
    const csv = [
      'Priority,Test Case,Module,Role,Error,Steps,Screenshots,Timestamp,Cleanup Status'
    ];

    failures.forEach(failure => {
      const priority = this.determinePriority(failure);
      const steps = failure.steps.join('; ');
      const screenshots = failure.screenshots.join('; ');
      const cleanupStatus = failure.cleanup ? 
        `Created: ${failure.cleanup.length}, Cleaned: ${failure.cleanup.filter(c => c.status === 'deleted').length}` : 
        'No cleanup needed';
      
      csv.push(`${priority},"${failure.testCase}","${failure.module}","${failure.role}","${failure.error || ''}","${steps}","${screenshots}","${failure.timestamp}","${cleanupStatus}"`);
    });

    return csv.join('\n');
  }

  generateCoverageCSV(): string {
    const matrix = this.getCoverageMatrix();
    const csv = ['Module,Role,Action,Status'];
    
    Object.entries(matrix).forEach(([module, roles]: [string, any]) => {
      Object.entries(roles).forEach(([role, actions]: [string, any]) => {
        Object.entries(actions).forEach(([action, status]) => {
          csv.push(`${module},${role},${action},${status}`);
        });
      });
    });
    
    return csv.join('\n');
  }

  private getCleanupStats() {
    return {
      created: this.cleanup.length,
      deleted: this.cleanup.filter(c => c.status === 'deleted').length,
      failed: this.cleanup.filter(c => c.status === 'failed_cleanup').length
    };
  }

  private determinePriority(failure: TestResult): string {
    // P0: Critical flows (login, main navigation, cleanup failures)
    if (failure.testCase.includes('Login') || failure.testCase.includes('Navigation') || failure.testCase.includes('Cleanup')) {
      return 'P0';
    }
    
    // P1: Core functionality (CRUD operations)
    if (failure.testCase.includes('Create') || failure.testCase.includes('Edit') || failure.testCase.includes('Delete')) {
      return 'P1';
    }
    
    // P2: Secondary features
    return 'P2';
  }
}

export const enhancedCoverageTracker = new EnhancedCoverageTracker();