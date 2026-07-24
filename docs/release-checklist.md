# uFlow — Release Checklist

Status snapshot as of this milestone. This is a living document — update it as real values (bundle
identifiers, EAS project, support email, store listing) are finalized.

## 1. App identity

| Field | Value |
|---|---|
| App name | uFlow |
| Slug | `uflow` |
| Scheme | `uflow` |
| iOS bundle identifier | `com.mikeramirez.uflow` |
| Android package | `com.mikeramirez.uflow` |
| Version | `1.0.0` |
| iOS build number | `1` |
| Android versionCode | `1` |

**Why `com.mikeramirez.uflow`:** the repository establishes no existing company or domain, and the
git author on this project is Mike Ramirez, so a personal reverse-domain identifier was used rather
than inventing a company domain that would misrepresent legal ownership. If a real company or
domain is registered later, both `ios.bundleIdentifier` and `android.package` in `app.json` can be
changed **before the first real store submission** — changing either after release requires
publishing as a new app.

**Versioning going forward:** `eas.json` sets `"appVersionSource": "remote"`, so EAS (not the
committed `app.json`) tracks the authoritative build number/version code once you've run
`eas build:configure` and made at least one build. The `production` profile also sets
`"autoIncrement": true`, so each production build bumps the build number automatically — you should
not need to hand-edit `buildNumber`/`versionCode` for routine releases. Bump `version` in `app.json`
manually only for an actual version change (e.g. `1.0.0` → `1.1.0`).

## 2. Icon and splash asset audit

**Found and fixed two broken assets** (not a design change — both were literally unusable exports):

- `assets/images/icon.png` — the committed file was a design-tool export with the artboard's guide
  circles, crosshairs, and center-point marker still baked into the image. Replaced with a clean
  1024×1024, colorType 2 (RGB, **no alpha channel** — confirmed by parsing the PNG header directly,
  not just visually), generated from the existing clean brand mark
  (`assets/images/android-icon-foreground.png`, verified clean) composited onto the same light-blue
  background already used for the Android adaptive icon (`#E6F4FE`).
- `assets/images/splash-icon.png` — the committed file was an empty bullseye/grid placeholder with
  no brand mark at all. Replaced with the same brand mark on a transparent background (1024×1024,
  colorType 6/RGBA), which composites correctly over `app.json`'s configured splash
  `backgroundColor` (`#10141B`, dark charcoal) at render time — matches uFlow's existing dark,
  no-flash startup (no light/system-theme splash is used; `userInterfaceStyle` is fixed to `dark`
  app-wide, so there's no light/dark flash to guard against).
- `assets/images/android-icon-background.png` — also had the guide-circle artifact baked in, and was
  redundant with `adaptiveIcon.backgroundColor` (`#E6F4FE`) already set in `app.json`. Removed the
  file and the `backgroundImage` reference entirely rather than regenerating it — Android's adaptive
  icon system uses the solid `backgroundColor` on its own with no image needed.
- `assets/images/android-icon-foreground.png` and `assets/images/android-icon-monochrome.png` were
  already clean, correct exports — untouched.
- `assets/images/favicon.png` (48×48, web only) was already clean — untouched.

**These are release-candidate assets, not final marketing-approved artwork.** They reuse uFlow's
existing brand mark exactly as already exported elsewhere in the repo — nothing was redesigned —
but no designer has signed off on this specific 1024×1024 icon composition or the splash treatment
for final store submission. Regenerate from real design source files before a public (non-beta)
release if a designer produces one.

The generator script used is committed at `scripts/build-release-icons.js` (uses `pngjs`, already a
transitive dependency — no new package added) so the same fix can be re-run if the source brand mark
changes.

**Readable at small size / no illegible text:** the mark is a single bold chevron shape with no
text at all, so there's no small-size legibility risk from typography.

## 3. EAS build profiles (`eas.json`)

Three profiles, as required:

- **development** — `developmentClient: true`, internal distribution, `APP_ENV=development`. For
  installing a dev-client build during active development.
- **preview** — internal distribution, release-like native settings (no dev client), `APP_ENV=preview`.
  This is the profile to use for the first internal TestFlight build and general device QA.
- **production** — store distribution, `autoIncrement: true`, `APP_ENV=production`. Use this once
  preview has been verified on a real device and you're ready for a real App Store Connect build.

`APP_ENV` is currently declared but **not read anywhere in application code** — it's reserved for
future environment-specific behavior (e.g. pointing at a staging vs. production API, if one is ever
added). Nothing in uFlow today needs it since the app has no backend.

**Not configured, intentionally:** EAS Update `channel` fields. `expo-updates` is not installed, so
uFlow has no over-the-air update mechanism — every build is a full binary. Adding channels without
`expo-updates` would silently do nothing and imply update behavior that doesn't exist, so they were
left out rather than added as inert config.

## 4. Manual actions still required (cannot be done from this environment)

These need a human with the right accounts — nothing here can be scripted without live
authentication:

1. **Expo account / EAS project.** Not logged in to Expo in this environment (`npx expo whoami` →
   "Not logged in"). Run `eas login`, then `eas build:configure` — this will add an `extra.eas.projectId`
   to `app.json` and may also want an `owner` field. Do this once, from a machine where you can log in.
2. **Apple Developer Program membership** (paid, $99/year) — required before any iOS build can be
   code-signed or uploaded to TestFlight. Confirm this is active before running an iOS build.
3. **App Store Connect app record** — create the app entry (bundle ID `com.mikeramirez.uflow`) in App
   Store Connect before the first TestFlight upload; EAS submit needs this to exist.
4. **Real support email**, to replace the placeholder in `constants/support.ts`
   (`uflow-support@example.com`, on the reserved `example.com` documentation domain — guaranteed not
   to be a real, reachable inbox).
5. **Hosted privacy policy URL and support URL** for App Store Connect's required fields — see
   `docs/app-store-metadata.md` for exactly where these plug in. `docs/privacy-policy.md` and
   `docs/support.md` in this repo are the source content; they need to be published somewhere
   public (a simple static page is enough) before submission — TestFlight internal beta testing
   does not require this, but App Store review does.
6. **A designer's sign-off on icon/splash artwork** (see section 2) before any non-beta public
   release, if the release-candidate assets generated here aren't considered final.

## 5. Production seeding audit

What a brand-new production install actually receives, and why — audited by reading every
`__DEV__`/`seedIfEmpty` call site in the codebase (not assumed):

| Data | Seeds in production? | What / why |
|---|---|---|
| Product catalog (`constants/productSeed.ts`, ~70 common grocery items) | **Yes, always** | Seeded once when the Products list is empty (`hooks/useProducts.ts`), regardless of `__DEV__`. The file's own header comment states the intent: "Standard starter database so new users don't begin with an empty list... a reasonable default, not a fixed catalog." Every item can be removed or favorited freely. Treated as legitimate shipped content, not test data — an empty ingredient-name catalog would break autocomplete/matching across Stock, Recipes, and Grocery on first launch. |
| Recipe catalog (`constants/mealSeed.ts`, 131 recipes) | **Yes, always** | Same pattern (`hooks/useRecipes.ts`), same stated intent in the file's own header comment ("Starter meal database... so new users have something to work with before adding their own"). **Flagging this explicitly for confirmation**: unlike the product catalog, shipping 131 full recipes is a bigger content decision than a name list, and the milestone spec that produced this audit only explicitly pre-approved "the normal Product catalog." If this is not the intended production behavior, the fix is a one-line change in `hooks/useRecipes.ts` (gate the `MEAL_SEED` fallback behind `__DEV__`, same as the diet/safe-meals seeds below) — not done here without confirmation, since it would remove real shipped content sight-unseen. |
| "Always in stock" defaults (`constants/alwaysInStockSeed.ts` — common pantry staples like salt, pepper, oil) | **Yes, always** | Seeded once per product (`hooks/useProductPreferences.ts`) only for products that already exist in the (also-seeded) product catalog. Pantry-convenience default with no dietary or safety implication — does not touch allergies, diet, or Safe Meals. |
| Vegetarian diet profile (`hooks/useDiet.ts`, `DEV_PROFILE_DIET_SEED`) | **No** | Explicitly gated: `__DEV__ ? seedIfEmpty(...) : dietStorageService.get()`. A production build (`__DEV__` is `false` in any real EAS/App Store build) never seeds this — a new user's diet profile starts genuinely empty. Confirmed by reading the file; comment above the constant states this directly. |
| Safe Meals seed (`hooks/useSafeMeals.ts`, `DEFAULT_SAFE_MEAL_IDS`) | **No** | Same pattern: `if (stored.recipeIds.length > 0 \|\| !__DEV__)` skips the dev seed entirely outside development. A production user's Safe Meals list starts empty until they choose meals themselves. |
| Demo data (Stock items, a planned meal, Grocery items — `services/onboarding/demoDataService.ts`) | **No, never automatic** | Grepped every call site of `demoData.install()` / `installDemoData()`: Settings' "Install demo data" button, onboarding's explicit "demo" path (only reached if the user picks that option), and Today's "Use demo setup" button. All three are direct user button presses — nothing calls `.install()` from a mount effect or on any automatic condition. |
| Console logging | **No stray logs** | Grepped the whole source tree for `console.log`/`console.warn`/`console.debug` — zero matches outside `node_modules`. The one `console.error` in the codebase (`services/backup/performImport.ts`) is itself gated behind `__DEV__`. |
| Debug controls / test URLs | **None found** | No hardcoded `localhost`/`127.0.0.1`/`http://` URLs, no API keys, tokens, or hardcoded credentials anywhere in source (see the secrets audit below). |

**Net effect:** a fresh production install gets a starter product catalog, a starter recipe library,
and sensible pantry-staple defaults — all disclosed above — but never a pre-set diet, never
pre-populated Safe Meals, and never demo data, without the user explicitly choosing any of it.

## 6. Secrets and environment audit

Ran the requested search:

```bash
grep -RInE "API_KEY|SECRET|TOKEN|PASSWORD|SUPABASE|SENTRY|http://|localhost|127\.0\.0\.1" \
  --exclude-dir=node_modules --exclude-dir=.git .
```

**Zero matches** outside `node_modules`/`package-lock.json`. Also checked for hardcoded emails,
phone numbers, and test-account patterns — none found. No `.env` file exists in the repo. There is
no backend, no API key, and nothing to leak — uFlow is entirely local-storage-backed today.

## 7. Permissions audit

Every native permission the app could plausibly request, checked against what's actually installed:

| Capability | Installed? | iOS Info.plist entry needed? | Notes |
|---|---|---|---|
| Document picker (import) | Yes (`expo-document-picker`) | No | Uses `UIDocumentPickerViewController`, which needs no usage-description string. Its config plugin only touches iCloud entitlements, and only if `ios.usesIcloudStorage` is set (it isn't) — effectively a no-op for this app, correctly left out of `app.json`'s `plugins` array. |
| File sharing (export) | Yes (`expo-sharing`) | No | Uses the system share sheet; no permission dialog. |
| Local cache file read/write (export/import staging) | Yes (`expo-file-system`, new `File`/`Paths` API) | No | Only ever touches the app's own sandboxed cache directory (`Paths.cache`) — never broad device storage. Its plugin was deliberately **not** added to `app.json`: on Android, that plugin injects `READ_EXTERNAL_STORAGE`/`WRITE_EXTERNAL_STORAGE`/`INTERNET` permissions the app doesn't need for cache-only access, and on iOS it's a no-op without explicit options. Leaving it out is the more correct, minimal-permission choice, not an oversight. |
| Clipboard (feedback/export fallback) | Yes (`expo-clipboard`) | No | No permission model on either platform. |
| Push notifications | **Not installed** | — | Out of scope for this milestone per explicit instruction; confirmed no `expo-notifications` dependency exists. |
| Camera / Photo library / Location / Microphone / Tracking (ATT) | **Not installed** | — | No package for any of these exists in `package.json`. Nothing requests them. |

**Result:** uFlow's iOS `Info.plist` needs **zero** custom usage-description strings for anything
currently in the app. No unused permissions or libraries were found to remove — the existing set is
already minimal.

## 8. Production-safe error handling

`app/_layout.tsx` previously re-exported `expo-router`'s built-in `ErrorBoundary`, which
unconditionally renders `Error: ${error.message}` on screen — a real message-leak in a production
build (confirmed by reading `node_modules/expo-router/build/views/ErrorBoundary.js` directly, not
assumed). Replaced with `components/ui/AppErrorBoundary.tsx`:

- Shows "Something went wrong" plus a plain-language reassurance that local data is safe.
- Raw `error.message` is only ever rendered inside an `if (__DEV__)` block — never in production.
- "Try again" calls expo-router's own `retry()` (re-renders the failed route).
- "Report problem" opens the same feedback flow as Settings (see below), prefilled with app
  version/build/platform/route **and** the error message (useful for debugging; still requires the
  user to review and send it themselves — nothing is sent automatically).
- Does not depend on `ProfileContext`/`UndoContext` — it can render standalone if the crash happened
  inside one of those providers.

**Redirect-loop audit:** the only automatic (non-user-triggered) navigation anywhere in the app is
the single `<Redirect href="/onboarding">` in `app/_layout.tsx`'s `RootNavigator`, which is guarded
by `pathname !== '/onboarding'` — it cannot re-fire once already on that route. Every other
`router.replace()`/`router.push()` call in the codebase is inside a button's `onPress`, not an
effect, so none of them can loop on their own.

## 9. Build-time check results

Run from this environment on 2026-07-24:

- `npx tsc --noEmit` — clean, no errors.
- `npx vitest run` — 66 test files, 420 tests, all passing.
- `npx expo-doctor` — initially **19/20 checks passed**, one failure: 10 packages (Expo SDK 57
  sub-packages plus `react-native-screens`) were on slightly older patch/minor versions than SDK 57
  expects. Fixed with `npx expo install --fix` (a same-SDK-line patch bump, not a breaking
  upgrade) — re-ran and got **20/20, no issues detected**. This also auto-registered
  `expo-status-bar` and `expo-web-browser` as config plugins in `app.json`, which `expo install`
  determined they now need.
- `npm audit` — 12 moderate-severity findings, all the same root cause: a `uuid@<11.1.1` bounds-check
  advisory pulled in transitively through `@expo/config-plugins`/`xcode`, which are **build-time-only
  tooling** used by the Expo CLI during native builds — not code that ships in the app bundle users
  install. The suggested fix (`npm audit fix --force`) would force-downgrade `expo-sharing` to
  `14.0.8`, incompatible with the installed Expo SDK 57 — a real breaking change for no runtime
  security benefit. Left as-is and documented here rather than blindly applied; safe to defer.
- `npx expo export --platform web` — succeeded. 23 static routes exported, ~2.9MB JS bundle.
- `npx expo export --platform ios` — succeeded. iOS Hermes bytecode bundle (~4.5MB) exported with
  all fonts/assets.
- `npx expo export --platform android` — succeeded. Android Hermes bytecode bundle (~4.6MB)
  exported with all fonts/assets.
- `git diff --check` — no whitespace errors (only expected LF→CRLF line-ending notices, this
  repo's existing convention).
- `npx eas-cli build:configure` and `npx eas-cli build --platform ios --profile preview` — both
  **stopped at the same authentication boundary**: "An Expo user account is required to proceed."
  Every step above this line was completed; nothing further can happen here without a human running
  `eas login` first. See section 4 and the milestone report for the exact next command.

## 10. Physical-device test status

**No physical-device testing has been performed as part of this milestone.** Everything above was
verified by reading source, running local build tooling, and (where noted) the in-app browser
preview — never a real iPhone. See `docs/physical-device-checklist.md` for the exact checklist to
run before considering this release-ready, and do not mark any row there as passed without actually
doing it on real hardware.
