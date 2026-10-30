# Ayat

A short-form Quran app for people whose attention has been shaped by TikTok, Instagram and YouTube. It looks and scrolls like a social feed, but every card is an ayah, and the app slowly stretches attention from single ayat to whole surahs.

Built with React Native and Expo (SDK 58), so one codebase runs on iPhone and Android.

## What works today

- Endless vertical feed of ayat in the Quiet Modern style, with five alternating colour tones
- Entrance animation as each card lands: the Arabic appears word by word, right to left
- Recitation plays automatically on each card, with the ayah being recited highlighted (4 reciters)
- "What's on your heart today?" mood picker that orders the feed
- Pronunciation (transliteration) toggle
- 7 translations: English, Urdu, Bengali, Indonesian, Turkish, French, Spanish
- Like (or double-tap), save and share, saved on the phone
- Keep reading: opens the whole surah at the ayah you were on
- Context notes on curated ayat
- Light and dark mode
- Attention ladder: passages, short surahs and longer readings join the feed as you read more
- You screen: level, ayat read this week, surahs completed, memorised, Juz' ʿAmma progress, saved ayat, language and reciter
- Memorise mode: loop the recitation, hide words and recite from memory
- Time check after 20 minutes of scrolling, with "Read in full" or "Take a break"
- Accounts, like counts, reflections with reporting, and backup of saves and progress (once Supabase is connected)

## Connecting the database (Supabase)

1. In Supabase, open **SQL Editor → New query**, paste everything in `supabase/schema.sql`, and press **Run**.
2. In **Authentication → Sign In / Providers**, turn on **Allow anonymous sign-ins**. Everyone gets a private account automatically, with no email or password; a display name is asked for only when they first post a reflection.
3. Put the project URL and publishable key in a file called `.env` in this folder:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

Reported reflections: three reports from different people hides a reflection. Review them in **Table Editor → reflections** (filter `hidden = true`) and either delete the row or set `hidden` back to false.

## Coming next

- Sign in with Apple and Google, so an account follows you to a new phone
- Quran Foundation API for text and audio, with word-by-word highlighting
- Beta through TestFlight and Google Play closed testing

## Try it on your phone

1. Install **Expo Go** from the App Store or Google Play.
2. On your computer, install Node.js (the LTS version) from nodejs.org.
3. In a terminal:

   ```bash
   git clone https://github.com/sajnaeem/ayat-app
   cd ayat-app
   npm install
   npx expo start
   ```

4. Scan the QR code that appears: with the Camera app on iPhone, or from inside Expo Go on Android. Your phone and computer need to be on the same Wi-Fi.

## Where the content comes from (for now)

| What | Source today | Production plan |
| --- | --- | --- |
| Curated feed ayat, context notes, mood tags | `src/data/verses.json` (in the app) | Expanded, reviewed by someone with Islamic knowledge |
| Whole surahs for Keep reading | quran-json dataset on jsDelivr (Tanzil and the Noble Qur'an Encyclopedia) | Quran Foundation API |
| Recitation | EveryAyah.com per-ayah MP3s | Quran Foundation API, with word-by-word timings |

Before public launch: confirm translation licences (Saheeh International is copyrighted) and the audio provider's terms.

## Project layout

```
src/
  app/
    _layout.tsx      fonts, theme, navigation
    index.tsx        the feed: cards, recitation, top bar, mood and settings sheets
    surah/[id].tsx   Keep reading: the whole surah
  components/
    VerseCard.tsx    one card, with the entrance animation and action rail
    Sheet.tsx        bottom sheet
    Icon.tsx         line icons
  lib/
    quran.ts         verses, languages, moods, feed ordering, surah loading
    audio.ts         reciters and audio links
    store.tsx        settings, likes and saves (saved on the phone)
    theme.ts         colours and fonts
  data/              curated ayat and surah names
```
