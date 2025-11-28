/**
 * Run all automated tests
 * Can be run with Node.js or in browser
 */

// Import test modules
const dashboardTests = require('./dashboard-fallback.test.js');
const quizRoutingTests = require('./quiz-routing.test.js');

async function runAllTests() {
  console.log('🚀 Starting Automated Test Suite');
  console.log('='.repeat(50));
  
  const results = {
    dashboard: { passed: 0, failed: 0, total: 0 },
    quizRouting: { passed: 0, failed: 0, total: 0 }
  };

  // Run Dashboard Fallback Tests
  console.log('\n📋 Running Parent Dashboard Fallback Tests...');
  try {
    const dashboardResult = await dashboardTests.runTests();
    results.dashboard = dashboardResult;
  } catch (error) {
    console.error('❌ Dashboard tests failed to run:', error);
    results.dashboard.failed = 1;
  }

  // Run Quiz Routing Tests
  console.log('\n📋 Running Quiz Routing Tests...');
  try {
    const quizResult = await quizRoutingTests.runTests();
    results.quizRouting = quizResult;
  } catch (error) {
    console.error('❌ Quiz routing tests failed to run:', error);
    results.quizRouting.failed = 1;
  }

  // Final Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Dashboard Fallback: ${results.dashboard.passed}/${results.dashboard.total} passed`);
  console.log(`Quiz Routing: ${results.quizRouting.passed}/${results.quizRouting.total} passed`);
  
  const totalPassed = results.dashboard.passed + results.quizRouting.passed;
  const totalFailed = results.dashboard.failed + results.quizRouting.failed;
  const totalTests = results.dashboard.total + results.quizRouting.total;
  
  console.log(`\nOverall: ${totalPassed}/${totalTests} passed, ${totalFailed} failed`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Fatal error running tests:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };

