/**
 * Playwright Configuration
 * 
 * Default configuration file for Playwright tests.
 * This can be overridden by providing a custom playwright.config.js
 * in the test directory.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './',
  
  // Output directory for test results
  outputDir: process.env.RESULTS_DIR || './test-results',
  
  // Test timeout
  timeout: parseInt(process.env.TIMEOUT || '30000', 10),
  
  // Expect timeout
  expect: {
    timeout: 5000
  },
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : parseInt(process.env.RETRIES || '0', 10),
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : (process.env.WORKERS ? parseInt(process.env.WORKERS, 10) : undefined),
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: './test-results/html', open: 'never' }],
    ['json', { outputFile: './test-results/report.json' }],
    ['list']
  ],
  
  // Shared settings for all tests
  use: {
    // Base URL for tests
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Take screenshot only on failure
    screenshot: 'only-on-failure',
    
    // Record video only on failure
    video: 'retain-on-failure',
    
    // Headless mode
    headless: process.env.HEADLESS !== 'false',
    
    // Viewport size
    viewport: { width: 1920, height: 1080 },
    
    // Ignore HTTPS errors (useful for development)
    ignoreHTTPSErrors: process.env.IGNORE_HTTPS_ERRORS === 'true'
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ],
  
  // Global setup (runs once before all tests)
  // globalSetup: require.resolve('./global-setup.js'),
  
  // Global teardown (runs once after all tests)
  // globalTeardown: require.resolve('./global-teardown.js'),
});
