import type { MoodId } from '@/lib/quran';

/**
 * Short cards that break up the For you feed: facts, myths and Arabic words.
 * Every Islamic claim carries its source. Written 9 Nov 2026; needs scholarly review before launch
 * (see CLAUDE.md). Prefer leaving a card out to guessing.
 *
 * `moods`: shown first when the reader has picked one of these moods. No moods = for everyone.
 */
export type Snippet =
  /** `eyebrow` replaces "DID YOU KNOW?" (e.g. "A GENTLE REMINDER"). */
  | { id: string; kind: 'fact'; title: string; body: string; source: string; eyebrow?: string; moods?: MoodId[] }
  | { id: string; kind: 'myth'; myth: string; fact: string; source: string; moods?: MoodId[] }
  /** `eyebrow` replaces "WORD" (e.g. "WHAT DOES IT MEAN?" for everyday Islamic terms). */
  | { id: string; kind: 'word'; ar: string; tl: string; meaning: string; body: string; source: string; eyebrow?: string; moods?: MoodId[] }
  /** A dua to say: Quranic ones use the Mushaf text; hadith ones are typed in and need checking by someone with Arabic. */
  | { id: string; kind: 'dua'; title: string; ar: string; tl: string; meaning: string; source: string; moods?: MoodId[] }
  /** One of the names of Allah, with an ayah (or hadith) where it appears. */
  | { id: string; kind: 'name'; ar: string; tl: string; meaning: string; body: string; source: string; moods?: MoodId[] }
  /** One small action from the Sunnah. */
  | { id: string; kind: 'try'; title: string; body: string; source: string; moods?: MoodId[] }
  /** A question with one clear, well-sourced answer. */
  | { id: string; kind: 'quiz'; q: string; options: string[]; answer: number; why: string; source: string; moods?: MoodId[] }
  /** A prophet's story, or a short series (the five pillars…), told over several cards in a row. `title` replaces "THE STORY OF …". */
  | { id: string; kind: 'story'; who: string; title?: string; parts: StoryPart[]; moods?: MoodId[] }
  /** A letter of the Arabic alphabet: how to say it, and a word from a short ayah that uses it (tap to hear the ayah). */
  | { id: string; kind: 'letter'; n: number; letter: string; name: string; sound: string; word: string; wordTl: string; meaning: string; s: number; a: number; ayah: string; moods?: MoodId[] }
  /**
   * Words of the scholars: a short saying with who said it, who they were, and the book it comes from.
   * Only add quotes with a book reference, checked against the book (social media accounts often paraphrase).
   */
  | { id: string; kind: 'quote'; who: string; honorific?: string; about: string; text: string; source: string; check?: boolean; moods?: MoodId[] }
  /** One short ayah recited by three reciters, one after another. */
  | { id: string; kind: 'reciters'; s: number; a: number; ar: string; en: string; moods?: MoodId[] };

export type StoryPart = { heading?: string; text: string; source: string };

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

  // Words of the scholars
  {
    id: 'q-ibnqayyim-shadows',
    kind: 'quote',
    who: 'Ibn al-Qayyim',
    honorific: 'رحمه الله',
    about: 'Scholar of 14th-century Damascus, known for his writing on the heart',
    text: 'One of the signs of someone who truly knows Allah is that they don’t grieve over what they lose, nor become overly happy with what they gain. This is because they see everything as temporary and fading away, like shadows.',
    source: 'Madarij al-Salikin 3/318',
    check: true,
    moods: ['money', 'strength'],
  },
  // All found with a book reference (Nov 2026); every one still to be checked against the book by a scholar.
  { id: 'q-abubakr-alive', kind: 'quote', who: 'Abu Bakr al-Siddiq', honorific: 'رضي الله عنه', about: 'Closest companion of the Prophet ﷺ and the first caliph', text: 'Whoever worshipped Muhammad, Muhammad has died. And whoever worships Allah, Allah is alive and never dies.', source: 'Sahih al-Bukhari 3668 (on the day the Prophet ﷺ died)', check: true, moods: ['grieving', 'strength', 'newmuslim'] },
  { id: 'q-umar-account', kind: 'quote', who: 'Umar ibn al-Khattab', honorific: 'رضي الله عنه', about: 'Companion of the Prophet ﷺ and the second caliph', text: 'Take account of yourselves before you are taken to account, and weigh your deeds before they are weighed for you.', source: 'Jamiʿ al-Tirmidhi, after 2459 · al-Zuhd of Imam Ahmad 633', check: true, moods: ['forgiveness', 'guidance'] },
  { id: 'q-umar-honour', kind: 'quote', who: 'Umar ibn al-Khattab', honorific: 'رضي الله عنه', about: 'Companion of the Prophet ﷺ and the second caliph', text: 'We were the most humbled of people, and Allah honoured us with Islam. If we ever seek honour in anything else, Allah will humble us.', source: 'al-Mustadrak of al-Hakim 1/62', check: true, moods: ['strength', 'newmuslim'] },
  { id: 'q-umar-patience', kind: 'quote', who: 'Umar ibn al-Khattab', honorific: 'رضي الله عنه', about: 'Companion of the Prophet ﷺ and the second caliph', text: 'The best days we ever knew, we reached through patience. If patience were a man, he would be a noble one.', source: 'al-Sabr wal-Thawab of Ibn Abi al-Dunya, no. 6', check: true, moods: ['strength', 'unwell', 'grieving'] },
  { id: 'q-uthman-hearts', kind: 'quote', who: 'Uthman ibn Affan', honorific: 'رضي الله عنه', about: 'Companion of the Prophet ﷺ and the third caliph, who gathered the Quran into one book', text: 'If our hearts were pure, they would never have enough of the speech of Allah.', source: 'Shuʿab al-Iman of al-Bayhaqi 2031 · Hilyat al-Awliya 7/272', check: true, moods: ['guidance'] },
  { id: 'q-ali-travelling', kind: 'quote', who: 'Ali ibn Abi Talib', honorific: 'رضي الله عنه', about: 'Cousin of the Prophet ﷺ and the fourth caliph', text: 'This world is travelling away, and the Hereafter is travelling towards us, and each has its children. Be children of the Hereafter, not of this world. Today there is action and no reckoning; tomorrow there is reckoning and no action.', source: 'Sahih al-Bukhari, before 6417 (without a chain) · Musannaf Ibn Abi Shaybah 35636', check: true, moods: ['guidance', 'money'] },
  { id: 'q-ali-patience', kind: 'quote', who: 'Ali ibn Abi Talib', honorific: 'رضي الله عنه', about: 'Cousin of the Prophet ﷺ and the fourth caliph', text: 'Patience is to faith what the head is to the body. Cut off the head and the body dies. There is no faith for someone who has no patience.', source: 'al-Sabr wal-Thawab of Ibn Abi al-Dunya, no. 8', check: true, moods: ['strength', 'unwell', 'angry'] },
  { id: 'q-ibnmasud-feast', kind: 'quote', who: 'Abdullah ibn Masʿud', honorific: 'رضي الله عنه', about: 'Companion of the Prophet ﷺ and one of the great teachers of the Quran', text: 'This Quran is the banquet of Allah, so take from it what you can. A heart with nothing of the Book of Allah in it is like a ruined house that no one lives in.', source: 'Sunan al-Darimi 3350', check: true, moods: ['guidance', 'lonely'] },
  { id: 'q-ibnmasud-recite', kind: 'quote', who: 'Abdullah ibn Masʿud', honorific: 'رضي الله عنه', about: 'Companion of the Prophet ﷺ and one of the great teachers of the Quran', text: 'Don’t rush through it like poetry or scatter it like dry dates. Stop at its wonders and let it move your heart. Don’t let your only concern be reaching the end of the surah.', source: 'Shuʿab al-Iman of al-Bayhaqi 1883', check: true, moods: ['guidance', 'anxious'] },
  { id: 'q-abudarda-polish', kind: 'quote', who: 'Abu al-Darda', honorific: 'رضي الله عنه', about: 'Companion of the Prophet ﷺ, remembered for his wisdom and worship', text: 'Everything has a polish, and the polish of the heart is the remembrance of Allah.', source: 'Shuʿab al-Iman of al-Bayhaqi 503', check: true, moods: ['anxious', 'lonely', 'forgiveness'] },
  { id: 'q-abudarda-peak', kind: 'quote', who: 'Abu al-Darda', honorific: 'رضي الله عنه', about: 'Companion of the Prophet ﷺ, remembered for his wisdom and worship', text: 'The peak of faith is four things: patience with the judgement of Allah, contentment with His decree, sincere trust in Him, and surrender to your Lord.', source: 'Sharh Usul Iʿtiqad Ahl al-Sunnah of al-Lalakaʾi, no. 1697', check: true, moods: ['strength', 'grieving', 'unwell'] },
  { id: 'q-abudarda-reflect', kind: 'quote', who: 'Umm al-Darda', honorific: 'رضي الله عنها', about: 'Wife of Abu al-Darda, a scholar of the generation after the Companions', text: 'Someone asked her which act of worship Abu al-Darda did most. She said: “Reflection, and taking lessons.”', source: 'al-Zuhd of Ibn al-Mubarak (riwayah of al-Marwazi), no. 286', check: true, moods: ['grateful', 'guidance'] },
  { id: 'q-hasan-days', kind: 'quote', who: 'al-Hasan al-Basri', honorific: 'رحمه الله', about: 'Scholar and preacher of 1st-century Basra, from the generation after the Companions', text: 'Son of Adam, you are nothing but a number of days. Whenever a day goes, a part of you goes with it.', source: 'Hilyat al-Awliya 2/148 · al-Zuhd of Imam Ahmad 1586', check: true, moods: ['guidance', 'forgiveness'] },
  { id: 'q-fudayl-sincere', kind: 'quote', who: 'al-Fudayl ibn ʿIyad', honorific: 'رحمه الله', about: 'Scholar of 2nd-century Makkah, who turned to Allah after a life of highway robbery', text: 'A deed is only accepted when it is sincere and correct. Sincere means it is for Allah alone. Correct means it follows the Sunnah.', source: 'Iʿlam al-Muwaqqiʿin of Ibn al-Qayyim 3/124, on Quran 18:110', check: true, moods: ['guidance', 'newmuslim'] },
  { id: 'q-umaraziz-private', kind: 'quote', who: 'Umar ibn Abd al-Aziz', honorific: 'رحمه الله', about: 'Caliph of the 1st century, remembered for his justice', text: 'Take care of your Hereafter, and Allah will take care of your life in this world. Take care of your private life, and Allah will take care of your public life.', source: 'al-Ikhlas wal-Niyyah of Ibn Abi al-Dunya, no. 50', check: true, moods: ['temptation', 'money'] },
  { id: 'q-umaraziz-blessings', kind: 'quote', who: 'Umar ibn Abd al-Aziz', honorific: 'رحمه الله', about: 'Caliph of the 1st century, remembered for his justice', text: 'Thinking about the blessings of Allah is one of the best acts of worship.', source: 'Tafsir Ibn Kathir, on Quran 3:190', check: true, moods: ['grateful'] },
  { id: 'q-ibnqayyim-void', kind: 'quote', who: 'Ibn al-Qayyim', honorific: 'رحمه الله', about: 'Scholar of 14th-century Damascus, known for his writing on the heart', text: 'In the heart there is an emptiness that nothing can fill except loving Allah, turning to Him, remembering Him always and being sincere to Him.', source: 'Madarij al-Salikin 3/156', check: true, moods: ['lonely', 'anxious', 'temptation'] },
  { id: 'q-ibnqayyim-quran', kind: 'quote', who: 'Ibn al-Qayyim', honorific: 'رحمه الله', about: 'Scholar of 14th-century Damascus, known for his writing on the heart', text: 'If you want to benefit from the Quran, gather your heart when you recite it and listen closely, as someone would who is being spoken to by Allah Himself.', source: 'al-Fawaʾid, opening chapter', check: true, moods: ['guidance'] },

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

  // Duas
  { id: 'd-worry', kind: 'dua', title: 'When worry won’t leave you', ar: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ، وَغَلَبَةِ الرِّجَالِ', tl: 'Allāhumma innī aʿūdhu bika minal-hammi wal-ḥazan, wal-ʿajzi wal-kasal, wal-bukhli wal-jubn, wa ḍalaʿid-dayni wa ghalabatir-rijāl', meaning: 'O Allah, I seek refuge in You from worry and grief, from helplessness and laziness, from miserliness and cowardice, from the burden of debt and from being overpowered by others.', source: 'Sahih al-Bukhari 6369', moods: ['anxious', 'money', 'grieving'] },
  { id: 'd-yunus', kind: 'dua', title: 'The dua of Yunus, from inside the whale', ar: 'لَّآ إِلَٰهَ إِلَّآ أَنتَ سُبۡحَٰنَكَ إِنِّي كُنتُ مِنَ ٱلظَّـٰلِمِينَ', tl: 'Lā ilāha illā anta, subḥānaka, innī kuntu minaẓ-ẓālimīn', meaning: 'There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.', source: 'Quran 21:87 · Jamiʿ at-Tirmidhi 3505', moods: ['anxious', 'forgiveness'] },
  { id: 'd-istighfar', kind: 'dua', title: 'The best way to ask forgiveness', ar: 'اللَّهُمَّ أَنْتَ رَبِّي، لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي، فَاغْفِرْ لِي، فَإِنَّهُ لاَ يَغْفِرُ الذُّنُوبَ إِلاَّ أَنْتَ', tl: 'Allāhumma anta rabbī, lā ilāha illā ant. Khalaqtanī wa ana ʿabduk, wa ana ʿalā ʿahdika wa waʿdika mastaṭaʿt. Aʿūdhu bika min sharri mā ṣanaʿt. Abū’u laka bi niʿmatika ʿalayy, wa abū’u laka bi dhanbī, faghfir lī, fa innahu lā yaghfirudh-dhunūba illā ant', meaning: 'O Allah, You are my Lord; there is no god but You. You created me and I am Your servant, and I keep Your covenant and promise as best I can. I seek refuge in You from the evil I have done. I acknowledge Your blessings upon me, and I acknowledge my sin, so forgive me, for none forgives sins but You.', source: 'Sahih al-Bukhari 6306', moods: ['forgiveness', 'temptation'] },
  { id: 'd-atina', kind: 'dua', title: 'The dua the Prophet ﷺ made most often', ar: 'رَبَّنَآ ءَاتِنَا فِي ٱلدُّنۡيَا حَسَنَةٗ وَفِي ٱلۡأٓخِرَةِ حَسَنَةٗ وَقِنَا عَذَابَ ٱلنَّارِ', tl: 'Rabbanā ātinā fid-dunyā ḥasanatan wa fil-ākhirati ḥasanatan wa qinā ʿadhāban-nār', meaning: 'Our Lord, give us in this world that which is good and in the Hereafter that which is good, and protect us from the punishment of the Fire.', source: 'Quran 2:201 · Sahih al-Bukhari 6389' },
  { id: 'd-ilm', kind: 'dua', title: 'For learning', ar: 'رَّبِّ زِدۡنِي عِلۡمٗا', tl: 'Rabbi zidnī ʿilmā', meaning: 'My Lord, increase me in knowledge.', source: 'Quran 20:114', moods: ['guidance'] },
  { id: 'd-musa', kind: 'dua', title: 'Before something hard', ar: 'رَبِّ ٱشۡرَحۡ لِي صَدۡرِي وَيَسِّرۡ لِيٓ أَمۡرِي وَٱحۡلُلۡ عُقۡدَةٗ مِّن لِّسَانِي يَفۡقَهُواْ قَوۡلِي', tl: 'Rabbish-raḥ lī ṣadrī, wa yassir lī amrī, waḥlul ʿuqdatan min lisānī, yafqahū qawlī', meaning: 'My Lord, expand for me my breast, and ease for me my task, and untie the knot from my tongue, that they may understand my speech. (Musa’s dua before facing Pharaoh.)', source: 'Quran 20:25–28', moods: ['anxious', 'strength'] },
  { id: 'd-parents', kind: 'dua', title: 'For your parents', ar: 'رَّبِّ ٱرۡحَمۡهُمَا كَمَا رَبَّيَانِي صَغِيرٗا', tl: 'Rabbir-ḥamhumā kamā rabbayānī ṣaghīrā', meaning: 'My Lord, have mercy upon them as they brought me up when I was small.', source: 'Quran 17:24', moods: ['family', 'grieving'] },
  { id: 'd-family', kind: 'dua', title: 'For your spouse and children', ar: 'رَبَّنَا هَبۡ لَنَا مِنۡ أَزۡوَٰجِنَا وَذُرِّيَّـٰتِنَا قُرَّةَ أَعۡيُنٖ وَٱجۡعَلۡنَا لِلۡمُتَّقِينَ إِمَامًا', tl: 'Rabbanā hab lanā min azwājinā wa dhurriyyātinā qurrata aʿyunin wajʿalnā lil-muttaqīna imāmā', meaning: 'Our Lord, grant us from among our spouses and offspring comfort to our eyes, and make us an example for the righteous.', source: 'Quran 25:74', moods: ['marriage', 'parenting'] },
  { id: 'd-zakariyya', kind: 'dua', title: 'Zakariyya’s dua for a child', ar: 'رَبِّ لَا تَذَرۡنِي فَرۡدٗا وَأَنتَ خَيۡرُ ٱلۡوَٰرِثِينَ', tl: 'Rabbi lā tadharnī fardan wa anta khayrul-wārithīn', meaning: 'My Lord, do not leave me alone (with no heir), while You are the best of inheritors.', source: 'Quran 21:89', moods: ['marriage', 'parenting'] },
  { id: 'd-loss', kind: 'dua', title: 'When you lose something', ar: 'إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ، اللَّهُمَّ أْجُرْنِي فِي مُصِيبَتِي وَأَخْلِفْ لِي خَيْرًا مِنْهَا', tl: 'Innā lillāhi wa innā ilayhi rājiʿūn. Allāhumma’jurnī fī muṣībatī wa akhlif lī khayran minhā', meaning: 'We belong to Allah and to Him we return. O Allah, reward me in my loss and replace it for me with something better.', source: 'Sahih Muslim 918 · Quran 2:156', moods: ['grieving', 'divorce'] },
  { id: 'd-heal', kind: 'dua', title: 'For someone who is ill', ar: 'أَذْهِبِ الْبَاسَ رَبَّ النَّاسِ، اشْفِ وَأَنْتَ الشَّافِي، لاَ شِفَاءَ إِلاَّ شِفَاؤُكَ، شِفَاءً لاَ يُغَادِرُ سَقَمًا', tl: 'Adh-hibil-ba’s, rabban-nās, ishfi wa antash-shāfī, lā shifā’a illā shifā’uk, shifā’an lā yughādiru saqamā', meaning: 'Remove the harm, Lord of mankind, and heal, for You are the Healer. There is no healing but Your healing, a healing that leaves no illness behind.', source: 'Sahih al-Bukhari 5743', moods: ['unwell'] },
  { id: 'd-rizq', kind: 'dua', title: 'When money is tight', ar: 'اللَّهُمَّ اكْفِنِي بِحَلاَلِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ', tl: 'Allāhummakfinī bi ḥalālika ʿan ḥarāmik, wa aghninī bi faḍlika ʿamman siwāk', meaning: 'O Allah, let what is lawful be enough for me instead of what is unlawful, and by Your bounty make me need no one but You.', source: 'Jamiʿ at-Tirmidhi 3563', moods: ['money'] },
  { id: 'd-anger', kind: 'dua', title: 'When you feel the anger rising', ar: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ', tl: 'Aʿūdhu billāhi minash-shayṭānir-rajīm', meaning: 'I seek refuge in Allah from Satan, the accursed. The Prophet ﷺ said that if an angry man said this, his anger would leave him.', source: 'Sahih al-Bukhari 3282', moods: ['angry', 'conflict'] },
  { id: 'd-heart', kind: 'dua', title: 'To keep your heart steady', ar: 'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ', tl: 'Yā muqallibal-qulūb, thabbit qalbī ʿalā dīnik', meaning: 'O Turner of hearts, keep my heart firm on Your religion.', source: 'Jamiʿ at-Tirmidhi 2140', moods: ['temptation', 'guidance'] },
  { id: 'd-shukr', kind: 'dua', title: 'To be grateful', ar: 'رَبِّ أَوۡزِعۡنِيٓ أَنۡ أَشۡكُرَ نِعۡمَتَكَ ٱلَّتِيٓ أَنۡعَمۡتَ عَلَيَّ وَعَلَىٰ وَٰلِدَيَّ وَأَنۡ أَعۡمَلَ صَٰلِحٗا تَرۡضَىٰهُ', tl: 'Rabbi awziʿnī an ashkura niʿmatakal-latī anʿamta ʿalayya wa ʿalā wālidayya wa an aʿmala ṣāliḥan tarḍāh', meaning: 'My Lord, enable me to be grateful for Your favour which You have bestowed upon me and upon my parents, and to do righteousness of which You approve.', source: 'Quran 27:19', moods: ['grateful'] },
  { id: 'd-ukhuwwah', kind: 'dua', title: 'When there’s bad feeling between people', ar: 'رَبَّنَا ٱغۡفِرۡ لَنَا وَلِإِخۡوَٰنِنَا ٱلَّذِينَ سَبَقُونَا بِٱلۡإِيمَٰنِ وَلَا تَجۡعَلۡ فِي قُلُوبِنَا غِلّٗا لِّلَّذِينَ ءَامَنُواْ', tl: 'Rabbanaghfir lanā wa li ikhwāninal-ladhīna sabaqūnā bil-īmān, wa lā tajʿal fī qulūbinā ghillan lil-ladhīna āmanū', meaning: 'Our Lord, forgive us and our brothers who came before us in faith, and put no resentment in our hearts toward those who have believed.', source: 'Quran 59:10', moods: ['conflict', 'family'] },

  // Names of Allah
  { id: 'n-razzaq', kind: 'name', ar: 'الرَّزَّاق', tl: 'Ar-Razzāq', meaning: 'The Provider', body: '“Indeed, it is Allah who is the continual Provider, the firm possessor of strength.”', source: 'Quran 51:58', moods: ['money'] },
  { id: 'n-wadud', kind: 'name', ar: 'الْوَدُود', tl: 'Al-Wadūd', meaning: 'The Loving', body: '“And He is the Forgiving, the Affectionate.” His love is not earned by being perfect.', source: 'Quran 85:14', moods: ['lonely', 'marriage'] },
  { id: 'n-ghafur', kind: 'name', ar: 'الْغَفُور', tl: 'Al-Ghafūr', meaning: 'The Forgiving', body: '“Do not despair of the mercy of Allah. Indeed, Allah forgives all sins.”', source: 'Quran 39:53', moods: ['forgiveness'] },
  { id: 'n-qarib', kind: 'name', ar: 'الْقَرِيب', tl: 'Al-Qarīb', meaning: 'The Near', body: '“When My servants ask you concerning Me, indeed I am near. I respond to the call of the caller when he calls upon Me.”', source: 'Quran 2:186 · Quran 11:61', moods: ['lonely', 'anxious'] },
  { id: 'n-wakil', kind: 'name', ar: 'الْوَكِيل', tl: 'Al-Wakīl', meaning: 'The One you can rely on', body: '“Sufficient for us is Allah, and He is the best Disposer of affairs.”', source: 'Quran 3:173', moods: ['anxious', 'money'] },
  { id: 'n-shafi', kind: 'name', ar: 'الشَّافِي', tl: 'Ash-Shāfī', meaning: 'The Healer', body: 'The Prophet ﷺ prayed for the sick: “Heal, for You are the Healer. There is no healing but Your healing.”', source: 'Sahih al-Bukhari 5743', moods: ['unwell'] },
  { id: 'n-halim', kind: 'name', ar: 'الْحَلِيم', tl: 'Al-Ḥalīm', meaning: 'The Forbearing', body: 'He sees our mistakes and does not rush to punish. “And Allah is Forgiving and Forbearing.”', source: 'Quran 2:225', moods: ['angry', 'conflict'] },
  { id: 'n-hadi', kind: 'name', ar: 'الْهَادِي', tl: 'Al-Hādī', meaning: 'The Guide', body: '“But sufficient is your Lord as a guide and a helper.”', source: 'Quran 25:31', moods: ['guidance'] },
  { id: 'n-salam', kind: 'name', ar: 'السَّلَام', tl: 'As-Salām', meaning: 'The Source of Peace', body: 'One of the names in the last ayat of al-Hashr: “the Sovereign, the Pure, the Perfection (as-Salām)…”', source: 'Quran 59:23', moods: ['conflict', 'anxious'] },
  { id: 'n-shakur', kind: 'name', ar: 'الشَّكُور', tl: 'Ash-Shakūr', meaning: 'The Appreciative', body: 'He rewards even small good deeds generously. “Indeed, He is Forgiving and Appreciative.”', source: 'Quran 35:30', moods: ['grateful'] },
  { id: 'n-latif', kind: 'name', ar: 'اللَّطِيف', tl: 'Al-Laṭīf', meaning: 'The Subtle, the Gentle', body: 'He takes care of His servants in ways they don’t always see. “Allah is Subtle with His servants.”', source: 'Quran 42:19', moods: ['grieving', 'anxious'] },
  { id: 'n-rahman', kind: 'name', ar: 'الرَّحْمَٰن', tl: 'Ar-Raḥmān', meaning: 'The Most Merciful', body: 'The name you say in every Bismillah. Every surah but one opens with His mercy.', source: 'Quran 1:1' },

  // Try this today
  { id: 't-tasbih', kind: 'try', title: 'After your next prayer, say SubhanAllah, Alhamdulillah and Allahu Akbar 33 times each.', body: 'The Prophet ﷺ taught this to the poor of Madinah, who felt they couldn’t match the charity of the rich.', source: 'Sahih Muslim 595 · 597', moods: ['grateful', 'money'] },
  { id: 't-smile', kind: 'try', title: 'Smile at someone today.', body: 'The Prophet ﷺ said: “Your smiling in the face of your brother is charity.”', source: 'Jamiʿ at-Tirmidhi 1956', moods: ['lonely', 'conflict'] },
  { id: 't-bismillah', kind: 'try', title: 'Say Bismillah before you eat, and eat with your right hand.', body: 'The Prophet ﷺ taught this to a boy at his table: “Mention the name of Allah, eat with your right hand, and eat from what is in front of you.”', source: 'Sahih al-Bukhari 5376', moods: ['parenting'] },
  { id: 't-salam', kind: 'try', title: 'Say salam to someone you don’t know.', body: 'Asked what in Islam is best, the Prophet ﷺ said: to feed people, and to greet those you know and those you don’t.', source: 'Sahih al-Bukhari 12', moods: ['lonely'] },
  { id: 't-path', kind: 'try', title: 'Move something out of someone’s way.', body: 'The Prophet ﷺ said removing something harmful from the road is a branch of faith.', source: 'Sahih Muslim 35' },
  { id: 't-secret', kind: 'try', title: 'Make dua for someone without telling them.', body: 'The Prophet ﷺ said an angel replies: “And for you the same.”', source: 'Sahih Muslim 2732', moods: ['conflict', 'family', 'lonely'] },
  { id: 't-kin', kind: 'try', title: 'Call a relative you haven’t spoken to in a while.', body: 'The Prophet ﷺ said whoever wants their provision increased and their life extended should keep ties with their relatives.', source: 'Sahih al-Bukhari 5986', moods: ['family', 'money'] },
  { id: 't-wudu', kind: 'try', title: 'Make wudu before you sleep tonight.', body: 'The Prophet ﷺ told a companion: when you go to bed, make wudu as you would for prayer.', source: 'Sahih al-Bukhari 247', moods: ['anxious'] },
  { id: 't-sit', kind: 'try', title: 'If you get angry while standing, sit down.', body: 'The Prophet ﷺ said: if anger passes, good; if not, lie down.', source: 'Sunan Abi Dawud 4782', moods: ['angry'] },
  { id: 't-visit', kind: 'try', title: 'Visit or message someone who is unwell.', body: 'The Prophet ﷺ said that whoever visits a sick person is in the harvest of Paradise until he returns.', source: 'Sahih Muslim 2568', moods: ['unwell'] },

  // Quizzes
  { id: 'q-bismillah', kind: 'quiz', q: 'Which surah doesn’t begin with Bismillah?', options: ['Al-Fatihah', 'At-Tawbah', 'Al-Ikhlas', 'Ya-Sin'], answer: 1, why: 'Surah at-Tawbah, the ninth surah, is the only one without it.', source: 'Quran 9' },
  { id: 'q-count', kind: 'quiz', q: 'How many surahs are in the Quran?', options: ['99', '114', '120', '286'], answer: 1, why: '114 surahs, from al-Fatihah to an-Nas.', source: 'The Mushaf' },
  { id: 'q-third', kind: 'quiz', q: 'Which surah did the Prophet ﷺ say equals a third of the Quran?', options: ['Al-Ikhlas', 'Al-Kahf', 'Al-Mulk', 'Ar-Rahman'], answer: 0, why: 'Surah al-Ikhlas: four ayat about who Allah is.', source: 'Sahih al-Bukhari 5013' },
  { id: 'q-first', kind: 'quiz', q: 'What was the first word revealed?', options: ['Bismillah', 'Iqraʾ (“Read”)', 'Alhamdulillah', 'Qul (“Say”)'], answer: 1, why: '“Read in the name of your Lord who created.” Revealed in the cave of Hira.', source: 'Quran 96:1 · Sahih al-Bukhari 3' },
  { id: 'q-maryam', kind: 'quiz', q: 'Which woman has a surah named after her?', options: ['Khadijah', 'Asiyah', 'Maryam', 'Hajar'], answer: 2, why: 'Surah Maryam, the nineteenth surah. She is the only woman named in the Quran.', source: 'Quran 19' },
  { id: 'q-longest', kind: 'quiz', q: 'Which is the longest surah?', options: ['Al-Baqarah', 'Al-Imran', 'An-Nisa', 'Al-Kahf'], answer: 0, why: 'Al-Baqarah, with 286 ayat.', source: 'Quran 2' },
  { id: 'q-whale', kind: 'quiz', q: 'Which prophet called out to Allah from inside a whale?', options: ['Nuh', 'Musa', 'Yunus', 'Yusuf'], answer: 2, why: 'Yunus: “There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.”', source: 'Quran 21:87', moods: ['anxious'] },
  { id: 'q-kursi', kind: 'quiz', q: 'Which is the greatest ayah in the Quran?', options: ['Ayat al-Kursi', 'The last ayah of al-Baqarah', 'The first ayah of al-Fatihah', 'The light verse'], answer: 0, why: 'Ayat al-Kursi (2:255), as Ubayy ibn Kaʿb answered and the Prophet ﷺ confirmed.', source: 'Sahih Muslim 810' },
  { id: 'q-fatihah', kind: 'quiz', q: 'Which surah is recited in every unit of prayer?', options: ['Al-Ikhlas', 'Al-Fatihah', 'Al-Asr', 'An-Nas'], answer: 1, why: 'The Prophet ﷺ said there is no prayer without al-Fatihah.', source: 'Sahih al-Bukhari 756' },
  { id: 'q-city', kind: 'quiz', q: 'Near which city did the revelation begin?', options: ['Madinah', 'Jerusalem', 'Makkah', 'Taʾif'], answer: 2, why: 'In the cave of Hira, on a mountain near Makkah.', source: 'Sahih al-Bukhari 3' },

  // Stories in three cards
  { id: 's-yunus', kind: 'story', who: 'Yunus', moods: ['anxious', 'forgiveness'], parts: [
    { text: 'Yunus left his people in anger, before Allah allowed him to, and boarded a crowded ship.', source: 'Quran 21:87 · 37:139–140' },
    { text: 'Swallowed by a whale, in darkness upon darkness, he called out: “There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.”', source: 'Quran 21:87' },
    { text: '“So We responded to him and saved him from the distress. And thus do We save the believers.” No darkness is too deep to call out from.', source: 'Quran 21:88' },
  ] },
  { id: 's-yusuf', kind: 'story', who: 'Yusuf', moods: ['family', 'conflict'], parts: [
    { text: 'Yusuf’s brothers were jealous of their father’s love for him. They threw him into the bottom of a well.', source: 'Quran 12:8–15' },
    { text: 'Sold as a slave, falsely accused and jailed for years, he stayed patient and kept his faith.', source: 'Quran 12:20–42' },
    { text: 'Years later, as a minister of Egypt, he met his brothers again and said: “No blame will there be upon you today. Allah will forgive you.”', source: 'Quran 12:92' },
  ] },
  { id: 's-ayyub', kind: 'story', who: 'Ayyub', moods: ['unwell', 'strength'], parts: [
    { text: 'Ayyub was tested with long illness and with the loss of his family.', source: 'Quran 21:83–84' },
    { text: 'He called to his Lord: “Indeed, adversity has touched me, and You are the Most Merciful of the merciful.”', source: 'Quran 21:83' },
    { text: 'Allah removed his hardship and gave him back his family and more. “Indeed, We found him patient, an excellent servant.”', source: 'Quran 21:84 · 38:44' },
  ] },
  { id: 's-musa-mother', kind: 'story', who: 'The mother of Musa', moods: ['parenting', 'anxious'], parts: [
    { text: 'Pharaoh was killing the newborn sons of the Children of Israel. Then Musa was born.', source: 'Quran 28:4' },
    { text: 'Allah inspired his mother: “When you fear for him, cast him into the river, and do not fear and do not grieve. Indeed, We will return him to you.”', source: 'Quran 28:7' },
    { text: 'Pharaoh’s own household found the baby, and Musa was returned to his mother, “that she might be content and not grieve.”', source: 'Quran 28:13' },
  ] },
  { id: 's-ibrahim', kind: 'story', who: 'Ibrahim', moods: ['strength'], parts: [
    { text: 'Ibrahim told his people their idols could neither hear nor help them, and broke them.', source: 'Quran 21:52–58 · 26:72–73' },
    { text: 'They said: “Burn him and support your gods.” And they threw him into a fire.', source: 'Quran 21:68' },
    { text: 'Allah said: “O fire, be coolness and safety upon Ibrahim.”', source: 'Quran 21:69' },
  ] },

  // For new Muslims (10 Nov 2026). Series are told over several cards in a row.
  { id: 'x-pillars', kind: 'story', who: 'The five pillars', title: 'THE FIVE PILLARS OF ISLAM', moods: ['newmuslim', 'guidance'], parts: [
    { heading: 'Shahada · the declaration', text: '“There is no god but Allah, and Muhammad is the Messenger of Allah.” Believing this and saying it is how a person becomes Muslim. It is the first of five pillars Islam is built on.', source: 'Sahih al-Bukhari 8 · Sahih Muslim 16' },
    { heading: 'Salah · prayer', text: 'Five prayers a day: Fajr at dawn, Dhuhr after midday, Asr in the afternoon, Maghrib at sunset and Isha at night. A few minutes each, facing the Kaaba in Makkah. “Indeed, prayer prohibits immorality and wrongdoing.”', source: 'Quran 29:45' },
    { heading: 'Zakat · giving', text: 'Once a year, a Muslim with savings above a set minimum gives a small share, usually 2.5%, to people in need. Zakat means purification: “Take from their wealth a charity by which you purify them.”', source: 'Quran 9:103 · 9:60' },
    { heading: 'Sawm · fasting', text: 'In Ramadan, Muslims fast from dawn until sunset: no food or drink, and extra care with words and deeds. “Fasting has been prescribed for you… that you may become mindful of Allah.”', source: 'Quran 2:183' },
    { heading: 'Hajj · pilgrimage', text: 'Once in a lifetime, for those who are able, Muslims travel to Makkah for Hajj, joining millions from every nation who stand together as equals before Allah.', source: 'Quran 3:97' },
  ] },
  { id: 'x-iman', kind: 'story', who: 'The six articles of faith', title: 'THE SIX ARTICLES OF FAITH', moods: ['newmuslim', 'guidance'], parts: [
    { heading: 'Allah', text: 'Iman, faith, has six parts. The first is belief in Allah: one God, with no partner and nothing like Him. “Say, He is Allah, who is One.”', source: 'Sahih Muslim 8 · Quran 112:1–4' },
    { heading: 'The angels', text: 'Angels are created by Allah from light, and they obey Him. Jibril is the angel who brought the Quran to the Prophet ﷺ.', source: 'Sahih Muslim 2996 · Quran 2:97' },
    { heading: 'The books', text: 'Allah sent revealed books: the Torah to Musa, the Psalms to Dawud, the Gospel to ʿIsa, and the Quran to Muhammad ﷺ, the last of them.', source: 'Quran 3:3–4 · 4:163' },
    { heading: 'The messengers', text: 'Allah sent messengers to every nation, among them Adam, Nuh, Ibrahim, Musa and ʿIsa. Muslims believe in them all, and Muhammad ﷺ is the final one.', source: 'Quran 16:36 · 2:136 · 33:40' },
    { heading: 'The Last Day', text: 'This life will end, and everyone will be brought back to account for what they did. “Whoever does an atom’s weight of good will see it.”', source: 'Quran 99:7–8' },
    { heading: 'Qadr · Allah’s decree', text: 'Nothing happens outside Allah’s knowledge and will, the easy and the hard. Knowing this is a comfort, “so that you not despair over what has eluded you, nor exult over what He has given you.”', source: 'Sahih Muslim 8 · Quran 54:49 · 57:22–23' },
  ] },
  { id: 'x-prophet', kind: 'story', who: 'The Prophet Muhammad ﷺ', title: 'THE LIFE OF THE PROPHET', moods: ['newmuslim'], parts: [
    { text: 'Muhammad ﷺ was born in Makkah around 570 CE. He lost his father before he was born and his mother as a young child, and grew up known as al-Amin, the trustworthy.', source: 'Quran 93:6 · Ibn Hisham, as-Sirah' },
    { text: 'At forty, in the cave of Hira, the angel Jibril brought him the first revelation: “Read in the name of your Lord who created.”', source: 'Sahih al-Bukhari 3 · Quran 96:1' },
    { text: 'For thirteen years he called the people of Makkah to worship Allah alone. Many believed, and many of them were persecuted for it.', source: 'Ibn Hisham, as-Sirah' },
    { text: 'In 622 CE he migrated to Madinah. This journey, the Hijrah, is where the Islamic calendar begins.', source: 'Quran 9:40' },
    { text: 'He returned to Makkah in peace, forgave those who had fought him, and passed away in Madinah in 632 CE, aged 63. Allah calls him “a mercy to the worlds.”', source: 'Sahih al-Bukhari 3536 · Quran 21:107' },
  ] },
  { id: 'x-steps', kind: 'story', who: 'Your first steps', title: 'YOUR FIRST STEPS', moods: ['newmuslim'], parts: [
    { heading: 'Wudu · washing for prayer', text: 'Before praying, Muslims wash in a set way called wudu: hands, mouth and nose, face, arms to the elbows, wiping the head, then the feet. The Quran describes its heart.', source: 'Quran 5:6' },
    { heading: 'Salah · how prayer looks', text: 'Prayer is standing, bowing, prostrating and sitting, while reciting al-Fatihah and remembering Allah. The Prophet ﷺ said: “Pray as you have seen me pray.”', source: 'Sahih al-Bukhari 631' },
    { heading: 'Learn it with others', text: 'Nobody learns this from a card. Your local mosque will be glad to show you, step by step. Take it one prayer at a time: “Make things easy, and do not make them difficult.”', source: 'Sahih al-Bukhari 69' },
  ] },

  // A gentle reminder (for anyone who feels new, behind or overwhelmed)
  { id: 'g-wipe', kind: 'fact', eyebrow: 'A GENTLE REMINDER', title: 'Becoming Muslim wipes the slate clean.', body: 'ʿAmr ibn al-ʿAs was worried about his past when he accepted Islam. The Prophet ﷺ told him: “Do you not know that Islam wipes out what came before it?”', source: 'Sahih Muslim 121', moods: ['newmuslim', 'forgiveness'] },
  { id: 'g-gradual', kind: 'fact', eyebrow: 'A GENTLE REMINDER', title: 'Even the Quran began gently.', body: 'ʿAisha explained that the first surahs spoke of Paradise and the Fire. Rules came later, once hearts were settled: “If the first thing revealed had been ‘Do not drink alcohol’, they would have said ‘We will never give it up.’”', source: 'Sahih al-Bukhari 4993', moods: ['newmuslim', 'strength'] },
  { id: 'g-easy', kind: 'fact', eyebrow: 'A GENTLE REMINDER', title: 'The religion is easy.', body: 'The Prophet ﷺ said: “The religion is easy… so do what is right, get as close to it as you can, and be glad.”', source: 'Sahih al-Bukhari 39', moods: ['newmuslim', 'guidance'] },
  { id: 'g-capacity', kind: 'fact', eyebrow: 'A GENTLE REMINDER', title: 'You won’t be asked for more than you can carry.', body: '“Allah does not charge a soul except with that within its capacity.”', source: 'Quran 2:286', moods: ['newmuslim', 'anxious', 'strength'] },

  // What does it mean? Everyday Islamic words and phrases
  { id: 'e-ayah', kind: 'word', eyebrow: 'WHAT DOES IT MEAN?', ar: 'آيَة', tl: 'āyah', meaning: 'a verse; literally, a sign', body: 'The Quran has 6,236 ayat. The same word is used for Allah’s signs in nature: “Of His signs are the night and the day, and the sun and the moon.”', source: 'Quran 41:37', moods: ['newmuslim'] },
  { id: 'e-surah', kind: 'word', eyebrow: 'WHAT DOES IT MEAN?', ar: 'سُورَة', tl: 'sūrah', meaning: 'a chapter', body: 'The Quran has 114 surahs, from al-Fatihah, the Opening, to an-Nas. The longest, al-Baqarah, has 286 ayat; the shortest, al-Kawthar, has three.', source: 'Quran 2 · Quran 108', moods: ['newmuslim'] },
  { id: 'e-hadith', kind: 'word', eyebrow: 'WHAT DOES IT MEAN?', ar: 'حَدِيث', tl: 'ḥadīth', meaning: 'a report', body: 'A record of what the Prophet ﷺ said, did or approved, passed on through a chain of named narrators. Sahih al-Bukhari and Sahih Muslim gather the most reliable.', source: 'The collections of al-Bukhari and Muslim', moods: ['newmuslim'] },
  { id: 'e-sunnah', kind: 'word', eyebrow: 'WHAT DOES IT MEAN?', ar: 'سُنَّة', tl: 'sunnah', meaning: 'the way', body: 'The Prophet’s ﷺ way of living and worshipping, which Muslims follow. “There has certainly been for you in the Messenger of Allah an excellent example.”', source: 'Quran 33:21', moods: ['newmuslim'] },
  { id: 'e-salah', kind: 'word', eyebrow: 'WHAT DOES IT MEAN?', ar: 'صَلَاة', tl: 'ṣalāh', meaning: 'prayer', body: 'The five daily prayers. The Prophet ﷺ said prayer is the first deed a person will be asked about on the Day of Judgement.', source: 'Jamiʿ at-Tirmidhi 413', moods: ['newmuslim'] },
  { id: 'e-dua', kind: 'word', eyebrow: 'WHAT DOES IT MEAN?', ar: 'دُعَاء', tl: 'duʿāʾ', meaning: 'calling on Allah', body: 'Any personal prayer, in any language, at any time. “Call upon Me; I will respond to you.”', source: 'Quran 40:60', moods: ['newmuslim'] },
  { id: 'e-deen', kind: 'word', eyebrow: 'WHAT DOES IT MEAN?', ar: 'دِين', tl: 'dīn', meaning: 'a way of life', body: 'Usually translated as religion, but it means a whole way of living. “This day I have perfected for you your deen.”', source: 'Quran 5:3', moods: ['newmuslim'] },
  { id: 'e-iman', kind: 'word', eyebrow: 'WHAT DOES IT MEAN?', ar: 'إِيمَان', tl: 'īmān', meaning: 'faith', body: 'Belief in the heart, shown in words and actions. Its six parts are belief in Allah, the angels, the books, the messengers, the Last Day and qadr.', source: 'Sahih Muslim 8', moods: ['newmuslim'] },
  { id: 'e-tawhid', kind: 'word', eyebrow: 'WHAT DOES IT MEAN?', ar: 'تَوْحِيد', tl: 'tawḥīd', meaning: 'oneness', body: 'Believing that Allah is One, with no partner: the heart of Islam. “Say, He is Allah, who is One.”', source: 'Quran 112:1', moods: ['newmuslim'] },
  { id: 'e-ummah', kind: 'word', eyebrow: 'WHAT DOES IT MEAN?', ar: 'أُمَّة', tl: 'ummah', meaning: 'community', body: 'The worldwide family of Muslims, from every nation and colour. “You are the best community brought forth for mankind.”', source: 'Quran 3:110', moods: ['newmuslim'] },
  { id: 'e-halal', kind: 'word', eyebrow: 'WHAT DOES IT MEAN?', ar: 'حَلَال', tl: 'ḥalāl', meaning: 'permitted', body: 'Anything Allah allows, from food to work. Its opposite is ḥarām, forbidden. “Eat of what is lawful and good on the earth.”', source: 'Quran 2:168', moods: ['newmuslim'] },
  { id: 'e-inshaallah', kind: 'word', eyebrow: 'WHAT DOES IT MEAN?', ar: 'إِنْ شَاءَ ٱللَّٰه', tl: 'in shāʾ Allāh', meaning: 'if Allah wills', body: 'Said about anything you plan to do. “Never say of anything, ‘I will do that tomorrow,’ except ‘if Allah wills.’”', source: 'Quran 18:23–24', moods: ['newmuslim'] },
  { id: 'e-mashaallah', kind: 'word', eyebrow: 'WHAT DOES IT MEAN?', ar: 'مَا شَاءَ ٱللَّٰه', tl: 'mā shāʾ Allāh', meaning: 'what Allah has willed', body: 'Said when you admire something, remembering that it came from Him.', source: 'Quran 18:39', moods: ['newmuslim'] },
  { id: 'e-alhamdulillah', kind: 'word', eyebrow: 'WHAT DOES IT MEAN?', ar: 'ٱلْحَمْدُ لِلَّٰه', tl: 'al-ḥamdu lillāh', meaning: 'all praise is for Allah', body: 'The first words of al-Fatihah after the Bismillah, and a Muslim’s thanks for anything good. The Prophet ﷺ said it fills the scale.', source: 'Quran 1:2 · Sahih Muslim 223', moods: ['newmuslim', 'grateful'] },
  { id: 'e-jazakallah', kind: 'word', eyebrow: 'WHAT DOES IT MEAN?', ar: 'جَزَاكَ ٱللَّٰهُ خَيْرًا', tl: 'jazāk Allāhu khayran', meaning: 'may Allah reward you with good', body: 'A Muslim’s thank you. The Prophet ﷺ said that whoever says it to someone who did them a favour has praised them as fully as they can.', source: 'Jamiʿ at-Tirmidhi 2035', moods: ['newmuslim'] },

  // More myths
  { id: 'm-arab', kind: 'myth', myth: 'Most Muslims are Arab.', fact: 'Only around one in five Muslims is Arab, and the country with the most Muslims is Indonesia. “We made you peoples and tribes that you may know one another.”', source: 'Quran 49:13', moods: ['newmuslim'] },
  { id: 'm-isa', kind: 'myth', myth: 'Muslims don’t believe in Jesus.', fact: 'ʿIsa (Jesus) is one of the greatest prophets in Islam, and Muslims believe in his miraculous birth to Maryam. The Quran tells his story with deep respect.', source: 'Quran 19:16–34 · 3:45', moods: ['newmuslim'] },
  { id: 'm-perfect', kind: 'myth', myth: 'You have to be a perfect Muslim before you start.', fact: 'The Prophet ﷺ said: “Every child of Adam makes mistakes, and the best of those who make mistakes are those who repent.”', source: 'Jamiʿ at-Tirmidhi 2499', moods: ['newmuslim', 'forgiveness'] },

  // The Arabic alphabet: one letter per card, with a word from a short ayah (words taken from the quran-json text).
  { id: 'l-alif', kind: 'letter', n: 1, letter: 'ا', name: 'alif', sound: "A long “aa”, as in “father”. It also carries the hamza, a short catch in the voice, as at the start of “uh-oh”.", word: 'أَحَدٌ', wordTl: 'aḥad', meaning: "One", s: 112, a: 1, ayah: 'قُلۡ هُوَ ٱللَّهُ أَحَدٌ' },
  { id: 'l-ba', kind: 'letter', n: 2, letter: 'ب', name: 'bāʾ', sound: "“b”, as in “book”.", word: 'بِسۡمِ', wordTl: 'bismi', meaning: "in the name of", s: 1, a: 1, ayah: 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ' },
  { id: 'l-ta', kind: 'letter', n: 3, letter: 'ت', name: 'tāʾ', sound: "A light “t”, with the tip of the tongue just behind the top teeth.", word: 'وَٱلتِّينِ', wordTl: 'wat-tīn', meaning: "by the fig", s: 95, a: 1, ayah: 'وَٱلتِّينِ وَٱلزَّيۡتُونِ' },
  { id: 'l-tha', kind: 'letter', n: 4, letter: 'ث', name: 'thāʾ', sound: "“th”, as in “think”, with the tongue between the teeth.", word: 'ٱلۡكَوۡثَرَ', wordTl: 'al-kawthar', meaning: "al-Kawthar, abundance", s: 108, a: 1, ayah: 'إِنَّآ أَعۡطَيۡنَٰكَ ٱلۡكَوۡثَرَ' },
  { id: 'l-jim', kind: 'letter', n: 5, letter: 'ج', name: 'jīm', sound: "“j”, as in “jam”.", word: 'جَآءَ', wordTl: 'jāʾa', meaning: "comes", s: 110, a: 1, ayah: 'إِذَا جَآءَ نَصۡرُ ٱللَّهِ وَٱلۡفَتۡحُ' },
  { id: 'l-hha', kind: 'letter', n: 6, letter: 'ح', name: 'ḥāʾ', sound: "A breathy “h” from the middle of the throat, like breathing on glasses to clean them.", word: 'ٱلۡحَمۡدُ', wordTl: 'al-ḥamdu', meaning: "all praise", s: 1, a: 2, ayah: 'ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ' },
  { id: 'l-kha', kind: 'letter', n: 7, letter: 'خ', name: 'khāʾ', sound: "“kh”, like the “ch” in the Scottish “loch”.", word: 'خَيۡرٞ', wordTl: 'khayr', meaning: "better", s: 97, a: 3, ayah: 'لَيۡلَةُ ٱلۡقَدۡرِ خَيۡرٞ مِّنۡ أَلۡفِ شَهۡرٖ' },
  { id: 'l-dal', kind: 'letter', n: 8, letter: 'د', name: 'dāl', sound: "“d”, with the tongue just behind the top teeth.", word: 'ٱلصَّمَدُ', wordTl: 'aṣ-ṣamad', meaning: "the Eternal Refuge", s: 112, a: 2, ayah: 'ٱللَّهُ ٱلصَّمَدُ' },
  { id: 'l-dhal', kind: 'letter', n: 9, letter: 'ذ', name: 'dhāl', sound: "“th”, as in “this”.", word: 'ذَٰلِكَ', wordTl: 'dhālika', meaning: "that", s: 2, a: 2, ayah: 'ذَٰلِكَ ٱلۡكِتَٰبُ لَا رَيۡبَۛ فِيهِۛ هُدٗى لِّلۡمُتَّقِينَ' },
  { id: 'l-ra', kind: 'letter', n: 10, letter: 'ر', name: 'rāʾ', sound: "A rolled “r”, with a light tap of the tongue.", word: 'رَبِّ', wordTl: 'rabbi', meaning: "Lord of", s: 1, a: 2, ayah: 'ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ' },
  { id: 'l-zay', kind: 'letter', n: 11, letter: 'ز', name: 'zāy', sound: "“z”, as in “zoo”.", word: 'زُلۡزِلَتِ', wordTl: 'zulzilat', meaning: "is shaken", s: 99, a: 1, ayah: 'إِذَا زُلۡزِلَتِ ٱلۡأَرۡضُ زِلۡزَالَهَا' },
  { id: 'l-sin', kind: 'letter', n: 12, letter: 'س', name: 'sīn', sound: "“s”, as in “sun”.", word: 'ٱلنَّاسِ', wordTl: 'an-nās', meaning: "mankind", s: 114, a: 1, ayah: 'قُلۡ أَعُوذُ بِرَبِّ ٱلنَّاسِ' },
  { id: 'l-shin', kind: 'letter', n: 13, letter: 'ش', name: 'shīn', sound: "“sh”, as in “shop”.", word: 'شَرِّ', wordTl: 'sharri', meaning: "the evil of", s: 113, a: 2, ayah: 'مِن شَرِّ مَا خَلَقَ' },
  { id: 'l-sad', kind: 'letter', n: 14, letter: 'ص', name: 'ṣād', sound: "A heavy “s”, with the back of the tongue raised, so the sound is full and deep.", word: 'ٱلصِّرَٰطَ', wordTl: 'aṣ-ṣirāṭ', meaning: "the path", s: 1, a: 6, ayah: 'ٱهۡدِنَا ٱلصِّرَٰطَ ٱلۡمُسۡتَقِيمَ' },
  { id: 'l-dad', kind: 'letter', n: 15, letter: 'ض', name: 'ḍād', sound: "A heavy “d”, made with the sides of the tongue. It is so particular to Arabic that Arabic is called “the language of ḍād”.", word: 'وَٱلضُّحَىٰ', wordTl: 'waḍ-ḍuḥā', meaning: "by the morning brightness", s: 93, a: 1, ayah: 'وَٱلضُّحَىٰ' },
  { id: 'l-tta', kind: 'letter', n: 16, letter: 'ط', name: 'ṭāʾ', sound: "A heavy “t”, with the back of the tongue raised.", word: 'وَٱلطَّارِقِ', wordTl: 'waṭ-ṭāriq', meaning: "by the night-comer", s: 86, a: 1, ayah: 'وَٱلسَّمَآءِ وَٱلطَّارِقِ' },
  { id: 'l-zza', kind: 'letter', n: 17, letter: 'ظ', name: 'ẓāʾ', sound: "A heavy “th” as in “this”, with the back of the tongue raised.", word: 'ظَهۡرَكَ', wordTl: 'ẓahrak', meaning: "your back", s: 94, a: 3, ayah: 'ٱلَّذِيٓ أَنقَضَ ظَهۡرَكَ' },
  { id: 'l-ayn', kind: 'letter', n: 18, letter: 'ع', name: 'ʿayn', sound: "A squeezed sound from the middle of the throat. English has nothing like it: listen and copy.", word: 'وَٱلۡعَصۡرِ', wordTl: 'wal-ʿaṣr', meaning: "by time", s: 103, a: 1, ayah: 'وَٱلۡعَصۡرِ' },
  { id: 'l-ghayn', kind: 'letter', n: 19, letter: 'غ', name: 'ghayn', sound: "A soft gargle at the back of the throat, like a French “r”.", word: 'غَاسِقٍ', wordTl: 'ghāsiq', meaning: "darkness", s: 113, a: 3, ayah: 'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ' },
  { id: 'l-fa', kind: 'letter', n: 20, letter: 'ف', name: 'fāʾ', sound: "“f”, as in “fish”.", word: 'ٱلۡفَلَقِ', wordTl: 'al-falaq', meaning: "the daybreak", s: 113, a: 1, ayah: 'قُلۡ أَعُوذُ بِرَبِّ ٱلۡفَلَقِ' },
  { id: 'l-qaf', kind: 'letter', n: 21, letter: 'ق', name: 'qāf', sound: "A deep “q”, from the very back of the mouth, further back than “k”.", word: 'قُلۡ', wordTl: 'qul', meaning: "say", s: 112, a: 1, ayah: 'قُلۡ هُوَ ٱللَّهُ أَحَدٌ' },
  { id: 'l-kaf', kind: 'letter', n: 22, letter: 'ك', name: 'kāf', sound: "“k”, as in “kite”.", word: 'كَيۡفَ', wordTl: 'kayfa', meaning: "how", s: 105, a: 1, ayah: 'أَلَمۡ تَرَ كَيۡفَ فَعَلَ رَبُّكَ بِأَصۡحَٰبِ ٱلۡفِيلِ' },
  { id: 'l-lam', kind: 'letter', n: 23, letter: 'ل', name: 'lām', sound: "“l”, as in “light”. In the name Allah it is usually full and heavy.", word: 'ٱللَّهِ', wordTl: 'Allāh', meaning: "Allah", s: 1, a: 1, ayah: 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ' },
  { id: 'l-mim', kind: 'letter', n: 24, letter: 'م', name: 'mīm', sound: "“m”, as in “moon”.", word: 'مَٰلِكِ', wordTl: 'māliki', meaning: "Master of", s: 1, a: 4, ayah: 'مَٰلِكِ يَوۡمِ ٱلدِّينِ' },
  { id: 'l-nun', kind: 'letter', n: 25, letter: 'ن', name: 'nūn', sound: "“n”, as in “noon”.", word: 'نَسۡتَعِينُ', wordTl: 'nastaʿīn', meaning: "we ask for help", s: 1, a: 5, ayah: 'إِيَّاكَ نَعۡبُدُ وَإِيَّاكَ نَسۡتَعِينُ' },
  { id: 'l-ha', kind: 'letter', n: 26, letter: 'ه', name: 'hāʾ', sound: "A soft “h”, as in “hello”.", word: 'هُوَ', wordTl: 'huwa', meaning: "He", s: 112, a: 1, ayah: 'قُلۡ هُوَ ٱللَّهُ أَحَدٌ' },
  { id: 'l-waw', kind: 'letter', n: 27, letter: 'و', name: 'wāw', sound: "“w”, as in “water”, or a long “oo”.", word: 'ٱلۡوَسۡوَاسِ', wordTl: 'al-waswās', meaning: "the whisperer", s: 114, a: 4, ayah: 'مِن شَرِّ ٱلۡوَسۡوَاسِ ٱلۡخَنَّاسِ' },
  { id: 'l-ya', kind: 'letter', n: 28, letter: 'ي', name: 'yāʾ', sound: "“y”, as in “yes”, or a long “ee”.", word: 'يَوۡمِ', wordTl: 'yawmi', meaning: "the Day of", s: 1, a: 4, ayah: 'مَٰلِكِ يَوۡمِ ٱلدِّينِ' },

  // Hear it three ways
  { id: 'r-94-5', kind: 'reciters', s: 94, a: 5, ar: 'فَإِنَّ مَعَ ٱلۡعُسۡرِ يُسۡرًا', en: 'For indeed, with hardship will be ease.', moods: ['anxious', 'strength'] },
  { id: 'r-55-13', kind: 'reciters', s: 55, a: 13, ar: 'فَبِأَيِّ ءَالَآءِ رَبِّكُمَا تُكَذِّبَانِ', en: 'So which of the favours of your Lord would you deny?', moods: ['grateful'] },
  { id: 'r-112-1', kind: 'reciters', s: 112, a: 1, ar: 'قُلۡ هُوَ ٱللَّهُ أَحَدٌ', en: 'Say, “He is Allah, who is One.”' },
  { id: 'r-2-152', kind: 'reciters', s: 2, a: 152, ar: 'فَٱذۡكُرُونِيٓ أَذۡكُرۡكُمۡ وَٱشۡكُرُواْ لِي وَلَا تَكۡفُرُونِ', en: 'So remember Me; I will remember you. And be grateful to Me and do not deny Me.', moods: ['lonely', 'grateful'] },
];

/** Munib's own short videos (hosted on the website, /videos). The end card is trimmed for in-app viewing. */
export type FeedVideo = { id: string; title: string; file: string; seconds: number; moods?: MoodId[]; sources: string };

export const VIDEOS: FeedVideo[] = [
  { id: 'still-scrolling', title: 'Still scrolling at 1:47am', file: 'still-scrolling', seconds: 42, moods: ['anxious', 'lonely', 'temptation'], sources: 'Quran 13:28 · Recitation: Mishary Alafasy' },
  { id: 'attention', title: '47 seconds', file: 'attention', seconds: 52, moods: ['guidance', 'strength'], sources: 'Quran 103:1–3 · Recitation: Mishary Alafasy · Gloria Mark (2023) · Ofcom (2025)' },
  { id: 'firdaus', title: 'What if you reached al-Firdaus?', file: 'firdaus', seconds: 48, moods: ['strength', 'guidance'], sources: 'Quran 18:107–108 · Sahih al-Bukhari 2790, 6464 · Recitation: Mishary Alafasy' },
  { id: 'jannah', title: 'What is Jannah like?', file: 'jannah', seconds: 59, moods: ['grieving', 'strength'], sources: 'Quran 47:15, 56:25–33, 35:34–35, 43:71, 75:22–23, 32:17 · Sahih al-Bukhari 3244 · Recitation: Mishary Alafasy' },
  { id: 'mercy', title: 'One part of a hundred', file: 'mercy', seconds: 57, moods: ['forgiveness', 'grieving', 'lonely'], sources: 'Sahih al-Bukhari 6000 · Sahih Muslim 2752–2753 · Quran 39:53 · Recitation: Mishary Alafasy' },
  { id: 'first-step', title: 'Don’t even go near it', file: 'first-step', seconds: 56, moods: ['temptation', 'forgiveness'], sources: 'Quran 17:32, 24:30–31, 25:70 · Recitation: Mishary Alafasy · Voiceover: AI voice' },
  { id: 'hand', title: 'The hand will speak', file: 'hand', seconds: 57, moods: ['temptation', 'forgiveness'], sources: 'Quran 36:65, 39:53 · Recitation: Mishary Alafasy · Voiceover: AI voice' },
];

/**
 * Cards that suit someone new to Islam (or just curious). Shown first for the "New to Islam" mood,
 * while still counting as cards for everyone else.
 */
export const NEWCOMER = new Set([
  'iqra', 'twentyfive', 'slowly', 'fatihah17', 'ikhlas', 'm-allah', 'm-compulsion', 'm-kaaba', 'm-written', 'm-arabic', 'm-aisha',
  'w-rahmah', 'w-tawbah', 'n-rahman', 'q-count', 'q-first', 'q-city', 'd-atina', 'd-ilm', 't-salam', 't-smile', 'r-112-1', 's-ibrahim',
  'attention', 'jannah',
  'x-pillars', 'x-iman', 'x-prophet', 'x-steps', 'g-wipe', 'g-gradual', 'g-easy', 'g-capacity', 'm-arab', 'm-isa', 'm-perfect',
  'e-ayah', 'e-surah', 'e-hadith', 'e-sunnah', 'e-salah', 'e-dua', 'e-deen', 'e-iman', 'e-tawhid', 'e-ummah', 'e-halal', 'e-inshaallah', 'e-mashaallah', 'e-alhamdulillah', 'e-jazakallah',
  'l-alif', 'l-ba',
]);
