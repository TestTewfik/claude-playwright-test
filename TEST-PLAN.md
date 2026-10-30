# Awesome Pizza — Test Plan

Target: `http://localhost:3000/`

A static frontend (`index.html`, `login.html`, `protected.html`) backed by a JSON
API under `/api`. This plan covers UI end-to-end flows and the API endpoints that
back them. UI tests use the Page Object Model (`tests/pages/`). Progress is tracked
with the checkboxes below.

---

## 1. Application map

### Pages
| Page | Purpose |
|------|---------|
| `/` (`index.html`) | Menu browsing, cart, place order, order lookup/management, theme toggle, link to login |
| `/login.html` | Staff login (username/password) |
| `/protected.html` | Staff-only area; requires a token in `localStorage` |

### API endpoints
| Method | Path | Behaviour |
|--------|------|-----------|
| `GET`  | `/api/daily-menu` | Returns 5 pizzas (`name`, `description`, `imageUrl`) |
| `POST` | `/api/orders` | Creates an order from `{ sender, contents[] }`; returns `id` + `status: RECEIVED` |
| `GET`  | `/api/orders/:id` | Returns order, or `404` + `success:false` if unknown |
| `PUT`  | `/api/orders/:id` | Updates `{ status }` |
| `POST` | `/api/login` | `user`/`pass` → `{ success:true, token }`; else `{ success:false }` |
| `GET`  | `/api/protected` | Requires `Authorization: Bearer <token>`; `401` if missing/invalid |

### Known data / rules
- Menu has **5 items**: Margherita Pizza, Pepperoni Pizza, Quattro Stagioni, Vegetarian Delight, BBQ Chicken Pizza.
- Valid credentials: **`user` / `pass`**.
- Order status lifecycle: `RECEIVED` → `DELIVERING` → `DELIVERED`, or `RECEIVED` → `CANCELED`.
- `POST /api/orders` rejects empty `sender` with `400` + "sender is required".
- Order ID format: `order-<timestamp>-<n>`.

---

## 2. UI test scenarios

### 2.1 Menu display (`/`)
- [x] Menu renders exactly 5 items on load.
- [x] Each item shows name, description, image, and +/− quantity controls.
- [x] Item names match the expected menu list.
- [x] (Resilience) Broken image falls back to the inline placeholder SVG.
- [x] (Resilience) Empty menu renders no items.
- [x] (Resilience) API `success:false` → "Failed to load menu"; network error → "Error loading menu".
- Note: UI menu tests mock `/api/daily-menu` with synthetic data (`buildMenu()`) and serve their own images, so menu content changes never break them; real menu data is asserted in §3.1 (shape and count, not exact text).

### 2.2 Cart & quantity
- [ ] Cart starts empty ("Your cart is empty", total items = 0).
- [ ] `+` adds an item; quantity display and cart total update.
- [ ] `−` decrements; dropping to 0 removes the item from the cart.
- [ ] "Remove" button clears that item entirely.
- [ ] Total-items count reflects the sum across multiple different pizzas.

### 2.3 Place Order button state
- [ ] Button is **disabled** on load.
- [ ] Disabled with items but no name.
- [ ] Disabled with a name but no items.
- [ ] Enabled only when name is non-empty **and** cart has ≥1 item.
- [ ] Whitespace-only name keeps it disabled (name is trimmed).

### 2.4 Place order flow (happy path)
- [ ] Add items + enter name → place order.
- [ ] Success notification appears containing the new Order ID.
- [ ] Cart and name field are cleared; button returns to disabled.
- [ ] Order details panel shows ID, customer, status `RECEIVED`, and ordered items.
- [ ] Order ID field is pre-filled with the new ID.

### 2.5 Order lookup / management
- [ ] Look up a valid ID → details display, "Order found" notification.
- [ ] Look up an unknown ID → "Order not found", details panel hidden.
- [ ] Empty ID → "Please enter an order ID" notification.
- [ ] Enter key in the ID field triggers lookup (same as clicking).
- [ ] `RECEIVED` order shows "Mark as Delivering" and "Cancel Order" buttons.
- [ ] "Mark as Delivering" → status badge becomes `DELIVERING`; "Mark as Delivered" button appears.
- [ ] "Mark as Delivered" → status badge becomes `DELIVERED`; no further action buttons.
- [ ] "Cancel Order" on a `RECEIVED` order → status becomes `CANCELED`.

### 2.6 Theme toggle
- [ ] Default is light; toggle switches to dark (`data-theme="dark"`, icon ☀️).
- [ ] Preference persists across reload via `localStorage`.
- [ ] Toggle back to light persists as light.

### 2.7 Authentication (`/login.html`, `/protected.html`)
- [ ] Login page renders username/password fields and Login button.
- [ ] Valid `user`/`pass` → token stored, redirect to `/protected.html`.
- [ ] Invalid credentials → "Invalid username or password" error, no redirect.
- [ ] Enter key in password field submits login.
- [ ] Visiting login while already authenticated redirects straight to protected page.
- [ ] `/protected.html` with **no token** → shows "This page is only visible to logged-in users" message, no secret data.
- [ ] `/protected.html` with a **valid token** → shows secret recipes, staff discount, VIP code, delivery note; Logout button visible.
- [ ] `/protected.html` with an **invalid token** (API returns 401) → token cleared, redirect to login.
- [ ] Logout → token removed, redirect to login; protected page no longer accessible.

---

## 3. API test scenarios (request-level)

### 3.1 `GET /api/daily-menu`
- [ ] `200`, `success:true`, `data` has 5 items each with `name`/`description`/`imageUrl`.

### 3.2 `POST /api/orders`
- [ ] Valid payload → `200`, `success:true`, returns `id` and `status:RECEIVED`.
- [ ] Empty/missing `sender` → `400`, `success:false`, "sender is required".
- [ ] Empty `contents` → error (verify exact behaviour).
- [ ] Returned contents match what was submitted.

### 3.3 `GET /api/orders/:id`
- [ ] Existing ID → `200`, `success:true`, correct order.
- [ ] Unknown ID → `404`, `success:false`, "not found" message.

### 3.4 `PUT /api/orders/:id`
- [ ] Valid status transition → `200`, `success:true`, updated status returned.
- [ ] Update on unknown ID → error (verify status/shape).
- [ ] (Optional) Invalid status value → verify behaviour.

### 3.5 `POST /api/login`
- [ ] `user`/`pass` → `success:true` with a token.
- [ ] Wrong credentials → `success:false`, "Invalid credentials".

### 3.6 `GET /api/protected`
- [ ] With valid `Bearer` token → `200` with secret data.
- [ ] Without token / invalid token → `401`.

---

## 4. File plan

```
CLAUDE-PIZZA-TEST/
├── playwright.config.ts          # baseURL set ✅; (optionally) add webServer
├── tests/
│   ├── pages/                        # Page Object Model — one class per page/area
│   │   ├── MenuPage.ts               # ✅ MenuPage + MenuItem (name, image, +/−, quantity), buildMenu() + API mocks
│   │   ├── CartPage.ts               # cart items, Remove, total items, customer name, Place Order
│   │   ├── OrderManagementPage.ts    # order ID lookup, details panel, status badge, action buttons
│   │   ├── HeaderPage.ts             # theme toggle, login link
│   │   ├── LoginPage.ts              # username/password, Login, error message
│   │   └── ProtectedPage.ts          # secret data, gating message, Logout
│   │
│   ├── ui/
│   │   ├── menu.spec.ts              # ✅ §2.1 menu renders 5 items, fields, image fallback
│   │   ├── cart.spec.ts              # §2.2 add/decrement/remove, totals
│   │   ├── place-order.spec.ts       # §2.3 button state + §2.4 happy-path order
│   │   ├── order-management.spec.ts  # §2.5 lookup + status transitions
│   │   ├── theme.spec.ts             # §2.6 dark/light toggle + persistence
│   │   └── auth.spec.ts              # §2.7 login/logout/protected-page gating
│   │
│   ├── api/
│   │   ├── menu.spec.ts              # §3.1 GET /api/daily-menu
│   │   ├── orders.spec.ts            # §3.2–3.4 POST/GET/PUT /api/orders
│   │   └── auth.spec.ts              # §3.5–3.6 POST /api/login, GET /api/protected
│   │
│   ├── fixtures/
│   │   ├── test-options.ts           # extended `test` with custom fixtures
│   │   └── auth.storage.ts           # seeds localStorage auth_token (skip UI login)
│   │
│   └── helpers/
│       ├── api.ts                    # createOrder(), getToken() — seed data via API
│       └── data.ts                   # constants: creds, statuses, routes
└── TEST-PLAN.md
```

Rationale:
- **`ui/` vs `api/`** mirrors the two test styles (browser-driven e2e vs. `request`-fixture calls) and matches the §2/§3 split.
- **One spec per feature area**, not per assertion, so files stay readable (~3–8 tests each) and a failure points to a clear area.
- **`pages/` (Page Object Model)** owns every locator and UI action, so specs read as intent (`menu.item('Pepperoni Pizza').increment()`) and a markup change is fixed in one place. This replaces a separate `selectors.ts` map. Page objects expose `Locator`s and actions; assertions stay in the specs. Test data tied to a page (e.g. `buildMenu()`) lives with its page object.
- **`helpers/api.ts`** lets UI tests seed an order or grab a token through the API instead of clicking the whole flow every time.
- **`fixtures/auth.storage.ts`** injects `auth_token` into `localStorage` so protected-page tests skip UI login; the login flow itself is still tested once in `ui/auth.spec.ts`.
- **`helpers/data.ts`** keeps cross-cutting magic values (`user`/`pass`, statuses, API paths) in one place.
- **Lighter alternative:** for a small course project, drop `fixtures/` + `helpers/` and keep just `pages/` + the `ui/` + `api/` specs with inline constants.

Conventions:
- `use.baseURL = 'http://localhost:3000'` is set in `playwright.config.ts`, so tests use `page.goto('/')` and `request.get('/api/...')`.
- UI specs never use raw selectors — go through a page object; add a locator/method to the page class when one is missing.
- Add a `webServer` entry in the config to auto-start the backend before tests (if a start command exists).
- Prefer role/label-based locators (`getByRole`, `getByLabel`) over CSS where possible; stable IDs already exist (`#place-order-btn`, `#total-items`, `#order-id`, etc.) for the rest.
- Use the API (`request` fixture) to seed orders for lookup/management UI tests rather than always going through the full UI — faster and less flaky.
- Seed auth state by setting `localStorage.auth_token` (via `page.addInitScript` or a storage-state fixture) instead of logging in through the UI in every protected-page test.
- Reset `localStorage` (theme + token) between tests to keep them independent.

---

## 5. Open questions / to confirm when writing tests
- Is order storage in-memory (reset on server restart) or persisted? Affects test isolation.
- Exact behaviour of `POST /api/orders` with empty `contents` and of `PUT` with an invalid status.
- Is there a command to start the backend server (for a `webServer` config block)?
