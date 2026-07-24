# App Store Connect — Privacy (App Privacy / "Nutrition Label") Answers

**Status: draft, mapped from actual app behavior as verified in source (2026-07-24, v1.0.0 build
1). Flagged items below need a human/legal sign-off before submission — this is a technical
mapping, not a legal certification.**

App Store Connect's App Privacy questionnaire asks what data your app (and any third-party SDKs it
includes) collects, and whether it's linked to identity or used for tracking. Answering this
requires knowing not just what uFlow's own code does, but whether any third-party SDK does anything
beyond what's documented — verified here by checking `package.json` for every installed package.

## Installed packages (full dependency list, for reference)

`@expo/vector-icons`, `@react-native-async-storage/async-storage`, `expo`, `expo-clipboard`,
`expo-constants`, `expo-document-picker`, `expo-file-system`, `expo-font`, `expo-linear-gradient`,
`expo-linking`, `expo-router`, `expo-sharing`, `expo-splash-screen`, `expo-status-bar`,
`expo-symbols`, `expo-web-browser`, `react`, `react-dom`, `react-native`,
`react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`,
`react-native-web`, `react-native-worklets`.

**None of these are analytics, crash-reporting, advertising, or tracking SDKs.** They are Expo/React
Native framework packages and UI libraries only. There is no Firebase, no Sentry, no Amplitude, no
ad network SDK, nothing that phones home.

## Data collected

**uFlow does not collect any data on our end**, because there is no server. Everything below is
data the app *stores*, entirely on-device — App Store Connect's "collected" definition is about data
that leaves the device to reach the developer or a third party, which does not happen here except
in the two explicit, user-initiated cases described in `docs/privacy-policy.md` (backup export,
feedback email) — both of which go to the user's own choice of destination (their share target, or
their own mail app to their own outbox), not to us automatically.

**Suggested App Store Connect answer: "Data Not Collected."**

⚠️ **Flag for confirmation**: Apple's definition of "collection" for this questionnaire is
specifically about data transmitted off the device to you (the developer) or a third party. Because
uFlow's feedback flow opens the user's own mail client addressed to a support inbox *you* control,
there is a reasonable argument that submitting feedback **is** a form of data collection (the user
is voluntarily sending you their platform/version/screen info via email) even though it's not
collected by the app itself. Confirm this interpretation before submitting — if App Store Connect
expects it disclosed, the relevant category is "Contact Info" → none collected automatically, or
possibly "Other Data" → user-submitted diagnostic info, collection method "App Functionality,"
linked to identity "No" (email is voluntary and not tied to any in-app identifier).

## Data linked to identity

**None.** uFlow has no accounts, no user IDs, no device identifiers collected, and nothing that
associates stored data with a real-world identity. If a user emails feedback, their email address
is only visible to whoever receives that email (you) via their own mail client — uFlow itself never
reads, stores, or transmits their email address.

## Tracking

**No tracking.** uFlow does not use IDFA, does not track users across apps or websites, and does
not integrate any advertising or attribution SDK. **App Tracking Transparency (ATT) is not
implicated** — there is no `NSUserTrackingUsageDescription` and no tracking-related package
installed (confirmed: no `expo-tracking-transparency` or similar in `package.json`).

**Suggested answer: "No, we do not use data for tracking purposes."**

## Diagnostics

**None collected by us.** There is no crash-reporting SDK (no Sentry, no Bugsnag, no Firebase
Crashlytics — confirmed absent from `package.json`). Apple's own OS-level crash reporting (which
exists for every app regardless of what the developer does) is outside the developer's control and
not something uFlow adds to.

## User content

uFlow stores user-entered content locally: recipes, Stock/product entries, Grocery items, meal plan
entries, meal history, and free-text fields (e.g. custom meal names, notes). None of this is
collected by the developer — it stays on-device unless the user explicitly exports/shares it. If
Apple's category requires disclosure of *locally stored* user content regardless of collection,
disclose these fields with collection = "not collected" / storage = "on-device only."

## Health and fitness classification concerns

⚠️ **Flag for confirmation.** uFlow lets users record allergies, intolerances, and dietary
preferences, and estimates nutrition (calories/macros) for planned/logged meals. This is adjacent to
Apple's "Health & Fitness" data category even though uFlow does not integrate HealthKit and does not
present itself as a medical or fitness app. Recommended posture:
- Do **not** classify nutrition/allergy data as "Health & Fitness" in the sense of clinical health
  data — it's user-entered dietary preference data for meal planning, not a health record.
- Do make sure the app's marketing copy and in-app language (see `docs/privacy-policy.md`'s "Not
  medical or nutritional advice" section) consistently avoids implying medical/clinical accuracy.
- If Apple's review flags this during submission, be prepared to clarify uFlow is a food-planning
  tool, not a medical or fitness-tracking app, and does not integrate any health platform.
This determination should be confirmed by whoever submits the app, not assumed final from this
document alone.

## Purchases

**None.** uFlow has no in-app purchases, no subscriptions, and no payment processing of any kind.
Nothing in `package.json` relates to StoreKit/in-app purchase.

## Identifiers

**None collected.** No device ID, advertising ID, or vendor ID is read or transmitted anywhere by
uFlow's own code.

## Analytics

**None.** No analytics SDK is installed or used (see the dependency list above). uFlow has no way to
know how many people use it, how often, or how.

## Summary table (draft — confirm before submission)

| Category | Collected? | Linked to identity? | Used for tracking? |
|---|---|---|---|
| Contact info | No | — | — |
| Health & fitness | No (see flag above) | — | — |
| Financial info | No | — | — |
| Location | No | — | — |
| Sensitive info | No | — | — |
| Contacts | No | — | — |
| User content | No (stored on-device only) | — | — |
| Browsing history | No | — | — |
| Search history | No | — | — |
| Identifiers | No | — | — |
| Purchases | No | — | — |
| Usage data | No | — | — |
| Diagnostics | No | — | — |
| Other data | No (see feedback-email flag above) | — | — |

**Everything in this document should be re-confirmed by whoever actually submits the App Store
Connect listing** — this is a good-faith technical mapping from source code, not a substitute for
that person's own read of Apple's current questionnaire wording, which changes over time.
