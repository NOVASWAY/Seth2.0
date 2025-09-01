#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test categories and their corresponding test files
const testCategories = {
  'Authentication': ['e2e/auth.spec.ts'],
  'Input Validation': ['e2e/comprehensive/system-input.spec.ts'],
  'Patient Management': ['e2e/comprehensive/patient-management.spec.ts'],
  'Prescription System': ['e2e/comprehensive/prescription-system.spec.ts'],
  'Diagnostics': ['e2e/comprehensive/diagnostics-system.spec.ts'],
  'Inventory Management': ['e2e/comprehensive/inventory-management.spec.ts'],
  'Financial & Claims': ['e2e/comprehensive/financial-claims.spec.ts'],
  'SHA Insurance': ['e2e/comprehensive/sha-insurance.spec.ts'],
  'Admin Functions': ['e2e/comprehensive/admin-functions.spec.ts'],
  'Queue Management': ['e2e/comprehensive/queue-management.spec.ts'],
  'Security & Access Control': ['e2e/comprehensive/security-access.spec.ts'],
  'Data Export & Import': ['e2e/comprehensive/data-export-import.spec.ts'],
  'Performance & Load': ['e2e/comprehensive/performance-load.spec.ts'],
  'Error Handling': ['e2e/comprehensive/error-handling.spec.ts'],
  'Integration Tests': ['e2e/comprehensive/integration.spec.ts']
};

// Test execution options
const testOptions = {
  project: 'chromium',
  workers: 1, // Run tests sequentially for better error tracking
  timeout: 30000,
  retries: 1,
  reporter: ['html', 'json', 'junit']
};

// Results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  categories: {}
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function runTestCategory(category, testFiles) {
  log(`Starting tests for category: ${category}`);
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  for (const testFile of testFiles) {
    if (!fs.existsSync(testFile)) {
      log(`Test file not found: ${testFile}`, 'error');
      results.errors.push(`File not found: ${testFile}`);
      continue;
    }

    try {
      log(`Running tests from: ${testFile}`);
      
      const command = `npx playwright test ${testFile} --project=${testOptions.project} --workers=${testOptions.workers} --timeout=${testOptions.timeout} --reporter=list`
      
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Parse test results
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('passed')) {
          const match = line.match(/(\d+) passed/);
          if (match) results.passed += parseInt(match[1]);
        }
        if (line.includes('failed')) {
          const match = line.match(/(\d+) failed/);
          if (match) results.failed += parseInt(match[1]);
        }
        if (line.includes('skipped')) {
          const match = line.match(/(\d+) skipped/);
          if (match) results.skipped += parseInt(match[1]);
        }
      }

      results.total = results.passed + results.failed + results.skipped;
      
      if (results.failed > 0) {
        log(`${results.failed} tests failed in ${testFile}`, 'error');
      } else {
        log(`All tests passed in ${testFile}`, 'success');
      }

    } catch (error) {
      log(`Error running tests in ${testFile}: ${error.message}`, 'error');
      results.errors.push(`Execution error: ${error.message}`);
      results.failed++;
    }
  }

  return results;
}

function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      skipped: testResults.skipped,
      successRate: testResults.total > 0 ? (testResults.passed / testResults.total * 100).toFixed(2) : 0
    },
    categories: testResults.categories,
    recommendations: []
  };

  // Generate recommendations based on results
  if (testResults.failed > 0) {
    report.recommendations.push('Review and fix failed tests before deployment');
  }
  
  if (testResults.skipped > 0) {
    report.recommendations.push('Investigate skipped tests to ensure complete coverage');
  }

  if (testResults.total < 100) {
    report.recommendations.push('Consider adding more test cases for comprehensive coverage');
  }

  return report;
}

function saveReport(report) {
  const reportDir = 'test-reports';
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const filename = `comprehensive-test-report-${new Date().toISOString().split('T')[0]}.json`;
  const filepath = path.join(reportDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  log(`Test report saved to: ${filepath}`);
}

// Main execution
async function runComprehensiveTests() {
  log('🚀 Starting Comprehensive System Testing');
  log('==========================================');

  // Check if system is ready
  try {
    log('Checking system readiness...');
    execSync('npm run build', { stdio: 'pipe' });
    log('System build successful', 'success');
  } catch (error) {
    log('System build failed. Please fix build issues before running tests.', 'error');
    process.exit(1);
  }

  // Run tests for each category
  for (const [category, testFiles] of Object.entries(testCategories)) {
    log(`\n📋 Testing Category: ${category}`);
    log('----------------------------------------');
    
    const results = runTestCategory(category, testFiles);
    testResults.categories[category] = results;
    
    testResults.total += results.total;
    testResults.passed += results.passed;
    testResults.failed += results.failed;
    testResults.skipped += results.skipped;
    
    log(`Category ${category} completed: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped`);
  }

  // Generate and save final report
  log('\n📊 Generating Test Report');
  log('==========================');
  
  const report = generateReport();
  saveReport(report);

  // Print summary
  log('\n🎯 Test Execution Summary');
  log('==========================');
  log(`Total Tests: ${testResults.total}`);
  log(`Passed: ${testResults.passed} ✅`);
  log(`Failed: ${testResults.failed} ❌`);
  log(`Skipped: ${testResults.skipped} ⏭️`);
  log(`Success Rate: ${report.summary.successRate}%`);

  if (testResults.failed > 0) {
    log('\n⚠️  Some tests failed. Please review the detailed report and fix issues.', 'error');
    process.exit(1);
  } else {
    log('\n🎉 All tests passed! System is ready for deployment.', 'success');
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Comprehensive System Test Runner

Usage: node scripts/run-comprehensive-tests.js [options]

Options:
  --category <name>    Run tests for specific category only
  --parallel          Run tests in parallel (default: sequential)
  --verbose           Show detailed output
  --help, -h          Show this help message

Categories:
  ${Object.keys(testCategories).join(', ')}
`);
  process.exit(0);
}

// Run the tests
runComprehensiveTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});
