# App Store Connect — Draft Listing Metadata

**Status: draft.** Written to describe what uFlow actually does today — no future/planned features
described as available. Adjust freely; nothing here is final copy.

## App name

uFlow

## Subtitle (30 characters max)

`Plan meals from what you own` (28 chars)

## Promotional text (170 characters max, editable without a new build)

`uFlow helps you plan meals around what's already in your kitchen, track a grocery list, and keep an eye on nutrition and budget — all stored on your device.`

## Description (full)

```
uFlow is a calm, practical way to plan what to eat — built around the food you already have.

WHAT IT DOES
• Stock — track what's in your kitchen, with expiry awareness
• Recipes — a starter library plus your own, with ingredient lines and servings that scale
• Today & Week — see what's planned, get suggestions based on your Stock and preferences
• Grocery — a running list that fills in automatically from missing ingredients, plus anything you add by hand
• Meal history — a simple log of what you actually ate
• Optional Nutrition tracking — calorie/macro estimates where ingredient data supports it
• Optional Budget Mode — see estimated grocery costs and what fits a weekly budget

BUILT AROUND YOUR PREFERENCES
Set allergies, intolerances, and a diet type once, and uFlow filters and ranks suggestions
around them — with a Safe Meals Only mode for extra peace of mind. Suggestions never override
a preference you've set.

YOUR DATA, ON YOUR DEVICE
uFlow has no account and no cloud sync — everything is stored locally. Export a backup any time
(a plain JSON file you control), and import it back or onto another device whenever you like.
There is no advertising, no analytics, and no tracking.

This is an early release. We'd love your feedback — there's a direct feedback option built right
into Settings.
```

## Keywords (100 characters max, comma-separated, no spaces needed by Apple but kept readable here)

`meal planner,grocery list,recipes,pantry,stock,nutrition,budget,meal prep,food,kitchen`

## Category recommendation

**Primary:** Food & Drink
**Secondary (optional):** Lifestyle

Reasoning: uFlow's core function is meal planning and grocery/pantry management, which is squarely
Food & Drink. It is explicitly **not** a Health & Fitness app (no HealthKit integration, no clinical
health tracking) and should not be categorized there even though it has optional nutrition estimates
— see `docs/app-store-privacy-answers.md`'s health/fitness classification note.

## Age rating considerations

No objectionable content, no user-generated content shared with others (all content is
private/local), no gambling, no mature themes. Likely qualifies for the lowest age rating tier
(4+), but **the actual App Store Connect age-rating questionnaire should be completed directly** —
this is a starting recommendation, not a substitute for answering Apple's specific questions (which
periodically change).

## Privacy Policy URL

**[PLACEHOLDER]** — `docs/privacy-policy.md` needs to be published at a public URL. Not required
for internal TestFlight testing; required before external TestFlight or App Store review.

## Support URL

**[PLACEHOLDER]** — `docs/support.md` needs to be published at a public URL, same timing as above.

## Internal beta description (for TestFlight's "What to Test" / internal notes field)

```
Internal beta build — uFlow v1.0.0 (build 1).

This is the first build being tested end-to-end: onboarding, Stock, Recipes, Today/Week planning,
Grocery, meal history, optional Nutrition and Budget features, and full backup export/import with
merge/replace/undo.

Please see the in-app Settings → Beta feedback for reporting anything you find, and the tester
guide (docs/testflight-beta-guide.md) for a suggested ~15-minute test route.

Known limitations for this build:
- No push notifications (not implemented in this milestone)
- No cloud sync / multi-device sharing (by design — everything is local)
- Icon/splash artwork is a release-candidate reusing the existing brand mark, not final
  marketing-approved artwork (see docs/release-checklist.md)
```

## What to Test (TestFlight-specific field, can duplicate/summarize the above)

```
Please test: onboarding, adding Stock, browsing/opening a recipe and changing servings, planning a
meal, adding a missing ingredient to Grocery and marking it purchased, exporting a backup, changing
data, importing that backup back (Merge), and triggering Undo on a "Clear" action in Settings.
Report anything confusing, incorrect, or broken via Settings → Beta feedback.
```

## Release notes — build 1

```
Initial internal beta build. First end-to-end release covering Stock, Recipes, Today/Week
planning, Grocery, meal history, optional Nutrition and Budget tracking, and full backup
export/import (merge, replace, undo). Feedback welcome via Settings → Beta feedback.
```
