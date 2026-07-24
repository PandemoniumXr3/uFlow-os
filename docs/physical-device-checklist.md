# uFlow — Physical-Device Test Checklist

**None of the rows below have been tested yet.** Everything in this milestone was verified by
reading source, running local build tooling (`tsc`, `vitest`, `expo-doctor`, `expo export`), and the
in-app browser preview — never a real iPhone. Do not check a row off unless you actually did it on
real hardware; a browser preview or simulator is not a substitute for the rows that specifically
depend on real device behavior (native pickers, share sheet, VoiceOver, real network toggling, real
memory pressure).

Recommended device(s): at least one recent iPhone, ideally also one older/smaller-screen iPhone if
available (see the earlier onboarding/recipe milestones' viewport work for the screen sizes already
covered in the browser — 375×667 through 430×932 — a real device confirms those hold up outside a
simulator too).

## Checklist

- [ ] **Cold start** — force-quit the app, relaunch, confirm it opens to the expected screen
      (Today, or onboarding if not yet completed) without a blank screen or crash.
- [ ] **Restart** — restart the phone itself, then open the app; confirm data and onboarding state
      persisted.
- [ ] **Onboarding persistence** — complete onboarding, force-quit, relaunch; confirm it does not
      re-show onboarding.
- [ ] **Safe areas** — check the notch/Dynamic Island and home indicator areas on Today, Settings,
      and the Import screen; nothing should be clipped or overlapped.
- [ ] **Keyboard behavior** — open a text field (e.g. Grocery item name, Budget weekly amount);
      confirm the keyboard doesn't cover the field or its confirm button, and dismisses correctly.
- [ ] **Scrolling** — scroll through a long list (Recipes, a long Grocery list, Settings) and
      confirm smooth, correct scrolling with no visual glitches.
- [ ] **Native file picker** — Settings → Import data → Choose file; confirm the real iOS document
      picker opens (not a browser-only fallback) and can select a `.json` file.
- [ ] **Native share sheet** — Settings → Export data; confirm the real iOS share sheet opens with
      the backup file attached.
- [ ] **Email feedback** — Settings → Beta feedback → any category; confirm Mail (or your configured
      mail app) opens with the prefilled subject/body.
- [ ] **Dark mode** — uFlow is dark-only by design (`userInterfaceStyle: "dark"`); confirm it stays
      dark regardless of the system-wide iOS appearance setting, and nothing flashes light/white
      during launch.
- [ ] **Light mode** — same check, with the system set to Light — confirm uFlow still renders in
      its own dark theme (this is intentional; flag it as a bug only if something *unintentionally*
      renders light/washed out).
- [ ] **Larger text (Dynamic Type)** — increase the system text size in Settings → Accessibility →
      Display & Text Size; confirm uFlow's text scales without breaking layout badly (some
      reflow/wrapping is fine; text or buttons becoming unreadable/unusable is not).
- [ ] **VoiceOver** — turn on VoiceOver and navigate Settings, the Import flow, and one destructive
      action's confirm dialog; confirm every control has a sensible spoken label and destructive
      actions are announced clearly.
- [ ] **Offline mode** — turn off Wi-Fi and cellular data entirely; confirm the app still opens and
      all core features (Stock, Recipes, Grocery, Meal Plan, export, import) work fully offline.
- [ ] **Airplane mode** — same check via Airplane Mode specifically (covers both radios at once).
- [ ] **Backup export** — export a real backup on-device; confirm the file is valid JSON and
      contains the expected data (open it in the Files app or a text viewer).
- [ ] **Backup import** — import the file from the previous step; confirm the preview, merge/replace
      choice, and final result all work as expected on-device.
- [ ] **App background/foreground** — background the app mid-task (e.g. mid-import, or with a
      Grocery item half-typed), then foreground it again; confirm no crash and no data loss.
- [ ] **Low-memory restart** — use several other memory-heavy apps to encourage iOS to purge uFlow
      from memory, then switch back to it; confirm it either resumes cleanly or does a clean cold
      start (not a broken/blank state).
- [ ] **Update from one build to the next** — install an older build via TestFlight, enter some
      data, then install a newer build over it (TestFlight's normal update flow); confirm existing
      data survives the update.
- [ ] **Clear All → onboarding** — Settings → Clear all data → confirm it routes to onboarding and
      behaves like a genuine fresh install (already verified in the browser preview; confirm the
      same holds on-device).
- [ ] **No development menus in production build** — confirm the TestFlight build has no dev menu
      (shake gesture / three-finger long-press), no "Reload" debug banner, and no Expo dev-client
      UI. If any of these appear, the build was made with the wrong profile (`development` instead
      of `preview`/`production`).
