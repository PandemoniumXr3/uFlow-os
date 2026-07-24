# uFlow Support

**Status: draft, for internal TestFlight beta.**

## Getting help

If something isn't working, looks wrong, or you have a suggestion, the fastest way to reach us is
from inside the app:

**Settings → Beta feedback → Report a bug / Suggest an improvement / General feedback**

This opens your device's mail app with a pre-filled message (app version, build, platform, and the
screen you were on) — review it, add any details, and send. You can also copy the pre-filled
message manually if no mail app is available on your device.

## Direct contact

**[PLACEHOLDER — support email not yet finalized.]** Until a real inbox is set up, the app's
in-app feedback flow (above) is the only supported contact path. See `constants/support.ts` for the
single place this will be updated once a real address exists — it is not scattered across the
codebase.

## Common questions

**Is my data backed up automatically?**
No. uFlow stores data only on your device. Use **Settings → Export data** to create a backup file
yourself, and store it somewhere safe — it is a plain, unencrypted JSON file.

**I imported a backup and something looks wrong — what do I do?**
The Import flow shows a preview and asks you to choose Merge or Replace before anything is written,
and Replace has an extra confirmation step. If an import still produced an unexpected result, use
"Report a bug" from Settings and describe what you expected vs. what happened — screenshots help.

**How do I remove the built-in demo data / starter recipes?**
Demo data (if you installed it) can be removed from **Settings → Demo data → Remove demo data** —
this only removes the tagged demo entries, not your own. The starter recipe library and product
catalog that ship with the app are not demo data and don't have a bulk-remove action; remove
individual recipes/products you don't want from their respective screens.

**How do I delete everything and start over?**
**Settings → Destructive actions → Clear all data.** This is permanent and not undoable — export a
backup first if you're not sure. It returns the app to a fresh-install state.

**Does uFlow work offline?**
Yes — there is no server and no network dependency for any core feature. Export/import use your
device's own share sheet, file picker, and clipboard, which work offline; only actually *sending* an
exported file somewhere (e.g. email, AirDrop) needs connectivity, same as sharing any other file.

## Reporting a security concern

If you believe you've found a security issue (not a general bug), please say so explicitly in your
report via **Settings → Beta feedback → Report a bug**, so it can be prioritized appropriately.

## Hosting this document

**[PLACEHOLDER]** — like the privacy policy, App Store Connect asks for a support URL. Publish this
file (or a page with the same content) at a public URL before store submission; not required for
internal TestFlight testing.
