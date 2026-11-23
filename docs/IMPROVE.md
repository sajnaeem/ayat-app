# Munib: the daily improve loop

Started 22 Nov 2026 (Saj: "pretend you're a human tester, a market researcher and the target demographic… continually iterate the app… revise your instructions based on the new info you collect… a daily scheduled task").

This file is the loop's memory. A scheduled task ("Munib daily improve") runs once a day in a fresh session, reads `CLAUDE.md` and this file, does one round, and **rewrites this file** with what it learned. Keep it under about 400 lines: condense old entries rather than letting it grow.

Backup of the app before the loop began: branch `backup/2026-11-22` on GitHub (commit e86d8ca). To go back: ask Claude to "restore the 22 Nov backup".

## The three hats

1. **Human tester.** Use the app the way a person would (web export + Playwright at phone size, script in "How to test"). Look for anything broken, confusing, cut off, slow, or that makes you stop and think.
2. **Market researcher.** Spend a few searches on what real people say: reviews of Quran and prayer apps, convert/revert forums and blogs, surveys of Muslims, retention research. Record findings with their source and date. Evidence, not hunches.
3. **Target reader.** Rotate the persona each run (see "Personas"). Ask: would I open this again tomorrow? What made me feel welcome, judged, lost or bored?

## What the loop may change by itself

Small, safe, reversible things: bugs, layout glitches, cut-off or unclear wording (not religious wording), friction in a flow, accessibility (labels, contrast, touch sizes), performance, dead ends. At most **3 changes a run**, each a small diff.

## What it must NOT change (write a proposal for Saj instead)

- Anything under "Product decisions" in `CLAUDE.md`, pricing, ads, accounts policy, the mission wording.
- **Religious content of any kind**: Quran text or translations, hadith, duas, explainers, stories, surah notes, transliterations, rulings, virtue claims. Never add, reword or remove them. Typos in religious text are reported, not fixed.
- New features, new screens, new tabs, removing a feature.
- The look Saj approved (welcome screen, sky headers, painted scenes, jewel screens, page view, App Store screenshots) beyond fixing a glitch.
- Privacy, data collection, consent wording, the privacy policy or terms.
- Supabase (tables, functions, secrets, data), Vercel settings, Expo builds, anything native (`app.json`, new packages), `ios/` or `android/`.
- Anything that names or imitates another app, its text or its art.
- Scheduled tasks other than reading them.

## Rules for every run

- `git pull` first. Work on `main` while Munib is pre-launch (TestFlight only). **Once CLAUDE.md says Munib is live on the App Store, stop pushing to `main`: push to branch `improve/next` and ask Saj to approve.**
- Before pushing: `npx tsc --noEmit` clean, the web export builds, and a before/after screenshot of each change looks right. If anything fails and can't be fixed quickly, `git checkout .` and push nothing.
- One commit per change with a plain message, ending with the attribution lines the session gives.
- Never paste or ask for secrets. The user's email is private.
- If nothing clearly worth changing is found, change nothing. A run that only adds research and a proposal is a good run.
- Nobody is watching the run: don't ask questions, decide and note it here.

## How to test

```
cd /home/claude/ayat-app && npm install        # if node_modules is missing
npx tsc --noEmit
EXPO_OFFLINE=1 npx expo export --platform web --output-dir <scratchpad>/webx
ROOT=<scratchpad>/webx node scripts/qa/walk.js <name> <startPath> '<json list of actions>' ['<json localStorage>']
```

`scripts/qa/walk.js` serves the export (the folder in `ROOT`, default /tmp/webx; use the session's scratchpad folder), opens it at 393×852 (set `W`/`H` for other phones, e.g. `W=375 H=667`), runs the actions and saves a screenshot after each in `scripts/qa/shots/` (not committed). Actions: `click:text`, `clickx:exact text`, `last:text` (use for tab bar labels), `fill:text`, `xy:x,y`, `scroll:px`, `wait:ms`, `goto:/path`, `key:Enter`.

Things learned about testing:
- `click:` takes the first match anywhere in the text, so `click:Sister` hits "…for sisters or brothers". Use `clickx:` for exact labels.
- The swipe cards' True / Not really buttons: click by position (`xy:308,493` true, `xy:85,493` not really at 393×852); the words also exist as hidden stamps on the card.
- The page's text dump always shows the first feed card (all tabs stay mounted); judge by the screenshots.
- Wheel-scroll doesn't work while the pointer rests on the floating tab bar: move it first (`xy:200,400` can tap things; prefer `goto:` to a screen and scroll before clicking tabs).
- Prefs live in localStorage `ayat.prefs.v1`, progress in `ayat.progress.v1`. URL helpers: `?sky=fajr|day|maghrib|isha`, `?ramadan=12`, `?h=118` (Qibla).
- `move:x,y` puts the pointer somewhere without clicking (do this over the page before `scroll:`). The address `/together` opens Read together, not the Together tab: reach tabs by clicking them (`last:Together`).
- Not testable here: sound, haptics, notifications, Apple sign-in, real recitation, the lock screen, liquid glass, signed-in server features (Ask answers, Read together). List these for Saj instead of guessing.
- **Skip the first run with saved settings** (4th argument): `{"ayat.prefs.v1":{"onboarded":true,"firstRun":"done","journeySkipped":true,"firstName":"Bilal","gender":"brother","look":"dark"}}` (`look`: bold / dark / light). A guest who finishes the journey still gets the mood picker over the feed: pick a mood or close it before clicking tabs.
- **Look at many screens at once:** `montage a.png b.png c.png d.png -tile 4x1 -geometry +4+0 sheet.png` (ImageMagick) makes a contact sheet of four; far quicker than opening each.
- Screens with their own address for `goto:`: `/you`, `/pray`, `/tasbeeh`, `/qibla`, `/prayertimes`, `/dua-requests`, `/explain`, `/ramadan`, `/repeat`, `/live`, `/duas`, `/learn`, `/stories`. The profile button's position differs per tab, so use `goto:/you`.
- The one console error every run (`ERR_TUNNEL_CONNECTION_FAILED`) is the workspace having no internet for the app; ignore it. Server lists (Ask for dua, etc.) show their empty or "couldn't load" state.
- Returning Muslim brother journey: `["click:Get started","fill:Bilal","click:Next","clickx:Brother","wait:1500","click:come back to Allah","wait:1800","click:Continue","wait:1200","click:Slowly","wait:1500","xy:85,493","wait:900","xy:308,493" ×5 with waits,"wait:1500","click:No thanks","wait:2500","click:Not now"]`.
- The first-run journey as a new Muslim sister: `["click:Get started","fill:Amina","click:Next","clickx:Sister","wait:1500","click:new to Islam","wait:1500","click:Continue","wait:1200","click:learning","wait:1200","xy:308,493" ×6,"wait:1500","click:No thanks","wait:2500","click:Not now","wait:4000"]`.

## Personas (rotate; note which one each run used)

1. **Amina, 24, took her shahadah last month.** Can't read Arabic, nervous about praying wrong, has no Muslim family. (Used 22 Nov.)
2. **Bilal, 31, born Muslim, hasn't prayed regularly in years.** Scrolls TikTok two hours a night, feels guilty, hates being lectured. (Used 23 Nov.)
3. **Khadija, 45, practising mother of three.** Reads daily, wants tafsir, family khatm, bedtime stories, larger text.
4. **Tom, 28, not Muslim, curious after a friend's Ramadan.** Guest, won't sign up, knows no terms.
5. **Yusuf, 67, recently bereaved.** Wants to read for his late wife; small-screen phone, large text, not confident with apps.
6. **Sara, 19, student on an iPhone SE.** Uses Bold dark, short sessions between lectures, shares to WhatsApp.

## What the research says so far

- **The loudest complaints about existing apps** (review round-ups, Nov 2026): full-screen and video ads around the adhan; login walls and paywalls on basic features; location data sold (2020 reports) and privacy doubts; surprise subscription renewals; prayer times drifting after travel; apps grown slow and bloated. Praise goes to calm, ad-free, private, fast apps. → Munib's free, no-tracking, no-login-wall stance is its clearest edge; keep it visible and never erode it. Source: unstar.app comparison of five apps; a Product Hunt founder thread ("login walls and paywalls on basic features" as the top complaint, plus requests for word-by-word meaning, which Munib has via hold-a-word).
- **GTAF "State of the Ummah 1447" survey** (self-selected, skews practising): 95.7% use Quran apps; 57.6% read daily; **41.4% name reading or understanding the Quran as a struggle** (50% of those over 51); focus in prayer and avoiding sins rank higher still; what people want most is **knowledge (36%)**, then community (16%) and a mentor (14%); habit-building tools only 1.5%. → Lead with understanding (Ask, tafsir, context notes, explainers) more than with tracking. Focus in prayer (khushuʿ) is an unmet need.
- **Converts** (Haute Hijab's "11 challenges"): isolation, no community, family disapproval, learning salah and wudu, learning Arabic, feeling they never fit in. → Learn to pray, Surahs for your prayer and the gentle tone matter most; isolation is the gap Munib doesn't yet answer.
- **Streaks** (Silverman & Barasch, "On or Off Track", Journal of Consumer Research 2023; INSEAD Knowledge, 22 Jun 2022; Psychology Today, 12 Jun 2023): across seven experiments with 4,000+ people, an intact streak kept people going (66% chose to continue) and a broken one put them off (58%); the drop is worse when people feel the break was their own fault; the authors advise not notifying people of a broken streak. → Evidence for Munib's no-streak, "starts fresh every day, nothing said about a missed day" design. Never add streak counters or "you missed" messages.
- **Who drifts and who returns** (Eman Abdelhadi, IIIT blog, 80 life-history interviews with US-raised Muslims born 1971–85; small sample, one region): 62% had drifted from their community at some point, mostly ties "simply fading away in adolescence"; 79% of those men later returned but only 35% of the women; "the more monitoring and surveillance women experienced, the more likely they were to leave and the less likely they were to come back." → Being watched or judged is what keeps people away. Munib's private-by-default choices (circles show how many, never who; phone-only checklist) fit this; keep any social feature free of visible "who did / didn't".

## Proposals for Saj (he decides; newest first)

**6. A softer Daily deeds for someone coming back (23 Nov 2026).** As Bilal (hasn't prayed in years), the first thing on the Prayer tab is "Daily deeds 0/6" with five empty prayer pills, which reads like a scoreboard he is already failing. The streak research above says feeling at fault is what makes people stop. Idea: for readers who chose "I want to come back to Allah", show a line under the title for the first week such as "Start with one. Whatever you do today counts." and/or hide the "0/6" until the first tick. It changes an approved card and its wording touches worship, so it is Saj's call (and the wording needs his or a scholar's eye). Reply "do proposal 6" or "drop 6".

(Proposals 1–5 were approved and built on 22 Nov 2026: see the run log.)

## Backlog the loop can do itself

- Check every screen at 375×667 (iPhone SE) and with Extra large text for cut-off or overlapping text.
- Bold dark: tabs, You, Learn to pray, Ask for dua, Prayer times checked 23 Nov. Still to check in Bold dark: the feed's sheets (Aa, mood, tafsir, Ask), search, Read together, circles, stories, page view.
- Light look: Daily deeds' empty ticks and prayer pills are very faint on white (hairline colour). Strengthen slightly (accessibility) and compare before/after; only the dark look was fixed on 23 Nov.
- You → Juz' ʿAmma bar in Bold dark: the empty track is a strong green, so 0 of 564 looks part-filled. Check `Bar` in List.tsx.
- Walk each persona's first five minutes.
- Check every empty state (no saved ayat, no posts, no khatms, offline) reads kindly and offers a next step.
- Check all tappable icons have accessibility labels.

## Run log (newest first; keep the last 14, summarise older ones)

**23 Nov 2026 (first scheduled run). Persona: Bilal.**
- Tested: welcome → journey as a returning brother → feed → mood picker; then every tab, You, Learn to pray, Ask for dua, Prayer times and Words explained in **Bold dark** at night (`?sky=isha`), 393×852.
- Changed: (1) Daily deeds' empty tick circles and prayer pills were almost invisible in Bold dark (hairline colour on a dark card): they now have a clear outline, and the arrow buttons a slightly stronger fill (`edgeOf` in Today.tsx; light look untouched); (2) section headings with a long note no longer break in two ("Pray / along" in Learn to pray): the heading stays on one line and the note wraps beside it (`Section` in List.tsx, used on four screens); (3) guests on the You screen no longer see Sign out, Blocked people or Delete my account (there was nothing to sign out of).
- As Bilal: "The hadith about Allah running towards me after I said I'd been away got me. Nobody told me off. Ask already had my exact question, 'I haven't prayed in years. How do I start again?', which I'd never type to a person. But the Prayer tab opening on 0/6 with five empty prayer boxes felt like my mum's look across the room."
- Research: streaks (JCR 2023 / INSEAD) and who returns (IIIT interviews), above. New proposal 6.
- Could not test: sound, real recitation, signed-in features, Ask's answers, the phone's own dark mode ("Match phone").

**22 Nov 2026 (second pass, same day). Saj approved all five proposals; built:**
- Welcome screen trust line: "Free · No ad tracking · No account needed to read" ("No ad tracking" rather than "No tracking" because anonymous usage counts are on by default). Use the same line in the App Store listing when it is written.
- "What am I saying in my prayer?" (`src/app/pray/meaning.tsx`, first row of the list in Learn to pray): only reuses the words and meanings already in Learn to pray and al-Fatihah from Surahs for your prayer. Needs the same scholar's check.
- Transliteration on ayah cards is left-aligned, and uses Munib's plainer learner spelling where it exists (al-Fatihah and the 20 short surahs; `learnTl` in VerseCard). Other ayat still use the harder spelling: a plain spelling for the whole Quran would need a checked source.
- Night tiles: each painted card scene now has its own night colour (`NIGHT_HUE` / `night_tint` in scripts/art/paint.py).
- Guests who skip the questions see ayat first; the mood picker opens when they reach the third card.

**22 Nov 2026 (first run, in chat with Saj). Persona: Amina.**
- Tested: welcome → journey → feed → all five tabs at 393×852; guest path at 375×667.
- Changed: (1) the mood pill no longer cuts off ("New t…" → "New here"; short word per mood, `MOOD_PILL`); (2) the first one-time tip waits 20s instead of 2.5s so it doesn't cover the first ayah a new reader sees; (3) Ask's box no longer says "(free account)" in the placeholder; (4) for someone new to Islam the "Is this true for you?" cards now open with "I'm still learning the basics of Islam", not "I read the Quran most weeks" (same ids, so the settings they drive are unchanged).
- Research: the three sources above.
- Could not test: sound, real recitation, signed-in features.
