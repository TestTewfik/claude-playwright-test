# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

This is a **Playwright test suite only**. The system under test — the "Awesome Pizza"
web app — is **not in this repo**. It is served separately at `http://localhost:3000`
and must already be running before any UI or API test can pass; there is no `webServer`
block in the config to start it automatically.

Because the app's source is not here, [TEST-PLAN.md](TEST-PLAN.md) is the authoritative
map of the app's behaviour (pages, `/api` endpoints, order-status lifecycle, credentials)
and the test backlog. Read it before writing or changing tests.

## Commands

```bash
npx playwright test                          # run all tests (headless, all browsers)
npx playwright test tests/ui/menu.spec.ts    # run one file
npx playwright test -g "renders the menu"    # run tests matching a title
npx playwright test --project=chromium       # run one browser only
npx playwright test --ui                     # interactive UI mode
npx playwright test --headed                 # watch the browser
npx playwright show-report                   # open the HTML report after a run
npx playwright codegen http://localhost:3000 # record actions into test code
```

There is no build or lint step, and `package.json` has no `scripts`. TypeScript is
checked by the editor via `tsconfig.json`; `"types": ["node"]` there is what makes
Node globals like `Buffer` resolve — removing it reintroduces a "Cannot find name
'Buffer'" error.

## Architecture & conventions

- **Tests are split by style**: `tests/ui/` drives the browser; `tests/api/` (planned)
  hits `/api` directly via the `request` fixture. `baseURL` is set to
  `http://localhost:3000`, so use relative paths (`page.goto('/')`, `request.get('/api/...')`).

- **Page Object Model** in `tests/pages/`. A spec should go through a page object
  (e.g. `MenuPage`) rather than hold raw selectors inline. `MenuPage` also owns the
  network mocking helpers (`mockMenu`, `mockMenuFailure`, `mockMenuNetworkError`).

- **UI tests mock the backend** with `page.route`, serving synthetic menu data from
  `buildMenu()` that is deliberately unrelated to the real menu. This keeps rendering
  tests stable when real menu content changes; real API responses are covered separately
  by the (planned) `tests/api/` specs. When adding UI tests, prefer mocking the relevant
  `/api` call over depending on live backend state.

- **Locators** are role/label-based (`getByRole`, `getByLabel`) where possible, falling
  back to the app's stable IDs (`#menu-container`, `#place-order-btn`, `#total-items`,
  `#order-id`, etc.).

## TypeScript coding standards

These reflect the conventions already established in `tests/pages/MenuPage.ts` and
`tests/ui/menu.spec.ts`; match them in new files.

**Formatting**: 2-space indent, single quotes, semicolons, trailing commas in
multi-line literals and arguments.

**Page objects** (`tests/pages/`):
- Expose locators as `readonly` properties assigned **once in the constructor**, never
  re-queried inside methods. Use TypeScript parameter properties for injected deps:
  `constructor(readonly page: Page)`, `constructor(readonly root: Locator)`.
- Keep page objects free of assertions — they expose locators and perform actions
  (`async increment()` that `await`s the click); `expect` calls live in the specs.
- Build child locators by scoping to a root (`root.getByRole(...)`, `this.items.filter(...)`),
  not with absolute page-level selectors.

**Naming**: `PascalCase` for classes and exported `type`s, `camelCase` for functions and
methods, `UPPER_SNAKE_CASE` for module-level constants.

**Types & data**: define data shapes as exported `type` aliases (e.g. `MenuEntry`).
Generate test data from factory functions with default parameters (`buildMenu(count = 3)`),
and keep that data synthetic/unrelated to the real app. Give functions that return a value
an explicit return type (`: MenuEntry[]`, `: MenuItem`); let `void` async actions infer.

**Options**: pass optional flags as a single destructured object with defaults —
`async mockMenu(entries, { brokenImages = false } = {})` — rather than positional booleans.

**Comments**: use `/** ... */` on exported helpers and on any constant whose value is
non-obvious, and always explain *why* (e.g. the `MINUS_SIGN` and `TEST_IMAGE` constants).
Use inline `//` for a non-obvious selector or wait strategy.

**Spec structure**: group with `test.describe`, set up with `beforeEach`, and iterate with
`test.step`. Use `expect.soft` when several independent assertions should all be reported in
one run, and `expect.poll` for conditions that settle asynchronously (see the image-load
check in `menu.spec.ts`).

## Gotchas specific to this app

- The menu decrement button uses **U+2212 MINUS SIGN (`−`)**, not an ASCII hyphen. See
  `MINUS_SIGN` in [tests/pages/MenuPage.ts](tests/pages/MenuPage.ts).
- Menu `<img>` tags have an inline `onerror` that swaps `src` to a base64 SVG placeholder.
  To assert the *real* image loaded, poll `img.complete && img.naturalWidth > 0` before
  reading `currentSrc` (the placeholder is otherwise indistinguishable early on).
- Login credentials for the protected area are `user` / `pass`; auth is a token kept in
  `localStorage` under `auth_token`. Protected-page tests can seed that key directly
  instead of logging in through the UI each time.
