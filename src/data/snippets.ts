import type { MoodId } from '@/lib/quran';

/**
 * Short cards that break up the For you feed: facts, myths and Arabic words.
 * Every Islamic claim carries its source. Written 9 Nov 2026; needs scholarly review before launch
 * (see CLAUDE.md). Prefer leaving a card out to guessing.
 *
 * `moods`: shown first when the reader has picked one of these moods. No moods = for everyone.
 */
export type Snippet =
  | { id: string; kind: 'fact'; title: string; body: string; source: string; moods?: MoodId[] }
  | { id: string; kind: 'myth'; myth: string; fact: string; source: string; moods?: MoodId[] }
  | { id: string; kind: 'word'; ar: string; tl: string; meaning: string; body: string; source: string; moods?: MoodId[] };

export const SNIPPETS: Snippet[] = [
  // Facts
  { id: 'iqra', kind: 'fact', title: 'The first word revealed was “Read”.', body: 'In the cave of Hira, near Makkah, the angel Jibril brought the first ayat: “Read in the name of your Lord who created.”', source: 'Quran 96:1 · Sahih al-Bukhari 3', moods: ['guidance'] },
  { id: 'fatihah17', kind: 'fact', title: 'Al-Fatihah is recited at least 17 times a day.', body: 'It is part of every unit of prayer, and the five daily prayers have 17 units between them.', source: 'Sahih al-Bukhari 756' },
  { id: 'kursi', kind: 'fact', title: 'Ayat al-Kursi is the greatest ayah in the Quran.', body: 'The Prophet ﷺ asked Ubayy ibn Kaʿb which ayah was the greatest. He answered Ayat al-Kursi, and the Prophet ﷺ congratulated him on his knowledge.', source: 'Sahih Muslim 810 · Quran 2:255', moods: ['anxious', 'strength'] },
  { id: 'ikhlas', kind: 'fact', title: 'Surah al-Ikhlas equals a third of the Quran.', body: 'Four short ayat about who Allah is. The Prophet ﷺ said reciting it is equal to reciting a third of the Quran.', source: 'Sahih al-Bukhari 5013' },
  { id: 'maryam', kind: 'fact', title: 'Maryam is the only woman named in the Quran.', body: 'A whole surah, the nineteenth, carries her name.', source: 'Quran 19', moods: ['family', 'parenting'] },
  { id: 'slowly', kind: 'fact', title: 'The Quran was revealed a little at a time, over about 23 years.', body: 'Allah says He sent it down in parts “so you might recite it to the people slowly”. Small and steady was the way from the start.', source: 'Quran 17:106', moods: ['strength', 'guidance'] },
  { id: 'bismillah', kind: 'fact', title: 'Bismillah appears 114 times.', body: 'Surah at-Tawbah is the only surah that doesn’t open with it, and Surah an-Naml has it twice: once at the start, and once in Sulayman’s letter.', source: 'Quran 9 · Quran 27:30' },
  { id: 'debt', kind: 'fact', title: 'The longest ayah is about writing down a loan.', body: 'Ayah 282 of al-Baqarah tells believers to record debts in writing, with witnesses, so nobody is wronged.', source: 'Quran 2:282', moods: ['money'] },
  { id: 'musa', kind: 'fact', title: 'Musa is named in the Quran more than any other prophet.', body: 'His story, from a baby in a basket on the river to standing before Pharaoh, is told across many surahs.', source: 'Quran 20 · Quran 28', moods: ['strength'] },
  { id: 'twentyfive', kind: 'fact', title: '25 prophets are named in the Quran.', body: 'From Adam to Muhammad ﷺ, including Ibrahim, Musa and ʿIsa. The Quran says there were others it does not name.', source: 'Quran 40:78' },
  { id: 'near', kind: 'fact', title: 'Allah is with you when you remember Him.', body: 'In a hadith qudsi, Allah says: “I am as My servant thinks of Me, and I am with him when he remembers Me.”', source: 'Sahih al-Bukhari 7405', moods: ['lonely', 'anxious'] },

  // Myths
  { id: 'm-arabic', kind: 'myth', myth: 'You need to know Arabic before the Quran is for you.', fact: 'The Prophet ﷺ said that someone who reads the Quran and finds it hard gets two rewards.', source: 'Sahih al-Bukhari 4937 · Sahih Muslim 798', moods: ['guidance', 'strength'] },
  { id: 'm-allah', kind: 'myth', myth: '“Allah” is a different God from the God of Jews and Christians.', fact: 'Allah is the Arabic word for God, and Arabic-speaking Christians say it too. The Quran says: “Our God and your God is one.”', source: 'Quran 29:46' },
  { id: 'm-written', kind: 'myth', myth: 'The Quran was written down centuries after the Prophet ﷺ.', fact: 'It was gathered into one book within about two years of his passing, under Abu Bakr. Copies were sent across the Muslim lands under ʿUthman, less than twenty years later.', source: 'Sahih al-Bukhari 4986 · 4987' },
  { id: 'm-kaaba', kind: 'myth', myth: 'Muslims worship the Kaaba.', fact: 'Muslims face the Kaaba so they all pray in one direction, but they worship Allah alone. ʿUmar told the Black Stone: “I know that you are a stone that can neither harm nor benefit.”', source: 'Sahih al-Bukhari 1597' },
  { id: 'm-compulsion', kind: 'myth', myth: 'People are forced to become Muslim.', fact: 'The Quran says: “There shall be no compulsion in religion.” Faith only counts when it is chosen.', source: 'Quran 2:256' },
  { id: 'm-aisha', kind: 'myth', myth: 'Women had no place in Islamic scholarship.', fact: 'ʿAisha, may Allah be pleased with her, narrated over two thousand hadith and taught leading scholars of her time.', source: 'Narrations collected in al-Bukhari and Muslim', moods: ['family', 'marriage'] },
  { id: 'm-tears', kind: 'myth', myth: 'Crying when you lose someone means your iman is weak.', fact: 'The Prophet ﷺ wept when his son Ibrahim died and said: “The eyes shed tears and the heart grieves, but we say only what pleases our Lord.”', source: 'Sahih al-Bukhari 1303', moods: ['grieving'] },
  { id: 'm-forgive', kind: 'myth', myth: 'Some sins are too big for Allah to forgive.', fact: '“Do not despair of the mercy of Allah. Indeed, Allah forgives all sins.” The door stays open for anyone who turns back to Him.', source: 'Quran 39:53', moods: ['forgiveness', 'temptation'] },
  { id: 'm-doctor', kind: 'myth', myth: 'Seeing a doctor shows weak faith.', fact: 'The Prophet ﷺ said: “Allah has not sent down a disease without sending down a cure for it.” Seeking treatment is part of trusting Him.', source: 'Sahih al-Bukhari 5678', moods: ['unwell', 'anxious'] },

  // Words
  { id: 'w-sabr', kind: 'word', ar: 'صَبْر', tl: 'sabr', meaning: 'patience', body: 'From a root meaning to hold firm: staying steady when you want to give up. “Indeed, Allah is with the patient.”', source: 'Quran 2:153', moods: ['strength', 'grieving', 'angry'] },
  { id: 'w-tawakkul', kind: 'word', ar: 'تَوَكُّل', tl: 'tawakkul', meaning: 'trust in Allah', body: 'Doing your part, then leaving the outcome to Allah. “Whoever relies upon Allah, then He is sufficient for him.”', source: 'Quran 65:3', moods: ['anxious', 'money'] },
  { id: 'w-shukr', kind: 'word', ar: 'شُكْر', tl: 'shukr', meaning: 'gratitude', body: '“If you are grateful, I will surely increase you.”', source: 'Quran 14:7', moods: ['grateful'] },
  { id: 'w-rahmah', kind: 'word', ar: 'رَحْمَة', tl: 'raḥmah', meaning: 'mercy', body: 'Ar-Raḥmān and ar-Raḥīm, in every Bismillah, come from the same root as raḥim, the word for a mother’s womb.', source: 'Quran 1:1', moods: ['forgiveness', 'family', 'parenting'] },
  { id: 'w-qalb', kind: 'word', ar: 'قَلْب', tl: 'qalb', meaning: 'heart', body: 'Its root means to turn over. The Prophet ﷺ often prayed: “O Turner of hearts, keep my heart firm on Your religion.”', source: 'Jamiʿ at-Tirmidhi 2140', moods: ['temptation', 'guidance'] },
  { id: 'w-dhikr', kind: 'word', ar: 'ذِكْر', tl: 'dhikr', meaning: 'remembrance', body: '“Unquestionably, by the remembrance of Allah hearts are assured.”', source: 'Quran 13:28', moods: ['anxious', 'lonely'] },
  { id: 'w-tawbah', kind: 'word', ar: 'تَوْبَة', tl: 'tawbah', meaning: 'turning back', body: 'Repentance in Arabic is literally a turning back to Allah. It is the same idea as Munib’s name: one who turns back to Him.', source: 'Quran 50:33', moods: ['forgiveness', 'temptation'] },
  { id: 'w-sakinah', kind: 'word', ar: 'سَكِينَة', tl: 'sakīnah', meaning: 'tranquillity', body: '“It is He who sent down tranquillity into the hearts of the believers.”', source: 'Quran 48:4', moods: ['anxious', 'conflict'] },
  { id: 'w-mawaddah', kind: 'word', ar: 'مَوَدَّة', tl: 'mawaddah', meaning: 'affection', body: 'Allah describes marriage this way: “He placed between you affection and mercy.”', source: 'Quran 30:21', moods: ['marriage'] },
  { id: 'w-birr', kind: 'word', ar: 'بِرّ', tl: 'birr', meaning: 'goodness, especially to parents', body: '“Your Lord has decreed that you worship none but Him, and to parents, good treatment.”', source: 'Quran 17:23', moods: ['family', 'parenting'] },
  { id: 'w-ihsan', kind: 'word', ar: 'إِحْسَان', tl: 'iḥsān', meaning: 'excellence', body: 'The Prophet ﷺ described it as worshipping Allah as if you see Him, and knowing that He sees you.', source: 'Sahih Muslim 8', moods: ['guidance'] },
];

/** Munib's own short videos (hosted on the website, /videos). The end card is trimmed for in-app viewing. */
export type FeedVideo = { id: string; title: string; file: string; seconds: number; moods?: MoodId[]; sources: string };

export const VIDEOS: FeedVideo[] = [
  { id: 'still-scrolling', title: 'Still scrolling at 1:47am', file: 'still-scrolling', seconds: 42, moods: ['anxious', 'lonely', 'temptation'], sources: 'Quran 13:28 · Recitation: Mishary Alafasy' },
  { id: 'attention', title: '47 seconds', file: 'attention', seconds: 52, moods: ['guidance', 'strength'], sources: 'Quran 103:1–3 · Recitation: Mishary Alafasy · Gloria Mark (2023) · Ofcom (2025)' },
  { id: 'firdaus', title: 'What if you reached al-Firdaus?', file: 'firdaus', seconds: 48, moods: ['strength', 'guidance'], sources: 'Quran 18:107–108 · Sahih al-Bukhari 2790, 6464 · Recitation: Mishary Alafasy' },
  { id: 'jannah', title: 'What is Jannah like?', file: 'jannah', seconds: 59, moods: ['grieving', 'strength'], sources: 'Quran 47:15, 56:25–33, 35:34–35, 43:71, 75:22–23, 32:17 · Sahih al-Bukhari 3244 · Recitation: Mishary Alafasy' },
];
