const { test, expect } = require('@playwright/test');

test.describe('Volunteer Portal Flow', () => {
  test('Check-in with Manual Code', async ({ page }) => {
    // 1. Go to CAPEC Portal
    // Assumes served at localhost:3000/volunteer-portal/capec/
    await page.goto('http://localhost:3000/volunteer-portal/capec/');

    // 2. Enter Code
    await page.fill('#manual-code', 'ABC12345');
    await page.click('button[type="submit"]');

    // 3. Verify Dashboard
    // Note: This relies on the backend being up or mocked network responses.
    // For this deliverable, we assume the user sets up the backend or we mock here.
    
    // Mocking the network response for verification without backend:
    await page.route('**/checkin', async route => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: { entry_time: new Date() } })
        });
    });
    
     await page.route('**/volunteer/*', async route => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ 
                success: true, 
                data: { 
                    volunteer: { name: 'Test User', unique_code: 'ABC12345' },
                    attendance: [],
                    tasks: []
                } 
            })
        });
    });

    await expect(page.locator('#view-dashboard')).toBeVisible();
    await expect(page.locator('#user-name')).toHaveText('Test User');
  });
});
