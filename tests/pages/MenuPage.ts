import { Locator, Page } from '@playwright/test';

export type MenuEntry = { name: string; description: string; imageUrl: string };

/** URL prefix for mocked menu images; the test serves these itself, so no real asset is needed. */
const TEST_IMAGE_PATH = 'test-images';

/** A valid 1×1 PNG, served for every mocked menu image. */
const TEST_IMAGE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

/**
 * Build synthetic menu entries to mock `/api/daily-menu` with. Deliberately unrelated to the
 * real menu, so UI tests never break when the menu content changes.
 */
export function buildMenu(count = 3): MenuEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `Test Pizza ${i + 1}`,
    description: `Description of test pizza ${i + 1}`,
    imageUrl: `${TEST_IMAGE_PATH}/pizza-${i + 1}.png`,
  }));
}

/** The app's decrement button uses U+2212 MINUS SIGN, not a hyphen-minus. */
const MINUS_SIGN = '−';

export class MenuItem {
  readonly name: Locator;
  readonly description: Locator;
  readonly image: Locator;
  readonly decrementButton: Locator;
  readonly incrementButton: Locator;
  readonly quantity: Locator;

  constructor(readonly root: Locator) {
    this.name = root.getByRole('heading', { level: 3 });
    // The description is the paragraph directly under the name.P
    this.description = root.locator('h3 + p');
    this.image = root.getByRole('img');
    this.decrementButton = root.getByRole('button', { name: MINUS_SIGN, exact: true });
    this.incrementButton = root.getByRole('button', { name: '+', exact: true });
    this.quantity = root.locator('.quantity-display');
  }

  async increment() {
    await this.incrementButton.click();
  }

  async decrement() {
    await this.decrementButton.click();
  }
}

export class MenuPage {
  readonly container: Locator;
  readonly items: Locator;
  readonly itemNames: Locator;
  readonly itemImages: Locator;
  readonly notification: Locator;

  constructor(readonly page: Page) {
    this.container = page.locator('#menu-container');
    this.items = this.container.locator('.menu-item');
    this.itemNames = this.items.getByRole('heading', { level: 3 });
    this.itemImages = this.items.getByRole('img');
    this.notification = page.locator('#notification');
  }

  async goto() {
    await this.page.goto('/');
  }

  /**
   * Serve `entries` from `/api/daily-menu` instead of the real backend data, along with
   * their images. Pass `brokenImages` to make every image request 404 instead.
   */
  async mockMenu(entries: MenuEntry[], { brokenImages = false } = {}) {
    await this.page.route('**/api/daily-menu', route =>
      route.fulfill({ json: { success: true, data: entries } }),
    );
    await this.page.route(`**/${TEST_IMAGE_PATH}/**`, route =>
      brokenImages
        ? route.fulfill({ status: 404 })
        : route.fulfill({ contentType: 'image/png', body: TEST_IMAGE }),
    );
  }

  /** Make `/api/daily-menu` answer with `success: false`. */
  async mockMenuFailure() {
    await this.page.route('**/api/daily-menu', route =>
      route.fulfill({ json: { success: false, message: 'Menu unavailable' } }),
    );
  }

  /** Make the `/api/daily-menu` request fail at the network level. */
  async mockMenuNetworkError() {
    await this.page.route('**/api/daily-menu', route => route.abort());
  }

  item(name: string): MenuItem {
    return new MenuItem(this.items.filter({ has: this.page.getByRole('heading', { name, exact: true }) }));
  }
}
