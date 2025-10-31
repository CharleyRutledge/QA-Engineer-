/**
 * Sample Playwright Test Script
 * 
 * This is an example test script that can be used as a template
 * or reference for generated test scripts.
 * 
 * Environment Variables:
 * - BASE_URL: Base URL for the application under test
 * - TEST_TIMEOUT: Test timeout in milliseconds
 */

const { test, expect } = require('@playwright/test');

// Get base URL from environment or use default
const BASE_URL = process.env.BASE_URL || 'https://example.com';

test.describe('Sample Test Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to base URL before each test
    await page.goto(BASE_URL);
  });

  test('should load the homepage', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify page title
    await expect(page).toHaveTitle(/.*/);
    
    // Take a screenshot
    await page.screenshot({ path: 'screenshot-homepage.png' });
  });

  test('should have correct page structure', async ({ page }) => {
    // Check for main content elements
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Verify specific elements exist (adjust selectors as needed)
    // const header = page.locator('header');
    // await expect(header).toBeVisible();
  });

  test('should handle navigation', async ({ page }) => {
    // Example navigation test
    // Uncomment and modify based on your application
    
    // const link = page.locator('a[href="/about"]');
    // if (await link.count() > 0) {
    //   await link.click();
    //   await expect(page).toHaveURL(/.*about.*/);
    // }
  });

  test('should handle form submission', async ({ page }) => {
    // Example form test
    // Uncomment and modify based on your application
    
    // const form = page.locator('form');
    // if (await form.count() > 0) {
    //   await form.locator('input[name="email"]').fill('test@example.com');
    //   await form.locator('button[type="submit"]').click();
    //   await page.waitForLoadState('networkidle');
    // }
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Test error handling
    // Navigate to a non-existent page
    const response = await page.goto(`${BASE_URL}/non-existent-page`, { 
      waitUntil: 'networkidle' 
    }).catch(() => null);
    
    // Verify error handling (adjust based on your app)
    if (response) {
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  });

  test('should have accessible elements', async ({ page }) => {
    // Basic accessibility checks
    const mainContent = page.locator('main, [role="main"]');
    if (await mainContent.count() > 0) {
      await expect(mainContent).toBeVisible();
    }
    
    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();
    for (let i = 0; i < Math.min(imageCount, 5); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // Alt text should exist (can be empty for decorative images)
      expect(alt).not.toBeNull();
    }
  });

});

test.describe('API Tests', () => {
  
  test('should fetch data from API', async ({ request }) => {
    // Example API test
    // Uncomment and modify based on your API
    
    // const response = await request.get(`${BASE_URL}/api/status`);
    // expect(response.ok()).toBeTruthy();
    // const data = await response.json();
    // expect(data).toHaveProperty('status');
  });

});

test.describe('Performance Tests', () => {
  
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Log load time
    console.log(`Page load time: ${loadTime}ms`);
    
    // Verify load time is acceptable (adjust threshold as needed)
    expect(loadTime).toBeLessThan(5000);
  });

});
