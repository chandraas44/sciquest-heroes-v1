import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Test Configuration for SciQuest Heroes
 * 
 * This configuration sets up automated testing for all student user paths
 * including enrollment, lesson completion, and dashboard viewing.
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: path.resolve(__dirname, 'tests'),
  
  // Maximum time one test can run
  timeout: 60 * 1000,
  
  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['list']
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for all tests
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    
    // Collect trace on failure
    trace: 'on-first-retry',
    
    // Screenshot on failure (saved to test-results/)
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },
    
    // Video on failure (saved to test-results/)
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 },
    },
  },
  
  // Output directory for test artifacts
  outputDir: 'test-results/',

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run local dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

