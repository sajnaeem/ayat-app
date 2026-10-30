# Munib · مُنِيب

*One who turns back to Allah* (Quran 50:33).

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
- Required accounts (Apple, Google, phone or email) with a display name; like counts, reflections with reporting, backup of saves and progress, sign out and delete account

## Connecting the database (Supabase)

An account is required to use Munib. People sign in with Apple (iPhone), Google, their phone number or email, then choose a display name.

1. **SQL Editor → New query**: run `supabase/schema.sql`, then run `supabase/002_accounts.sql`.
2. **Authentication → Sign In / Providers**:
   - **Allow anonymous sign-ins**: off.
   - **Email**: on. For the beta, turn **Confirm email** off (Supabase's built-in email sender only allows a few emails an hour). Turn it back on once a custom email sender is set up.
   - **Apple**: on. In **Client IDs** enter `host.exp.Exponent,app.munib` (the first is Expo Go, the second is the real app).
   - **Google**: on, with the Client ID and secret from a Google Cloud "Web application" OAuth client whose redirect URI is `https://<project>.supabase.co/auth/v1/callback`.
   - **Phone**: needs an SMS provider such as Twilio (paid per text).
3. **Authentication → URL Configuration → Redirect URLs**: add `munib://**` and `exp://**`.
4. `.env` in this folder holds the project URL and publishable key.

Reported reflections: three reports from different people hides a reflection. Review them in **Table Editor → reflections** (filter `hidden = true`) and either delete the row or set `hidden` back to false.

People can sign out and permanently delete their account from the You screen.

## Coming next

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
