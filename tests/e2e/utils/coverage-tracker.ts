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
}

export class CoverageTracker {
  private coverage: CoverageEntry[] = [];
  private results: TestResult[] = [];

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

  getCoverageMatrix() {
    const modules = ['Dashboard', 'Budgets', 'Booking', 'EPKs', 'Contacts', 'Projects'];
    const roles = ['OWNER', 'TEAM_MANAGER', 'ARTIST_MANAGER', 'ARTIST_OBSERVER', 'EDITOR', 'VIEWER'];
    const actions = ['View', 'Create', 'Edit', 'Delete', 'Export', 'Share'];

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

    return `
<!DOCTYPE html>
<html>
<head>
    <title>E2E Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .stats { display: flex; gap: 20px; margin-bottom: 20px; }
        .stat { background: #e3f2fd; padding: 15px; border-radius: 5px; text-align: center; flex: 1; }
        .matrix { margin: 20px 0; }
        .matrix table { width: 100%; border-collapse: collapse; }
        .matrix th, .matrix td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        .matrix th { background: #f0f0f0; }
        .passed { background: #4caf50; color: white; }
        .failed { background: #f44336; color: white; }
        .skipped { background: #ff9800; color: white; }
        .not_tested { background: #e0e0e0; }
        .test-results { margin: 20px 0; }
        .test-case { margin: 10px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .test-case.failed { border-color: #f44336; background: #ffebee; }
        .test-case.passed { border-color: #4caf50; background: #e8f5e8; }
        .screenshots img { max-width: 200px; margin: 5px; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="header">
        <h1>E2E Test Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
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
    </div>

    <div class="matrix">
        <h2>Coverage Matrix</h2>
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
                </tr>
            </thead>
            <tbody>
                ${Object.entries(matrix).map(([module, roles]: [string, any]) =>
                  Object.entries(roles).map(([role, actions]: [string, any]) =>
                    `<tr>
                        <td>${module}</td>
                        <td>${role}</td>
                        ${Object.entries(actions).map(([action, status]) =>
                          `<td class="${status}">${status}</td>`
                        ).join('')}
                    </tr>`
                  ).join('')
                ).join('')}
            </tbody>
        </table>
    </div>

    <div class="test-results">
        <h2>Test Results</h2>
        ${this.results.map(result => `
            <div class="test-case ${result.result}">
                <h3>${result.testCase} (${result.role})</h3>
                <p><strong>Module:</strong> ${result.module}</p>
                <p><strong>Duration:</strong> ${result.duration}ms</p>
                <p><strong>Status:</strong> ${result.result}</p>
                ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
                <details>
                    <summary>Steps</summary>
                    <ol>
                        ${result.steps.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </details>
                ${result.screenshots.length > 0 ? `
                    <div class="screenshots">
                        <strong>Screenshots:</strong><br>
                        ${result.screenshots.map(screenshot => `<img src="${screenshot}" alt="Screenshot">`).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }

  generateJSONReport() {
    return {
      summary: {
        totalTests: this.results.length,
        passed: this.results.filter(r => r.result === 'passed').length,
        failed: this.results.filter(r => r.result === 'failed').length,
        skipped: this.results.filter(r => r.result === 'skipped').length,
        successRate: this.results.length > 0 ? (this.results.filter(r => r.result === 'passed').length / this.results.length * 100) : 0,
        timestamp: new Date().toISOString()
      },
      coverage: this.getCoverageMatrix(),
      results: this.results,
      failures: this.results.filter(r => r.result === 'failed')
    };
  }

  generateCSVReport(): string {
    const failures = this.results.filter(r => r.result === 'failed');
    const csv = [
      'Priority,Test Case,Module,Role,Error,Steps,Screenshots,Timestamp'
    ];

    failures.forEach(failure => {
      const priority = this.determinePriority(failure);
      const steps = failure.steps.join('; ');
      const screenshots = failure.screenshots.join('; ');
      csv.push(`${priority},"${failure.testCase}","${failure.module}","${failure.role}","${failure.error || ''}","${steps}","${screenshots}","${failure.timestamp}"`);
    });

    return csv.join('\n');
  }

  private determinePriority(failure: TestResult): string {
    // P0: Critical flows (login, main navigation)
    if (failure.testCase.includes('Login') || failure.testCase.includes('Navigation')) {
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

export const coverageTracker = new CoverageTracker();