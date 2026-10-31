# Munib · مُنِيب — project handbook

Read this first. It explains what Munib is, how it's built, the decisions already made, and how to ship changes.
Expo-specific coding rules are in `AGENTS.md` (always read the docs for the installed Expo SDK; don't code from memory).

## Who you're working with

- The owner is **Saj** (Sajawal Naeem), founder, based in East London. **He has near-zero coding experience.**
- Explain things in plain English, give exact copy-paste steps, and do the technical work yourself.
- He tests on his **iPhone** using **Expo Go**, on a **Mac**. He downloads the repo as a ZIP from GitHub (or `git pull`), runs `npm install` and `npx expo start`, and scans the QR code.
- When something breaks, ask for a screenshot of the phone and of Terminal.

## What Munib is

A short-form, TikTok-style Quran app for Muslims whose attention has been shaped by social media and who struggle to read the Quran. It scrolls like a social feed, but every card is an ayah, and it **gently stretches attention**: single ayat → passages → whole surahs.

**Success = people coming back and reading more, not time-on-app.** Design choices follow from that (time-check card after 20 minutes, no streak guilt, one notification a day maximum).

## Product decisions (don't reverse without asking Saj)

- **Name:** Munib (منيب, "one who turns back to Allah", 50:33). Bundle ID `app.munib`, scheme `munib://`. Domain getmunib.com; company/developer name Munib Labs. ("Ayat" and "Awwab" were dropped; Awwab clashed with an existing Islamic app.)
- **Completely free.** Reading, listening, learning and memorising will *always* be free. Future income ideas (not built yet, by Saj's choice): a Supporter membership (cosmetic extras, via Apple in-app purchase) and **sponsored ayat** ("Sponsored as sadaqah jariyah for the late [name]. Please make dua", with a Make dua button and count). Sponsorship needs scholarly guidance on wording and transparency about where money goes.
- **Never sell or share user data.** Religion is special-category data under UK GDPR. No ad networks.
- **iOS first.** Android later from the same code.
- **Accounts are required.** Sign in with Apple and email for the iOS launch. Google and phone (SMS, paid per text) are coded but not switched on.
- **Design: "Quiet Modern".** Light, soft tinted grounds rotating through 5 tones per card; large right-set Arabic (Noto Naskh Arabic); Literata for reading; Bricolage Grotesque for UI. Avoid the Amiri look that competitors use. Subtle entrance animation: Arabic appears word by word, right to left, and arrives alone; the line, translation and buttons follow once it's complete. Controls (top bar, side buttons, card buttons) fade away about 6 seconds after a card settles and return on any touch (never hidden with VoiceOver; the web preview always reports a screen reader, so they never fade there). A faint eight-point star motif sits in two corners of each card. Icon: cream منيب on emerald (#1F6E52) with the same star; launch screen light #F1F3EF / dark #121A16.
- **Infinite feed**, not a fixed daily set.

## Features (all in the app today)

Feed with mood picker ("What's on your heart today?"), auto recitation with the current ayah highlighted, transliteration toggle, 7 translations, 4 reciters, like / save / share, Keep reading (whole surah), context notes, attention ladder (levels at 25 / 75 / 150 readings), You screen (progress, Juz' ʿAmma, saved ayat, display name with its Arabic meaning, settings), memorise mode (repeat 1–10×, hide words), time-check card, reflections (comments) with reporting, daily check-in notifications (local, max 1/day, Friday al-Kahf, one "we've missed you" after 7 days), in-app feedback, sign out and delete account.

## How it's built

- **Expo SDK 58**, React Native, TypeScript, **Expo Router** (`src/app/`).
- **Supabase** (project `skuhimrzjddujzwdedot`, London) for auth, likes, reflections, reports, backups of saves/progress, feedback. The publishable key in `.env` is meant to ship in the app; **row-level security does the protecting**, so every new table needs RLS policies.
- Content today: curated feed ayat in `src/data/verses.json` (with all 7 translations, notes, mood tags); full surahs fetched from the quran-json dataset on jsDelivr; audio from EveryAyah.com. **Planned:** switch both to the Quran Foundation API (keys requested) for licensed text, audio and word-by-word timings.

```
src/app/            screens: index (feed), surah/[id] (Keep reading), you, feedback, _layout (fonts, sign-in gate)
src/components/     VerseCard (card + animation + memorise), SignIn/ChooseName, Reflections, NameMeaning, Sheet, Toast, Icon
src/lib/            quran (data, feed order, ladder), audio, store (prefs on phone), progress, account (Supabase auth + sync),
                    reminders (notifications), supabase, theme
src/data/           verses.json, surahs.json, names.ts (128 names with Arabic + meaning; needs review by someone with Arabic)
supabase/           schema.sql, 002_accounts.sql, 003_feedback.sql — run in order in the Supabase SQL Editor
```

## Supabase settings (done by Saj in the dashboard)

- SQL files run: `schema.sql`, `002_accounts.sql` (confirm `003_feedback.sql` has been run before relying on feedback).
- Auth: anonymous **off**; Email on with **Confirm email off** for the beta (built-in email sender is rate-limited); Apple on with Client IDs `host.exp.Exponent,app.munib`; redirect URLs `munib://**`, `exp://**`.
- Moderation: 3 reports from different people hide a reflection. Review in Table Editor → reflections (`hidden = true`). Feedback is in Table Editor → feedback; screenshots in Storage → feedback.

## Working rules

- Install packages with `npx expo install` (in this cloud environment: `EXPO_OFFLINE=1 npx expo install …`).
- Before pushing: `npx tsc --noEmit`. A web export (`EXPO_OFFLINE=1 npx expo export --platform web`) plus a phone-sized screenshot is a quick visual check, but notifications, Apple sign-in and audio only work on a real phone.
- Commit with clear messages and push to `main` on `sajnaeem/ayat-app` (repo name predates the rename).
- Never edit `ios/` or `android/` by hand.
- Islamic content (notes, name meanings, translations) must stay accurate. Prefer omitting to guessing, and flag anything that needs scholarly review.

## Launch checklist (iOS)

Saj: Apple Developer account (Individual or Organisation), getmunib.com, Quran Foundation API keys, Supabase Pro at public launch ($25/month, backups and no pausing), optional UK trademark.

Still to build: app icon and launch screen; community guidelines accepted at sign-up and **blocking users** (Apple rule for apps with user posts); getmunib.com with privacy policy and support pages; Quran Foundation API switch; a demo account for Apple's reviewer; App Store listing and screenshots; EAS build → TestFlight → App Store. Recommended: crash reporting (Sentry), a one-off human security review before launch.

## Releasing an update (once on the App Store)

1. Make the change, type-check, push.
2. Small JavaScript-only fixes: `npx eas-cli@latest update` sends them straight to users' phones.
3. Anything with new native modules or app.json changes: `npx eas-cli@latest build -p ios`, test on TestFlight with 2–3 people for a day, then submit for review.
