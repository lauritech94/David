import { test } from '@playwright/test';
import { enhancedCoverageTracker } from '../utils/enhanced-coverage-tracker';
import * as fs from 'fs';
import * as path from 'path';

// This test runs after all others to generate comprehensive reports
test.describe.serial('Enhanced Test Reports Generation', () => {
  
  test('generate comprehensive test reports with cleanup tracking', async ({ page }) => {
    console.log('📊 Generating comprehensive test reports with cleanup tracking...');
    
    // Create reports directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const reportsDir = `test-results/reports/${timestamp}`;
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Generate HTML report with cleanup tracking
    const htmlReport = enhancedCoverageTracker.generateHTMLReport();
    fs.writeFileSync(path.join(reportsDir, 'test-report.html'), htmlReport);
    console.log(`✅ Enhanced HTML report: ${reportsDir}/test-report.html`);
    
    // Generate JSON report with full details
    const jsonReport = enhancedCoverageTracker.generateJSONReport();
    fs.writeFileSync(path.join(reportsDir, 'test-report.json'), JSON.stringify(jsonReport, null, 2));
    console.log(`✅ JSON report: ${reportsDir}/test-report.json`);
    
    // Generate CSV failures report with cleanup status
    const csvReport = enhancedCoverageTracker.generateCSVReport();
    fs.writeFileSync(path.join(reportsDir, 'failures.csv'), csvReport);
    console.log(`✅ Failures CSV: ${reportsDir}/failures.csv`);
    
    // Generate coverage matrix CSV
    const coverageCSV = enhancedCoverageTracker.generateCoverageCSV();
    fs.writeFileSync(path.join(reportsDir, 'coverage-matrix.csv'), coverageCSV);
    console.log(`✅ Coverage matrix CSV: ${reportsDir}/coverage-matrix.csv`);
    
    // Generate cleanup report
    const cleanupReport = generateCleanupReport(jsonReport.cleanup);
    fs.writeFileSync(path.join(reportsDir, 'cleanup-report.txt'), cleanupReport);
    console.log(`✅ Cleanup report: ${reportsDir}/cleanup-report.txt`);
    
    // Print comprehensive summary to console
    const summary = jsonReport.summary;
    console.log('\n' + '='.repeat(80));
    console.log('📈 COMPREHENSIVE TEST EXECUTION SUMMARY');
    console.log('='.repeat(80));
    console.log(`📅 Timestamp: ${summary.timestamp}`);
    console.log(`🧪 Total Tests: ${summary.totalTests}`);
    console.log(`✅ Passed: ${summary.passed} (${(summary.passed / summary.totalTests * 100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${summary.failed} (${(summary.failed / summary.totalTests * 100).toFixed(1)}%)`);
    console.log(`⏭️  Skipped: ${summary.skipped} (${(summary.skipped / summary.totalTests * 100).toFixed(1)}%)`);
    console.log(`🎯 Success Rate: ${summary.successRate.toFixed(1)}%`);
    console.log('');
    console.log('🧹 CLEANUP SUMMARY');
    console.log('-'.repeat(40));
    console.log(`📦 Objects Created: ${summary.cleanup.created}`);
    console.log(`🗑️  Objects Deleted: ${summary.cleanup.deleted}`);
    console.log(`⚠️  Cleanup Failed: ${summary.cleanup.failed}`);
    console.log(`🔍 Remaining Objects: ${summary.cleanup.remaining}`);
    console.log(`${summary.cleanup.cleanupSuccess ? '✅' : '❌'} Cleanup Status: ${summary.cleanup.cleanupSuccess ? 'SUCCESS' : 'FAILED'}`);
    
    if (summary.cleanup.remaining > 0) {
      console.log('\n❌ UNCLEANED TEST OBJECTS:');
      jsonReport.cleanup.uncleaned.forEach((item, index) => {
        console.log(`${index + 1}. [${item.type.toUpperCase()}] ${item.title} (${item.status})`);
      });
      console.log('\n⚠️  WARNING: Test suite contains data leaks! Clean up manually.');
    }
    
    if (summary.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      jsonReport.failures.forEach((failure, index) => {
        console.log(`${index + 1}. ${failure.testCase} (${failure.role})`);
        console.log(`   📍 Module: ${failure.module}`);
        console.log(`   ⚠️  Error: ${failure.error}`);
        console.log(`   ⏱️  Duration: ${failure.duration}ms`);
        console.log('');
      });
    }
    
    // Coverage Analysis
    const coverageMatrix = jsonReport.coverage;
    const totalCombinations = Object.keys(coverageMatrix).length * 
      Object.keys(coverageMatrix[Object.keys(coverageMatrix)[0]]).length * 
      Object.keys(coverageMatrix[Object.keys(coverageMatrix)[0]][Object.keys(coverageMatrix[Object.keys(coverageMatrix)[0]])[0]]).length;
    
    let testedCombinations = 0;
    let passedCombinations = 0;
    
    Object.values(coverageMatrix).forEach((roles: any) => {
      Object.values(roles).forEach((actions: any) => {
        Object.values(actions).forEach((status: any) => {
          if (status !== 'not_tested') {
            testedCombinations++;
            if (status === 'passed') {
              passedCombinations++;
            }
          }
        });
      });
    });
    
    console.log('\n📊 COVERAGE ANALYSIS');
    console.log('-'.repeat(40));
    console.log(`🎯 Total Combinations: ${totalCombinations}`);
    console.log(`🧪 Tested Combinations: ${testedCombinations} (${(testedCombinations / totalCombinations * 100).toFixed(1)}%)`);
    console.log(`✅ Passed Combinations: ${passedCombinations} (${(passedCombinations / totalCombinations * 100).toFixed(1)}%)`);
    
    console.log('\n📁 REPORTS GENERATED');
    console.log('-'.repeat(40));
    console.log(`📄 HTML Report: ${reportsDir}/test-report.html`);
    console.log(`📊 JSON Report: ${reportsDir}/test-report.json`);
    console.log(`📈 Failures CSV: ${reportsDir}/failures.csv`);
    console.log(`📋 Coverage Matrix: ${reportsDir}/coverage-matrix.csv`);
    console.log(`🧹 Cleanup Report: ${reportsDir}/cleanup-report.txt`);
    console.log(`🎭 Playwright Report: test-results/html-report/index.html`);
    
    console.log('\n' + '='.repeat(80));
    
    // Final status
    if (!summary.cleanup.cleanupSuccess) {
      console.log('🚨 TEST SUITE STATUS: FAILED (Data cleanup incomplete)');
      throw new Error('Test suite failed due to incomplete data cleanup');
    } else if (summary.failed > 0) {
      console.log('⚠️  TEST SUITE STATUS: FAILED (Test failures detected)');
    } else {
      console.log('🎉 TEST SUITE STATUS: PASSED (All tests passed, cleanup complete)');
    }
  });
});

function generateCleanupReport(cleanupData: any): string {
  const report = [
    'TEST DATA CLEANUP REPORT',
    '='.repeat(50),
    `Generated: ${new Date().toLocaleString()}`,
    '',
    'SUMMARY:',
    `- Objects Created: ${cleanupData.stats.created}`,
    `- Objects Deleted: ${cleanupData.stats.deleted}`,
    `- Cleanup Failed: ${cleanupData.stats.failed}`,
    `- Remaining Objects: ${cleanupData.uncleaned.length}`,
    `- Cleanup Success: ${cleanupData.uncleaned.length === 0 ? 'YES' : 'NO'}`,
    ''
  ];
  
  if (cleanupData.all.length > 0) {
    report.push('ALL TEST OBJECTS:');
    report.push('-'.repeat(30));
    cleanupData.all.forEach((item: any, index: number) => {
      report.push(`${index + 1}. [${item.type.toUpperCase()}] ${item.title}`);
      report.push(`   Status: ${item.status}`);
      report.push(`   Created: ${item.created}`);
      if (item.deleted) {
        report.push(`   Deleted: ${item.deleted}`);
      }
      report.push('');
    });
  }
  
  if (cleanupData.uncleaned.length > 0) {
    report.push('UNCLEANED OBJECTS (REQUIRES MANUAL CLEANUP):');
    report.push('-'.repeat(45));
    cleanupData.uncleaned.forEach((item: any, index: number) => {
      report.push(`${index + 1}. [${item.type.toUpperCase()}] ${item.title}`);
      report.push(`   Status: ${item.status}`);
      report.push(`   Created: ${item.created}`);
      report.push('   ⚠️  MANUAL CLEANUP REQUIRED');
      report.push('');
    });
  }
  
  return report.join('\n');
}