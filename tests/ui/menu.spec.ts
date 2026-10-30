import { test, expect } from '@playwright/test';
import { MenuPage, buildMenu } from '../pages/MenuPage';

// §2.1 Menu display (`/`)
// The menu API is mocked with synthetic data, so these tests check the UI renders whatever
// it is given and never break when the real menu changes; real data is covered in §3.1.

test.describe('Menu display', () => {
  const entries = buildMenu();
  let menu: MenuPage;

  test.beforeEach(async ({ page }) => {
    menu = new MenuPage(page);
    await menu.mockMenu(entries);
    await menu.goto();
  });

  test('renders the menu items in API order', async () => {
    await expect(menu.itemNames).toHaveText(entries.map(entry => entry.name));
  });

  test('each item shows its description, image and quantity controls', async () => {
    for (const entry of entries) {
      await test.step(entry.name, async () => {
        const item = menu.item(entry.name);

        await expect.soft(item.description).toHaveText(entry.description);
        await expect.soft(item.image).toHaveAttribute('alt', entry.name);
        // The fallback placeholder is visible too, and `src` only switches to it after the
        // request fails, so wait for a decoded image and check it is the real one.
        await expect
          .soft
          .poll(() =>
            item.image.evaluate((img: HTMLImageElement) =>
              img.complete && img.naturalWidth > 0 ? img.currentSrc : '',
            ),
          )
          .toMatch(new RegExp(`/${entry.imageUrl}$`));
        await expect.soft(item.decrementButton).toBeVisible();
        await expect.soft(item.incrementButton).toBeVisible();
        await expect.soft(item.quantity).toHaveText('0');
      });
    }
  });
});

test.describe('Menu display resilience', () => {
  let menu: MenuPage;

  test.beforeEach(async ({ page }) => {
    menu = new MenuPage(page);
  });

  test('broken image falls back to the inline placeholder SVG', async () => {
    const entries = buildMenu();
    await menu.mockMenu(entries, { brokenImages: true });
    await menu.goto();

    await expect(menu.itemImages).toHaveCount(entries.length);
    for (const img of await menu.itemImages.all()) {
      await expect(img).toHaveAttribute('src', /^data:image\/svg\+xml;base64,/);
    }
  });

  test('empty menu renders no items', async () => {
    await menu.mockMenu([]);
    await menu.goto();

    await expect(menu.items).toHaveCount(0);
  });

  test('API failure shows "Failed to load menu"', async () => {
    await menu.mockMenuFailure();
    await menu.goto();

    await expect(menu.notification).toHaveText('Failed to load menu');
    await expect(menu.items).toHaveCount(0);
  });

  test('network error shows "Error loading menu"', async () => {
    await menu.mockMenuNetworkError();
    await menu.goto();

    await expect(menu.notification).toHaveText('Error loading menu');
    await expect(menu.items).toHaveCount(0);
  });
});
