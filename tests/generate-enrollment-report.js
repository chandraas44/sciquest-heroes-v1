import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Playwright test results
function readTestResults() {
  const resultsPath = path.resolve(__dirname, '../test-results/test-results.json');
  
  if (!fs.existsSync(resultsPath)) {
    console.error('Test results file not found:', resultsPath);
    return null;
  }
  
  try {
    const resultsData = fs.readFileSync(resultsPath, 'utf-8');
    return JSON.parse(resultsData);
  } catch (error) {
    console.error('Error reading test results:', error);
    return null;
  }
}

// Analyze test results and generate report
function generateReport(testResults) {
  if (!testResults || !testResults.suites) {
    return {
      error: 'No test results found',
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        passRate: 0
      },
      failures: []
    };
  }

  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const failures = [];
  const passedTests = [];

  // Recursively process all tests
  function processSuite(suite) {
    if (suite.specs) {
      suite.specs.forEach(spec => {
        spec.tests.forEach(test => {
          total++;
          
          if (test.results && test.results.length > 0) {
            const result = test.results[test.results.length - 1]; // Get last result (after retries)
            
            if (result.status === 'passed') {
              passed++;
              passedTests.push({
                title: test.title,
                duration: result.duration,
                path: spec.title
              });
            } else if (result.status === 'failed') {
              failed++;
              
              // Extract error information
              const error = result.error || {};
              const attachments = result.attachments || [];
              const screenshot = attachments.find(a => a.name === 'screenshot' || a.path?.includes('.png'));
              
              // Parse test title to extract student info
              const studentMatch = test.title.match(/(Kiddo\d+|kiddo\d+).*?Age\s+(\d+)/i);
              const studentInfo = studentMatch ? {
                name: studentMatch[1],
                age: parseInt(studentMatch[2])
              } : null;
              
              // Determine enrollment path from test title
              let enrollmentPath = 'Unknown';
              if (test.title.includes('Parent Signup')) {
                enrollmentPath = 'Parent Signup Flow';
              } else if (test.title.includes('Parent Login')) {
                enrollmentPath = 'Parent Login Flow';
              } else if (test.title.includes('Student Enrollment')) {
                enrollmentPath = 'Student Enrollment via Student Signup';
              } else if (test.title.includes('Multiple Student')) {
                enrollmentPath = 'Multiple Student Enrollment';
              }
              
              failures.push({
                testCaseId: test.title.match(/PATH[-\s]?[\d.]+/)?.[0] || 'Unknown',
                testTitle: test.title,
                enrollmentPath,
                student: studentInfo,
                failurePoint: 'Test execution',
                errorMessage: error.message || 'Unknown error',
                errorStack: error.stack,
                errorLocation: error.location,
                duration: result.duration,
                screenshot: screenshot?.path,
                timestamp: new Date().toISOString()
              });
            } else if (result.status === 'skipped') {
              skipped++;
            }
          }
        });
      });
    }
    
    if (suite.suites) {
      suite.suites.forEach(subSuite => processSuite(subSuite));
    }
  }

  // Process all suites
  testResults.suites.forEach(suite => processSuite(suite));

  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

  return {
    summary: {
      total,
      passed,
      failed,
      skipped,
      passRate: parseFloat(passRate)
    },
    failures,
    passedTests,
    timestamp: new Date().toISOString()
  };
}

// Generate root cause analysis
function analyzeRootCause(failure) {
  const errorMessage = failure.errorMessage.toLowerCase();
  const errorStack = failure.errorStack?.toLowerCase() || '';
  
  let rootCause = 'Unknown';
  let suggestedFix = 'Investigate the error message and stack trace';
  let severity = 'MEDIUM';
  
  // Network/API errors
  if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
    rootCause = 'Network timeout or connectivity issue';
    suggestedFix = 'Check network connectivity, increase timeout values, or verify API endpoints are accessible';
    severity = 'HIGH';
  }
  
  // Element not found errors
  else if (errorMessage.includes('locator') || errorMessage.includes('element') || errorMessage.includes('selector')) {
    rootCause = 'UI element not found or selector mismatch';
    suggestedFix = 'Verify the element selector exists in the HTML, check if page loaded completely, or update selector';
    severity = 'HIGH';
  }
  
  // Authentication errors
  else if (errorMessage.includes('auth') || errorMessage.includes('login') || errorMessage.includes('session')) {
    rootCause = 'Authentication or session issue';
    suggestedFix = 'Verify user credentials, check session management, or ensure user account exists';
    severity = 'CRITICAL';
  }
  
  // Database/Profile errors
  else if (errorMessage.includes('profile') || errorMessage.includes('database') || errorMessage.includes('supabase')) {
    rootCause = 'Database or profile creation issue';
    suggestedFix = 'Check database connection, verify RLS policies, or ensure proper data insertion';
    severity = 'CRITICAL';
  }
  
  // Validation errors
  else if (errorMessage.includes('validation') || errorMessage.includes('required') || errorMessage.includes('invalid')) {
    rootCause = 'Form validation issue';
    suggestedFix = 'Check form validation logic, ensure all required fields are filled, or verify input format';
    severity = 'MEDIUM';
  }
  
  // Redirect errors
  else if (errorMessage.includes('redirect') || errorMessage.includes('navigation') || errorMessage.includes('url')) {
    rootCause = 'Page redirect or navigation issue';
    suggestedFix = 'Verify redirect URLs are correct, check navigation logic, or ensure target page exists';
    severity = 'HIGH';
  }
  
  // Assertion errors
  else if (errorMessage.includes('expect') || errorMessage.includes('assert')) {
    rootCause = 'Test assertion failed - expected condition not met';
    suggestedFix = 'Verify the application behavior matches expected outcome, check test expectations, or review application logic';
    severity = 'MEDIUM';
  }
  
  return {
    rootCause,
    suggestedFix,
    severity
  };
}

// Generate markdown report
function generateMarkdownReport(analysis) {
  const { summary, failures, passedTests, timestamp } = analysis;
  
  let report = `# Parent Enrollment Comprehensive Test Report\n\n`;
  report += `**Generated:** ${new Date(timestamp).toLocaleString()}\n`;
  report += `**Test File:** \`tests/parent-enrollment-comprehensive.spec.js\`\n`;
  report += `**Application URL:** \`http://localhost:3000\`\n\n`;
  
  report += `## 📊 Executive Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| **Total Tests** | ${summary.total} |\n`;
  report += `| **Passed** | ${summary.passed} ✅ |\n`;
  report += `| **Failed** | ${summary.failed} ❌ |\n`;
  report += `| **Skipped** | ${summary.skipped} ⏭️ |\n`;
  report += `| **Pass Rate** | ${summary.passRate}% |\n\n`;
  
  if (summary.failed === 0) {
    report += `## ✅ All Tests Passed!\n\n`;
    report += `All enrollment paths are working correctly.\n\n`;
  } else {
    report += `## ❌ Test Failures (${summary.failed})\n\n`;
    
    // Group failures by enrollment path
    const failuresByPath = {};
    failures.forEach(failure => {
      const path = failure.enrollmentPath;
      if (!failuresByPath[path]) {
        failuresByPath[path] = [];
      }
      failuresByPath[path].push(failure);
    });
    
    // Report by path
    Object.keys(failuresByPath).forEach(path => {
      const pathFailures = failuresByPath[path];
      report += `### ${path} (${pathFailures.length} failure${pathFailures.length > 1 ? 's' : ''})\n\n`;
      
      pathFailures.forEach((failure, index) => {
        const analysis = analyzeRootCause(failure);
        
        report += `#### Failure ${index + 1}: ${failure.testTitle}\n\n`;
        report += `**Test Case ID:** ${failure.testCaseId}\n\n`;
        
        if (failure.student) {
          report += `**Student Information:**\n`;
          report += `- Name: ${failure.student.name}\n`;
          report += `- Age: ${failure.student.age}\n\n`;
        }
        
        report += `**Failure Point:** ${failure.failurePoint}\n\n`;
        report += `**Error Message:**\n`;
        report += `\`\`\`\n${failure.errorMessage}\n\`\`\`\n\n`;
        
        report += `**Root Cause Analysis:**\n`;
        report += `- **Root Cause:** ${analysis.rootCause}\n`;
        report += `- **Severity:** ${analysis.severity}\n`;
        report += `- **Suggested Fix:** ${analysis.suggestedFix}\n\n`;
        
        if (failure.errorLocation) {
          report += `**Error Location:**\n`;
          report += `- File: ${failure.errorLocation.file || 'Unknown'}\n`;
          report += `- Line: ${failure.errorLocation.line || 'Unknown'}\n`;
          report += `- Column: ${failure.errorLocation.column || 'Unknown'}\n\n`;
        }
        
        if (failure.screenshot) {
          const screenshotPath = path.relative(path.resolve(__dirname, '..'), failure.screenshot);
          report += `**Screenshot:** \`${screenshotPath}\`\n\n`;
        }
        
        report += `**Test Duration:** ${(failure.duration / 1000).toFixed(2)}s\n\n`;
        report += `---\n\n`;
      });
    });
    
    // Summary table of all failures
    report += `## 📋 Failure Summary Table\n\n`;
    report += `| Test Case ID | Enrollment Path | Student | Root Cause | Severity |\n`;
    report += `|--------------|-----------------|---------|------------|----------|\n`;
    
    failures.forEach(failure => {
      const analysis = analyzeRootCause(failure);
      const studentInfo = failure.student 
        ? `${failure.student.name} (Age ${failure.student.age})`
        : 'N/A';
      
      report += `| ${failure.testCaseId} | ${failure.enrollmentPath} | ${studentInfo} | ${analysis.rootCause} | ${analysis.severity} |\n`;
    });
    
    report += `\n`;
  }
  
  // Passed tests summary
  if (passedTests.length > 0) {
    report += `## ✅ Passing Tests (${passedTests.length})\n\n`;
    report += `| Test | Duration |\n`;
    report += `|------|----------|\n`;
    
    passedTests.forEach(test => {
      report += `| ${test.title} | ${(test.duration / 1000).toFixed(2)}s |\n`;
    });
    
    report += `\n`;
  }
  
  // Recommendations
  report += `## 🔧 Recommendations\n\n`;
  
  if (summary.failed > 0) {
    const criticalFailures = failures.filter(f => analyzeRootCause(f).severity === 'CRITICAL');
    const highFailures = failures.filter(f => analyzeRootCause(f).severity === 'HIGH');
    
    if (criticalFailures.length > 0) {
      report += `### Critical Issues (${criticalFailures.length})\n\n`;
      report += `These issues block core enrollment functionality:\n\n`;
      criticalFailures.forEach(failure => {
        const analysis = analyzeRootCause(failure);
        report += `- **${failure.testCaseId}**: ${analysis.rootCause}\n`;
      });
      report += `\n`;
    }
    
    if (highFailures.length > 0) {
      report += `### High Priority Issues (${highFailures.length})\n\n`;
      report += `These issues significantly impact user experience:\n\n`;
      highFailures.forEach(failure => {
        const analysis = analyzeRootCause(failure);
        report += `- **${failure.testCaseId}**: ${analysis.rootCause}\n`;
      });
      report += `\n`;
    }
    
    report += `### Next Steps\n\n`;
    report += `1. Review all failure root causes above\n`;
    report += `2. Prioritize fixes based on severity (Critical → High → Medium)\n`;
    report += `3. Fix application issues or update test expectations\n`;
    report += `4. Re-run tests to verify fixes\n`;
    report += `5. Check screenshots in \`test-results/\` directory for visual debugging\n\n`;
  } else {
    report += `All tests passed! No recommendations at this time.\n\n`;
  }
  
  report += `## 📁 Test Artifacts\n\n`;
  report += `- **Test Results JSON:** \`test-results/test-results.json\`\n`;
  report += `- **Screenshots:** \`test-results/*/test-failed-*.png\`\n`;
  report += `- **Videos:** \`test-results/*/video.webm\`\n`;
  report += `- **HTML Report:** \`playwright-report/index.html\`\n\n`;
  
  report += `---\n\n`;
  report += `*Report generated automatically by test execution*\n`;
  
  return report;
}

// Main execution
function main() {
  console.log('Generating comprehensive enrollment test report...');
  
  const testResults = readTestResults();
  if (!testResults) {
    console.error('Failed to read test results. Make sure tests have been run.');
    process.exit(1);
  }
  
  const analysis = generateReport(testResults);
  const markdownReport = generateMarkdownReport(analysis);
  
  // Write report to file
  const reportPath = path.resolve(__dirname, '../docs/PARENT_ENROLLMENT_COMPREHENSIVE_REPORT.md');
  fs.writeFileSync(reportPath, markdownReport, 'utf-8');
  
  console.log(`✅ Report generated: ${reportPath}`);
  console.log(`\nSummary:`);
  console.log(`  Total: ${analysis.summary.total}`);
  console.log(`  Passed: ${analysis.summary.passed}`);
  console.log(`  Failed: ${analysis.summary.failed}`);
  console.log(`  Pass Rate: ${analysis.summary.passRate}%`);
}

main();

