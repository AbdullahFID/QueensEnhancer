# Queen’s Housing — Premium View (QHX)

A Chrome/Edge/Brave extension that replaces the Queen’s Housing portal homepage with a fast, accessible “premium view.” See your room info, meal plan, Flex/Tri-Colour balances, quick actions, and an add-funds UI with confirmations—all without digging through the legacy UI.

> **Not affiliated with Queen’s University.** This is a personal enhancement layer

---

## Features

* **Modern dashboard UI**

  * Room, meal plan, Flex \$ and Tri-Colour \$ at a glance
  * Helpful resources & quick actions (Move-In, ResNet, Proof of Address, etc.)
  * Live chat launcher (embeds when allowed, graceful popup fallback)

* **Add funds (Flex/Tri-Colour)**

  * Toggle between Flex \$ and Tri-Colour \$
  * Live bonus preview for Flex (5% @ \$50, 10% @ \$100)\*
  * “Are you sure?” confirmation before handing off to the native checkout
  * Syncs selection/amount into native form and calls portal’s own `checkout()`
  * Guards: disables Tri-Colour if not available; disables Student Account purchase for staff

* **Meal plan newsletter sync**

  * Nice checkbox in our UI that mirrors the native portal checkbox
  * Persists locally and saves to the server via JSONP (with fetch fallback)

* **Room map**

  * Google Maps embed for your residence coordinates (lat/lon from the portal)

* **Quality of life**

  * Copy/share email and copy student ID/phone with one click
  * `aria-live` updates for values; reduced-motion friendly
  * Hotkey toggle: **Ctrl/⌘ + Shift + Q**

\* Bonus preview is advisory and can be tuned to match official rules.

---

## Installation (Dev)

1. **Clone** this repo.
2. Open **Chrome** → `chrome://extensions` → toggle **Developer mode**.
3. Click **Load unpacked** → select the extension folder (the one with `manifest.json`).
4. Visit the Queen’s Housing portal homepage and enjoy the premium view.

> For Edge/Brave, use their equivalent “Load unpacked” flow. Firefox support requires a Manifest v2/Gecko variant.

---

## Permissions

* `storage` — save user preferences (toggle, newsletter, etc.)
* `activeTab` (or host permissions for `https://studentweb.housing.queensu.ca/*`)
* Optional external loads used by features:

  * LiveChat: `https://cdn.livechatinc.com/*`, `https://secure.livechatinc.com/*`
  * Google Maps embed: `https://www.google.com/maps*`

---

## Privacy

* No analytics.
* No data leaves your browser except:

  * Portal requests you would perform anyway (newsletter save, checkout via native form)
  * LiveChat (if you open it)
  * Google Maps embed (if your room has coordinates)
* Preferences (e.g., newsletter checkbox, premium toggle) are stored **locally**.

---

## Development notes

* Overlay class: `body.qhx-overlay-active` hides the legacy DOM to reduce clutter.
  If the portal opens an in-page checkout modal, we temporarily remove this class before calling `checkout()` to ensure visibility.
* Escaping: all user-visible text is escaped; quotes included.
* Accessibility: dynamic values have `aria-live="polite"`.

---

## Disclaimer

This project is an **unofficial** user-experience enhancement. All trademarks and copyrights belong to their respective owners. Use at your own discretion.

---

## License

MIT (see `LICENSE`).