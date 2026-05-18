import { test } from '@playwright/test';
import { coverageTracker } from '../utils/coverage-tracker';
import * as fs from 'fs';
import * as path from 'path';

// This test runs after all others to generate reports
test.describe.serial('Test Reports Generation', () => {
  
  test('generate final test reports', async ({ page }) => {
    console.log('📊 Generating comprehensive test reports...');
    
    // Create reports directory
    const reportsDir = 'test-results/reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Generate HTML report
    const htmlReport = coverageTracker.generateHTMLReport();
    fs.writeFileSync(path.join(reportsDir, 'test-report.html'), htmlReport);
    console.log('✅ HTML report generated: test-results/reports/test-report.html');
    
    // Generate JSON report
    const jsonReport = coverageTracker.generateJSONReport();
    fs.writeFileSync(path.join(reportsDir, 'test-report.json'), JSON.stringify(jsonReport, null, 2));
    console.log('✅ JSON report generated: test-results/reports/test-report.json');
    
    // Generate CSV failures report
    const csvReport = coverageTracker.generateCSVReport();
    fs.writeFileSync(path.join(reportsDir, 'failures.csv'), csvReport);
    console.log('✅ CSV failures report generated: test-results/reports/failures.csv');
    
    // Print summary to console
    const summary = jsonReport.summary;
    console.log('\n📈 TEST EXECUTION SUMMARY');
    console.log('========================');
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passed} (${(summary.passed / summary.totalTests * 100).toFixed(1)}%)`);
    console.log(`Failed: ${summary.failed} (${(summary.failed / summary.totalTests * 100).toFixed(1)}%)`);
    console.log(`Skipped: ${summary.skipped} (${(summary.skipped / summary.totalTests * 100).toFixed(1)}%)`);
    console.log(`Success Rate: ${summary.successRate.toFixed(1)}%`);
    
    if (summary.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      jsonReport.failures.forEach((failure, index) => {
        console.log(`${index + 1}. ${failure.testCase} (${failure.role}) - ${failure.error}`);
      });
    }
    
    console.log('\n📁 Reports available at:');
    console.log('- HTML: test-results/reports/test-report.html');
    console.log('- JSON: test-results/reports/test-report.json');
    console.log('- Failures CSV: test-results/reports/failures.csv');
    console.log('- Playwright HTML: test-results/html-report/index.html');
  });
});