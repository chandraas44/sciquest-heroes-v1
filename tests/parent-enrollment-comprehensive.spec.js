import { test, expect } from '@playwright/test';
import {
  TEST_DATA,
  clearLocalStorage,
  waitForPageLoad,
  logError,
  verifyParentProfile,
  verifyStudentProfile,
  getParentStudents,
  cleanupTestData,
  generateStudentEmail,
  waitForElement,
  fillField,
  clickButton
} from './utils/parent-test-helpers.js';

const PARENT_EMAIL = TEST_DATA.PARENT_EMAIL;
const PARENT_PASSWORD = TEST_DATA.PARENT_PASSWORD;
const STUDENTS = TEST_DATA.STUDENTS;

const testResults = {
  passed: [],
  failed: [],
  startTime: new Date().toISOString()
};

function recordTestResult(testCaseId, enrollmentPath, status, details = {}) {
  const result = {
    testCaseId,
    enrollmentPath,
    status,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  if (status === 'passed') {
    testResults.passed.push(result);
  } else {
    testResults.failed.push(result);
  }
  
  return result;
}

test.describe('Parent Enrollment Comprehensive Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await clearLocalStorage(page);
  });

  test.afterAll(async () => {
    console.log('Cleaning up test data...');
    await cleanupTestData(PARENT_EMAIL);
  });

  test('PATH 1.1: Parent Signup - Landing Page to Account Selection', async ({ page }) => {
    const testCaseId = 'PATH-1.1';
    const enrollmentPath = 'Parent Signup Flow';
    
    try {
      await page.goto('/');
      await waitForPageLoad(page);
      
      const startTrialButton = await waitForElement(
        page, 
        'a:has-text("Start Free Trial"), button:has-text("Start Free Trial")',
        { errorContext: 'Start Free Trial button' }
      );
      
      if (!startTrialButton.success) {
        const altButton = await waitForElement(
          page,
          '[href*="account-type"], [href*="signup"]',
          { errorContext: 'Alternative Start Free Trial button' }
        );
        
        if (!altButton.success) {
          throw new Error('Could not find Start Free Trial button');
        }
        await altButton.element.click();
      } else {
        await startTrialButton.element.click();
      }
      
      await page.waitForURL(/account-type-selection/, { timeout: 10000 });
      await waitForPageLoad(page);
      
      const parentCard = await waitForElement(
        page,
        '[data-account-type="parent"], .account-card:has-text("Parent"), [href*="type=parent"]',
        { errorContext: 'Parent account type card' }
      );
      
      expect(parentCard.success).toBeTruthy();
      
      recordTestResult(testCaseId, enrollmentPath, 'passed', {
        description: 'Successfully navigated from landing page to account selection'
      });
    } catch (error) {
      const errorDetails = logError('PATH 1.1: Parent Signup Navigation', null, error);
      recordTestResult(testCaseId, enrollmentPath, 'failed', {
        description: 'Failed to navigate from landing page to account selection',
        error: errorDetails
      });
      throw error;
    }
  });
});

export { testResults };
