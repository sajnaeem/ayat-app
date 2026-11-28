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
3. **Khadija, 45, practising mother of three.** Reads daily, wants tafsir, family khatm, bedtime stories, larger text. (Used 24 Nov.)
4. **Tom, 28, not Muslim, curious after a friend's Ramadan.** Guest, won't sign up, knows no terms. (Used 25 Nov.)
5. **Yusuf, 67, recently bereaved.** Wants to read for his late wife; small-screen phone, large text, not confident with apps. (Used 27 Nov.)
6. **Sara, 19, student on an iPhone SE.** Uses Bold dark, short sessions between lectures, shares to WhatsApp. (Used 28 Nov. Everyone has now been walked once: start again with Amina.)

## What the research says so far

- **The loudest complaints about existing apps** (review round-ups, Nov 2026): full-screen and video ads around the adhan; login walls and paywalls on basic features; location data sold (2020 reports) and privacy doubts; surprise subscription renewals; prayer times drifting after travel; apps grown slow and bloated. Praise goes to calm, ad-free, private, fast apps. → Munib's free, no-tracking, no-login-wall stance is its clearest edge; keep it visible and never erode it. Source: unstar.app comparison of five apps; a Product Hunt founder thread ("login walls and paywalls on basic features" as the top complaint, plus requests for word-by-word meaning, which Munib has via hold-a-word).
- **GTAF "State of the Ummah 1447" survey** (self-selected, skews practising): 95.7% use Quran apps; 57.6% read daily; **41.4% name reading or understanding the Quran as a struggle** (50% of those over 51); focus in prayer and avoiding sins rank higher still; what people want most is **knowledge (36%)**, then community (16%) and a mentor (14%); habit-building tools only 1.5%. → Lead with understanding (Ask, tafsir, context notes, explainers) more than with tracking. Focus in prayer (khushuʿ) is an unmet need.
- **Converts** (Haute Hijab's "11 challenges"): isolation, no community, family disapproval, learning salah and wudu, learning Arabic, feeling they never fit in. → Learn to pray, Surahs for your prayer and the gentle tone matter most; isolation is the gap Munib doesn't yet answer.
- **Streaks** (Silverman & Barasch, "On or Off Track", Journal of Consumer Research 2023; INSEAD Knowledge, 22 Jun 2022; Psychology Today, 12 Jun 2023): across seven experiments with 4,000+ people, an intact streak kept people going (66% chose to continue) and a broken one put them off (58%); the drop is worse when people feel the break was their own fault; the authors advise not notifying people of a broken streak. → Evidence for Munib's no-streak, "starts fresh every day, nothing said about a missed day" design. Never add streak counters or "you missed" messages.
- **Who drifts and who returns** (Eman Abdelhadi, IIIT blog, 80 life-history interviews with US-raised Muslims born 1971–85; small sample, one region): 62% had drifted from their community at some point, mostly ties "simply fading away in adolescence"; 79% of those men later returned but only 35% of the women; "the more monitoring and surveillance women experienced, the more likely they were to leave and the less likely they were to come back." → Being watched or judged is what keeps people away. Munib's private-by-default choices (circles show how many, never who; phone-only checklist) fit this; keep any social feature free of visible "who did / didn't".
- **Children's Islamic story apps** (justuseapp.com's page of 22 user reviews for one such app, read 24 Nov 2026; reviews undated, store average shown 4.6/5): parents praise the content for Muslim children, bedtime stories and audiobooks ("My kids are obsessed"); the complaints are about stories locked behind payment and access problems after paying ("everything showed as locked", "why can't you add some free games or videos"). → Every bedtime story being free is a real point of difference for parents; say so wherever stories are described.
- **Text size for older readers** (Hou, Anicetus & He, "How to design font size for older adults: a systematic literature review with a mobile device", Frontiers in Psychology, 1 Aug 2022; 12 studies; read through a summary, not the full text): "older adults preferred larger font sizes", but "there exists a critical size at which readability declines"; the studies it reviews land between about 13 and 18 pt for sustained reading, and it gives no single minimum. → Munib's Extra large (about 21 on the tafsir, 16 × 1.3) is in a sensible range; the setting now reaches all the long reading except bedtime stories (proposal 7, built).
- **Reading the Quran cold, as an outsider or a brand-new Muslim** (four first-person or reported accounts, read 25 Nov 2026; anecdotes, not a survey). A Western reader who finished it in 30 days (Mike, Substack, 12 Jun 2025): "I was expecting something narrative, like much of the Bible. The Quran is different"; of his edition's footnotes, "Without them, I would've been completely lost." A Quaker reader (Michael Birkel, Friends Journal, 1 Oct 2023): "Reading it sequentially can leave one confused. Its organization is not immediately evident"; "One entry for the new guest is the door of beauty", then mercy and justice, with Muslim friends to guide him. A convert (Theresa Corbin, AboutIslam, 27 Mar 2020): "I found the Quran… indecipherable and it made me feel like a bad Muslim"; stories of the prophets, some tafsir and al-Fatihah as "the lens" brought it into focus. TikTok readers in late 2023 (Jessica Roy, New Lines Magazine, 1 Dec 2023; the piece is sceptical of the trend): "the Quran was entirely a mystery to me"; "it was describing what I already felt". → Munib's For you (short ayat chosen for mercy and comfort, with context notes) is the right front door for a newcomer; reading in order with no help is where people get lost. A plain explanation one tap away matters more for this reader than the classical commentary (proposal 9).
- **Older readers and apps** (two sources, read 27 Nov 2026). Nielsen Norman Group, "Usability for Older Adults: Challenges and Changes" (Lexie Kane, 8 Sep 2019; "a total of 123 participants aged 65 and older" over three rounds of testing, 2001–2019): buttons and links are often "displayed at a small size that is difficult for older users to click on or tap"; on phones, interface text "was often too small and lightly colored"; "Older users make more mistakes than younger users do"; "Interfaces in websites and apps are often inflexible and unforgiving of errors." Wickramathilaka, Grundy, Madampe & Haggag (Monash), "Accessibility Recommendations for Designing Better Mobile Application User Interfaces for Seniors" (arXiv 2504.12690, 17 Apr 2025; two focus-group rounds, 16 then 22 seniors; the figures below were read through a summary, not checked word for word): recommends body text of at least 20 pt, touch targets of 7–10 mm, a "consistently visible 'back' button", plain-language error messages and a way to undo. → Every screen needs a way back that can be seen (not only a swipe); grey small print of 12–13 px is the weak spot for Yusuf and Khadija (proposal 10). Not found this run: a readable study of how bereaved Muslims use the Quran and dua (two pages would not open); try again another day.
- **Why and what people share from the Quran** (Abokhodair, Elmadany & Magdy, "Holy Tweets: Exploring the Sharing of Quran on Twitter", CSCW 2020, arXiv 2008.08372, read 28 Nov 2026; Arabic-language Twitter 2016–17, so not WhatsApp and not English; read partly through a summary): "a dataset of 2.6 million tweets that were retweeted over 9 million times"; a survey of 135 people in which "47% (n=65) said they themselves tweet Quran verses"; the reasons the paper gives are doing good that keeps giving (sadaqah jariyah), reminders, memorials for someone who has died, and solidarity; the most shared verses and fragments are about hope in hardship, forgiveness and mercy (48:1, 4:110, 65:1), and verses about fighting are shared "much less often"; one interviewee: "I share verses on the beginning of holidays, such as Ramadan, Haji, and Friday" (one person's account, no day-of-week statistics). → Sharing an ayah is felt as a good deed and an invitation, which fits Munib's "no name, the wording invites" rule; the share button deserves to be easy to reach, and the Friday and Ramadan greetings are the right ones to have (proposal 11).
- **Gen Z and Islamic content** (Rabiah Tul Adawiyah Mohamed Salleh & Sayyed Mohamed Muhsin, IIUM Today, 26 Jul 2025, also on IslamiCity 23 Jul 2025; an essay about their survey of 345 IIUM students in Malaysia; no percentages or method given, so treat as a pointer, not proof): TikTok is "the undisputed number one platform"; WhatsApp's use "surpassed that of X"; students value a reminder that turns up when they need it ("Islamic content helps me stay grounded"); "The primary worry is the proliferation of misinformation and the rise of unqualified influencers"; "It's difficult sometimes to discern if what we're seeing genuinely reflects Islamic teachings." → For Sara, visible sources on every card (surah and ayah, book and number, "needs checking" never shown as fact) are a selling point, not small print; say "every card shows its source" wherever Munib is described.

## Proposals for Saj (he decides; newest first)

None waiting.

(Proposals 1–5 were approved and built on 22 Nov 2026, proposal 6 on 23 Nov, proposal 7 on 24 Nov, proposals 8 and 9 on 25 Nov, proposals 10 and 11 on 28 Nov: see the run log.)

## Backlog the loop can do itself

- Check every screen at 375×667 (iPhone SE) for cut-off or overlapping text. Done 27 Nov at 375×667 with Extra large text: welcome, journey's first three screens, feed, Together tab, gathering of dua, Play on repeat, You, Find a dua: nothing cut off. Bold dark at 375×667 on 28 Nov: feed, tafsir, Ask about this ayah, share sheet, search, Bedtime stories, Go to, page view, a shared ayah link: fine after that day's two fixes. Still to do at that size: Prayer tab, Learn to pray. (Extra large text at 393×852 checked 24 Nov on the feed, tafsir sheet, You, Find a dua, Prayer and Together: nothing cut off.)
- Bold dark: tabs, You, Learn to pray, Ask for dua, Prayer times checked 23 Nov. Feed, tafsir, Ask about this ayah, share, search, stories list, Go to and page view checked 28 Nov. Still to check in Bold dark: the Aa and mood sheets, Read together, circles, a story being read.
- **Share sheet on a small phone (375×667):** the picture fills the screen and "Share image" is a scroll away, with nothing showing that the sheet scrolls. A friction fix the loop may do: keep the Share image button fixed at the foot of the sheet (ShareCard.tsx), picture and chips scrolling above it. Check 393×852 too.
- On a long ayah (2:255) at 375×667 the translation runs under the "Swipe up · tap to pause" hint; the card scrolls, but check the last line can be read clear of the hint and the tab bar.
- Prayer tab header at night: the date line and the end of a long name ("Salaam, Khadija") run over the painted crescent moon. Approved art, so only a glitch fix is allowed. Tried 25 Nov: a soft shadow behind the date made no visible difference, so it was dropped. Next idea: a slightly darker veil behind the text only at night, or ask Saj whether the moon can sit further right in `paint.py`.
- You → "Juz' ʿAmma": the ʿ shows with a gap on the web (font fallback). Check whether it is the web only.
- Tom's path still to walk: a shared ayah link (`/2/255`) as a guest, search for a plain word ("mercy"), and what happens on tapping Reflect, Save and Memorise without an account.
- Welcome screen at 375×667: the gold مُنِيب and the tagline line sit over the tops of the minarets (readable, a little busy). Approved design; mention to Saj only if he asks about small phones.
- Check every empty state (no saved ayat, no posts, no khatms, offline) reads kindly and offers a next step.
- Check all tappable icons have accessibility labels.

## Run log (newest first; keep the last 14, summarise older ones)

**28 Nov 2026. Persona: Sara (19, iPhone SE, Bold dark, shares to WhatsApp).**
- Tested at 375×667 in Bold dark: welcome and the first journey screens; then with saved settings the For you feed, Tafsir, Ask about this ayah (guest), the share sheet, search ("mercy": 143 ayat, the word highlighted), Bedtime stories, Go to, page view (the QCF glyphs show as placeholders here, as expected) and a shared link `/2/255`.
- Changed: (1) the mood word in the feed's top bar was cut off on the smallest phones ("Grate…"); under 390 px wide the little heart is left out so the whole word fits (`narrow` in `TopBar`, checked with Grateful, Guidance, Parenting; wider phones unchanged); (2) the hint in the search box was cut off ("…people, po"); under 390 px it reads "Search Quran, people, posts".
- As Sara: "It looks good in dark and I got to an ayah in two taps, which is all the time I have between lectures. The share picture is lovely and has the link on it. But I nearly gave up looking for the actual share button, it was hiding under the picture, and I didn't know the Jumuʿah greeting was there until I scrolled."
- Research: what people share and why, and the Gen Z survey essay, above. New proposal 11. Two backlog items added (share button, long ayah on a small screen).
- **Proposals 10 and 11 approved by Saj the same day and built.** 10: the small print on A gathering of dua, Read together's start screen and a khatm's screen now follows the reader's text size (`Scaled` in `src/components/Scaled.tsx`, a Text that grows its font and line height with `textScale`, never shrinks; use it for small print on any screen an older reader is likely to open). Checked on the gathering at Extra large, 375×667; the khatm screen needs a signed-in phone, so Saj should glance at it with Extra large text. 11: `greetingOrder` in ShareCard.tsx puts "Ramadan Mubarak" first in Ramadan and "Jumuʿah Mubarak" first on Fridays, "No greeting" still chosen. Ramadan checked with `/?ramadan=12`; the Friday order could not be seen (the run was on a Saturday): look on a Friday.
- Could not test: the real share sheet and WhatsApp preview (the web shares text only), sound, signed-in features, page view's fonts.
- Testing notes: `clickx:Share` opens the share sheet; scroll it with `move:200,400` then `scroll:500`. Buttons under an open sheet can't be clicked: close it first (`xy:200,60`). `/search` and `/mushaf` open by address. A detached checkout at the start of a run: `git checkout -B main origin/main` before anything else.

**27 Nov 2026. Persona: Yusuf (67, bereaved, small phone, Extra large text). No run on 26 Nov.**
- Tested at 375×667, light look, Extra large text, mood "Grieving or low": welcome and the first journey screens, the feed, the Together tab top to bottom, A gathering of dua (set up for "Maryam", She), Play on repeat, Read together and Family circle as a guest, You, Prayer times, Find a dua.
- Changed: (1) on A gathering of dua the three switches had no visible track when off (a lone white dot on navy); the off track is now a soft grey (`trackColor.false` and `ios_backgroundColor` in gathering.tsx); (2) the "Create a free account" screens of Read together and circles had no way back for a guest (a dead end when opened from a link); each now has a "Not now" link under the button (goes back, or to Home when there is nothing to go back to).
- As Yusuf: "It let me type her name and it said 'In loving memory of Maryam', and that was enough to make me stay. Playing a surah on repeat I understood at once. But the notes under 'Good to know' are tiny grey writing on dark blue, and I put the phone down rather than squint; and 'My mother or father' made me wonder for a moment whether this was meant for a wife at all."
- Research: older readers and apps, above. New proposal 10.
- Could not test: the gathering actually playing (recitation, the English voice needs a signed-in phone), Read together and circles past the sign-up screen, sound.
- Testing notes: the grief mood's id is `grieving` (not `grief`; a wrong id silently gives the general feed). The gathering's setup: `goto:/gathering`, `fill:<name>`, `clickx:She`, `click:Continue`. Research pages on ncbi.nlm.nih.gov and pubmed would not open from here; arxiv.org/html and nngroup.com did.

**25 Nov 2026. Persona: Tom (guest, not Muslim).**
- Tested: welcome → "Not now, just let me read" → first ayat → mood picker at the third card → Tafsir on the first "New here" ayah → all five tabs as a guest → Ask starter (goes to the sign-up screen with a clear "Not now, keep reading the Quran") → Words and practices explained → Learn to pray; You in Bold dark. 393×852, light look.
- Changed: (1) in Bold dark an empty progress bar (Juz' ʿAmma, 0 of 564) had a strong green track and looked part-filled; the track is now faint (`Bar` in List.tsx); (2) the ummah card said "1 ayat read on Munib this week"; it now says "1 ayah" when the total is one.
- Tried and dropped: a shadow behind the Prayer header's date (no visible gain over the moon).
- Backlog closed: tapping a prayer pill by position ticks it (`xy:91,613` Fajr, `xy:150,613` Dhuhr on the Prayer tab at 393×852).
- As Tom: "I liked that it let me straight in and the first thing I read was about hardship and ease; the 'What is salah?' cards talk to me like an adult. But when I tapped Tafsir to understand a verse I got a page of names and Arabic and backed out, and the screen called You offered me a 'Plus' plan a minute after the front page said free."
- Research: first-time readers' accounts, above. New proposals 8 and 9.
- **Proposals 8 and 9 approved by Saj the same day and built:** the Munib Plus card on You shows only when Plus can be bought or the reader is a member (`plus.available || plus.active` in you.tsx; Ask's limit messages already had that check); the Tafsir sheet on feed cards opens with "This is a detailed classical commentary. For a short answer in plain English, ask about this ayah." and an Ask button that closes the tafsir and opens Ask about this ayah (`onAsk` on `TafsirSheet`; page view has no Ask sheet, so no line there). Still open for Saj and a scholar: context notes for For you ayat that have none (e.g. 4:1).
- Could not test: sound and recitation, Ask's answers (signed-in), Apple sign-in (the web shows email only).
- In the test, the Ask button inside the tafsir sheet is at `xy:337,276` (`clickx:Ask` hits the card's own Ask behind the sheet).
- Testing notes: `?sky=` did not change the Prayer header in this run when the tab was reached by clicking from `/?sky=…` (all four came out as night); check the phase on a first screenshot before trusting a comparison. For a guest with no journey use `"mood":"newmuslim"` in saved settings to get the newcomer feed without the picker. Sheets close with a tap on the dimmed area above them (`xy:200,60`), not Escape.

**24 Nov 2026. Persona: Khadija.**
- Tested: saved settings as a returning reader with **Extra large text in the light (Bold) look**, 393×852: feed and the Tafsir sheet, Bedtime stories and one story, You (all sections), Surahs for your prayer, Find a dua, Learn to pray, the Prayer and Together tabs.
- Changed: (1) Daily deeds' empty ticks and prayer pills were nearly invisible on the white card in the light look; they now have a clear grey outline (`edgeOf` in Today.tsx, same fix as the dark look got on 23 Nov); (2) the tafsir, Munib's longest reading, now follows the reader's text size (`TafsirSheet` in Study.tsx; checked with the "couldn't load" line, which uses the same style, since the tafsir itself can't load here).
- As Khadija: "The stories are exactly what I want at bedtime: big calm text, a sleep timer, and nothing asking me to pay. Family things are easy to find under Together. But I set the text to Extra large and only the ayah grew; I shouldn't have to hunt for my glasses for the commentary."
- Research: children's story app reviews and the font-size review, above. New proposal 7.
- **Proposal 7 approved by Saj the same day and built:** text size now also scales Ask's answers (`answerSize` in `(tabs)/ask.tsx`), Ask about this ayah's answers (`AskSheet`) and the explainer sheets (`Part` in Explain.tsx). Checked on an explainer at Standard and Extra large; the two Ask answers need a signed-in phone. Bedtime stories left as they are (already large). Any new long-reading screen should use `textScale(prefs.textSize)`.
- Could not test: the tafsir's real text, narration sound, Read together and circles (signed-in), page view fonts.
- Testing notes: the first journey can be skipped for a persona with saved settings plus `"textSize":"xl"` (small / medium / large / xl) and `"mood":"grateful"` (which also stops the mood picker opening). `?sky=` is lost after a `goto:`, so add it to each address.

**23 Nov 2026 (first scheduled run). Persona: Bilal.**
- Tested: welcome → journey as a returning brother → feed → mood picker; then every tab, You, Learn to pray, Ask for dua, Prayer times and Words explained in **Bold dark** at night (`?sky=isha`), 393×852.
- Changed: (1) Daily deeds' empty tick circles and prayer pills were almost invisible in Bold dark (hairline colour on a dark card): they now have a clear outline, and the arrow buttons a slightly stronger fill (`edgeOf` in Today.tsx; light look untouched); (2) section headings with a long note no longer break in two ("Pray / along" in Learn to pray): the heading stays on one line and the note wraps beside it (`Section` in List.tsx, used on four screens); (3) guests on the You screen no longer see Sign out, Blocked people or Delete my account (there was nothing to sign out of).
- As Bilal: "The hadith about Allah running towards me after I said I'd been away got me. Nobody told me off. Ask already had my exact question, 'I haven't prayed in years. How do I start again?', which I'd never type to a person. But the Prayer tab opening on 0/6 with five empty prayer boxes felt like my mum's look across the room."
- Research: streaks (JCR 2023 / INSEAD) and who returns (IIIT interviews), above. New proposal 6.
- **Proposal 6 approved by Saj the same day and built:** for readers whose journey answer is "come back to Allah", Daily deeds shows "Start with one. Whatever you do today counts." and no "0/6" until the first deed of the day is complete (`gentle` in Today.tsx; every day, not only the first week, because no install date is kept in prefs). The wording should go on the scholar's review list.
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
