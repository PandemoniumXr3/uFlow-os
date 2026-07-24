# uFlow Privacy Policy

**Status: draft, for internal TestFlight beta.** This describes what the app actually does today, as
verified by reading its source code. Replace the placeholders marked below before any public
release, and have this reviewed by someone qualified to confirm it before it's a legal document.

_Last reviewed: 2026-07-24, against uFlow version 1.0.0 (build 1)._

## Summary

uFlow stores everything you enter — your food preferences, Stock, Grocery list, recipes, meal plan,
and meal history — **only on your own device.** There is no account, no server, and no cloud sync.
uFlow does not know who you are and cannot see your data. Nothing you enter is sent anywhere unless
you explicitly choose to export a backup file and share it yourself, or choose to send us feedback.

## What uFlow stores, and where

All of the following is stored locally on your device only, using standard on-device storage
(`AsyncStorage`), never transmitted to us or anyone else automatically:

- **Onboarding and profile state** — when you finished setup, and basic app preferences.
- **Food preferences** — allergies, intolerances, "Safe Meals Only," diet type (e.g. vegetarian,
  vegan), and per-ingredient preferences you set (avoid/dislike/preferred).
- **Dietary settings** — the diet and tolerance choices described above.
- **Products, Stock, and Grocery** — the products you've added, what you have in stock, and your
  Grocery list, including optional prices you choose to enter.
- **Recipes** — recipes you add or edit, and the built-in starter recipe library.
- **Meal plan and meal history** — what you've planned and logged eating.
- **Optional Budget Mode settings** — a weekly budget figure, currency, and preferences, if you turn
  this on.
- **Backup status metadata** — only the *fact* that you last exported/imported (date, schema
  version, warning count) — never a copy of the backup file itself.
- **Dismissal history** — meals you've told uFlow not to suggest again, so suggestions improve over
  time.

uFlow does not ask for your name, email, phone number, location, photos, camera, or contacts, and
does not have the technical ability to request them — none of those permissions exist in the app.

## Does data ever leave your device?

Only in two cases, both of which you control directly:

1. **Backup export.** When you choose "Export data" in Settings, uFlow writes a plain JSON file to
   your device and hands it to the operating system's own share sheet, download mechanism, or
   clipboard — wherever you choose to send or save it from there is up to you. **This file is not
   encrypted.** It is readable plain text, and it can contain your food preferences and meal
   history if you don't choose to exclude them. Treat an exported backup file like you would any
   other personal document — store or share it somewhere private.
2. **Beta feedback.** If you use "Report a bug," "Suggest an improvement," or "General feedback" in
   Settings, uFlow opens your device's own mail app with a prefilled message — you can read, edit,
   or cancel it before sending. That prefilled message includes only: the app version, build
   number, platform, the screen you were on, and (only when reporting from a crash screen) a short
   technical error message. **It never automatically includes your food data, Stock, Grocery,
   recipes, meal history, or your backup file.** Nothing is sent unless you press send yourself.

There is no other network activity. uFlow has no backend server to send data to.

## Analytics and tracking

**uFlow has no analytics system.** There is no event tracking, no crash-reporting SDK, no
advertising SDK, and no third-party tracking of any kind built into the app (verified — no such
package is installed). We do not know how you use uFlow, how often you open it, or anything else
about your usage, because nothing is instrumented to tell us.

## Accounts and cloud sync

**uFlow has no user accounts and no cloud sync.** There is nothing to log into. Your data lives only
on the device it was entered on. If you use uFlow on two devices, they will not automatically share
data — the only way to move data between devices today is to export a backup on one and import it
on the other yourself.

## Backup, import, and deletion

- **Export** creates a local file, as described above.
- **Import** lets you restore or merge a previously exported backup, with a preview and explicit
  confirmation before anything is overwritten — see the in-app Import flow for details.
- **Deleting your data**: Settings has individual "Clear" actions (meal history, Grocery, Stock,
  meal plan) and a "Clear all data" action that removes everything — profile, recipes, products,
  Stock, Grocery, meal plan, history, preferences, onboarding state, and demo metadata — and returns
  the app to its fresh-install state. Because everything is stored only on your device, deleting it
  in-app is a real, complete deletion — there is no copy on a server to also delete, because none
  exists.
- **Uninstalling the app** deletes all of its local data as a normal consequence of how mobile
  operating systems handle app storage.

## Not medical or nutritional advice

uFlow is a personal food-planning tool. Nutrition estimates, "safe meal" filtering based on
allergies/intolerances you enter, and any suggestions it makes are **not medical, dietary, or
nutritional advice**, and uFlow is not a substitute for consulting a doctor, dietitian, or allergist.
Always verify ingredient and allergen information yourself, especially for serious allergies —
uFlow's filtering is a convenience based on the data you provide, not a safety guarantee.

## Children's privacy

uFlow is not directed at children and does not knowingly collect data from children, in the same
sense described above for all users — it doesn't collect anything from anyone, since there is no
server to collect data on.

## Changes to this policy

If uFlow's actual behavior changes (for example, if a future version adds an optional account or
sync feature), this document will be updated to describe that change honestly before it ships.

## Contact

Questions about this policy: **[PLACEHOLDER — support email not yet finalized; see
`constants/support.ts`]**.

## Hosting this document

**[PLACEHOLDER]** — this file needs to be published at a public URL before App Store submission
(App Store Connect requires a privacy policy URL). A simple static page (e.g. GitHub Pages, or any
static host) is sufficient; TestFlight internal beta testing does not require this step.
