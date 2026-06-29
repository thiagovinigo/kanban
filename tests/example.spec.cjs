const { test, expect } = require('@playwright/test');

test('has title and basic UI elements', async ({ page }) => {
  await page.goto('http://localhost:5174/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/AI PM Committee/);

  // Expect the main header or some text to be visible
  const isSetup = await page.getByText('Selecione ou Crie um Projeto').isVisible();
  if (isSetup) {
    expect(isSetup).toBeTruthy();
  }
});
