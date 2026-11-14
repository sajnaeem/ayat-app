/**
 * Learn to pray (Saj, 14 Nov 2026: "I needed this help when I started and used YouTube").
 * How salah looks, step by step, for someone praying for the first time. It describes the common way the
 * prayer is done and points to a local imam where the schools differ; it never rules between them.
 * Prayer words come from Hisn al-Muslim (the same library as Find a dua, ids h…); al-Fatihah and the short
 * surahs come from Surahs for your prayer (src/data/learn.ts). ALL of this needs a scholar's check before launch.
 */

export type PoseName = 'stand' | 'takbir' | 'fold' | 'ruku' | 'sujud' | 'sit' | 'tashahhud' | 'salam';
/** clip: a recording of these words for the guided prayer (website/salah/<clip>.mp3: Hisn al-Muslim recited by Hamad Al-Durayhim, from the MIT-licensed Islamic Pro Azkar dataset). */
export type Words = { ar: string; tl: string; en: string; times?: number; src: string; clip?: string };
export type SalahStep = {
  id: string;
  pose: PoseName;
  /** The Arabic name of the position, as people say it. */
  name: string;
  title: string;
  /** What to do, in plain words. */
  how: string;
  /** What to say (in order). */
  say?: Words[];
  /** Recite al-Fatihah / a short surah here (shown from src/data/learn.ts with recitation). */
  recite?: 'fatihah' | 'surah';
  /** Where Muslims do it differently: always ends by pointing to the local mosque. */
  differs?: string;
};

const TAKBIR: Words = { ar: 'اللَّهُ أَكْبَرُ', tl: 'Allahu akbar', en: 'Allah is the Greatest.', src: 'Said at each change of position', clip: 'h241' };

export const STEPS: Record<string, SalahStep> = {
  niyyah: {
    id: 'niyyah',
    pose: 'stand',
    name: 'Niyyah',
    title: 'Stand and intend',
    how: 'Stand facing the Qibla, feet a little apart, and look down at the place where your forehead will go. In your heart, intend the prayer you are about to pray, for example “the two rakʿahs of Fajr”. The intention is in the heart; you don’t need special words.',
    differs: 'Some scholars say the intention quietly in words as well; most say the heart is enough. Ask your local imam what they teach.',
  },
  takbir: {
    id: 'takbir',
    pose: 'takbir',
    name: 'Takbir',
    title: 'Raise your hands and begin',
    how: 'Raise your hands to the level of your ears or shoulders, palms facing forward, and say “Allahu akbar”. From now on you are in prayer: stay still, keep your eyes on your place of prostration, and don’t talk.',
    say: [TAKBIR],
  },
  opening: {
    id: 'opening',
    pose: 'fold',
    name: 'Qiyam',
    title: 'Fold your hands and open the prayer',
    how: 'Place your right hand over your left. Quietly say the opening words of praise. They are recommended, so if you don’t know them yet, your prayer is still fine without them.',
    say: [
      { ar: 'سُبْحانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبارَكَ اسْمُكَ، وَتَعَالَى جَدُّكَ، وَلاَ إِلَهَ غَيْرُكَ', tl: 'Subhanakal-lahumma wabihamdika watabarakas-muka wataʿala jadduka wala ilaha ghayruk.', en: 'How perfect You are O Allah, and I praise You. Blessed be Your name, and lofty is Your position, and none has the right to be worshipped except You.', src: 'Hisn al-Muslim, no. 28', clip: 'h28' },
    ],
    differs: 'Where the hands go differs: on the chest, just below it, or below the navel; many Malikis let their arms hang by their sides. All of these are followed by Muslims, so do what your local mosque teaches.',
  },
  refuge: {
    id: 'refuge',
    pose: 'fold',
    name: 'Taʿawwudh',
    title: 'Seek refuge with Allah',
    how: 'Before you recite, quietly seek refuge with Allah from Satan. Al-Fatihah then begins in His name: “Bismillahir-rahmanir-raheem”.',
    say: [
      { ar: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ', tl: 'Aʿoodhu billahi minash-shaytanir-rajeem', en: 'I seek refuge with Allah from Satan, the outcast.', src: 'Based on Quran 16:98' },
    ],
  },
  fatihah: {
    id: 'fatihah',
    pose: 'fold',
    name: 'Al-Fatihah',
    title: 'Recite al-Fatihah',
    how: 'Recite al-Fatihah, the opening surah, in every rakʿah. It is the heart of the prayer, so it is the first thing to learn. At the end, say “Ameen”.',
    recite: 'fatihah',
    say: [{ ar: 'آمِين', tl: 'Ameen', en: 'O Allah, answer us.', src: 'Said after al-Fatihah' }],
    differs: 'In Fajr, Maghrib and Isha the first two rakʿahs are recited aloud by the imam; Dhuhr and Asr are quiet. When you pray behind an imam, schools differ on whether you recite al-Fatihah yourself. Ask your local imam.',
  },
  surah: {
    id: 'surah',
    pose: 'fold',
    name: 'Surah',
    title: 'Recite a short surah',
    how: 'In the first two rakʿahs, after al-Fatihah, recite any other part of the Quran you know: a short surah is perfect. Al-Ikhlas is a good one to start with. In the third and fourth rakʿahs you recite al-Fatihah only.',
    recite: 'surah',
  },
  ruku: {
    id: 'ruku',
    pose: 'ruku',
    name: 'Rukuʿ',
    title: 'Bow',
    how: 'Say “Allahu akbar” and bow, with your hands on your knees and your back straight and level. Pause until you are still, and glorify your Lord.',
    say: [TAKBIR, { ar: 'سُبْحانَ رَبِّيَ الْعَظِيمِ', tl: 'Subhana rabbiyal-ʿatheem', en: 'How perfect my Lord is, the Supreme.', times: 3, src: 'Hisn al-Muslim, no. 33', clip: 'h33' }],
  },
  rise: {
    id: 'rise',
    pose: 'stand',
    name: 'Iʿtidal',
    title: 'Rise and stand still',
    how: 'Rise back up to standing, saying the first words as you rise. Stand fully straight and still for a moment, then praise Allah.',
    say: [
      { ar: 'سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ', tl: 'Samiʿal-lahu liman hamidah', en: 'Allah hears the one who praises Him.', src: 'Hisn al-Muslim, no. 38 (said while rising)', clip: 'h38' },
      { ar: 'رَبَّنَا وَلَكَ الْحَمْدُ، حَمْداً كَثيراً طَيِّباً مُبارَكاً فِيهِ', tl: 'Rabbana walakal-hamdu hamdan katheeran tayyiban mubarakan feeh.', en: 'Our Lord, for You is all praise, an abundant, beautiful, blessed praise.', src: 'Hisn al-Muslim, no. 39', clip: 'h39' },
    ],
    differs: 'Behind an imam, many schools teach that you say only “Rabbana walakal-hamd” while the imam says “Samiʿallahu liman hamidah”.',
  },
  sujud: {
    id: 'sujud',
    pose: 'sujud',
    name: 'Sujud',
    title: 'Prostrate',
    how: 'Say “Allahu akbar” and go down into prostration. Seven parts touch the ground: your forehead (with your nose), both palms, both knees and the toes of both feet. Keep your forearms off the ground. This is when you are closest to Allah.',
    say: [TAKBIR, { ar: 'سُبْحَانَ رَبِّيَ الأَعْلَى', tl: 'Subhana rabbiyal-aʿla', en: 'How perfect my Lord is, the Most High.', times: 3, src: 'Hisn al-Muslim, no. 41', clip: 'h41' }],
    differs: 'Whether the knees or the hands touch the ground first, and how far the elbows are held from the body, differ between schools (many teach women to keep their arms closer in). Ask your local imam.',
  },
  between: {
    id: 'between',
    pose: 'sit',
    name: 'Jalsah',
    title: 'Sit up for a moment',
    how: 'Say “Allahu akbar” and sit up, resting your hands on your thighs. Sit still for a moment and ask for forgiveness.',
    say: [TAKBIR, { ar: 'رَبِّ اغْفِرْ لِي، رَبِّ اغْفِرْ لِي', tl: 'Rabbigh-fir lee, rabbigh-fir lee.', en: 'My Lord, forgive me. My Lord, forgive me.', src: 'Hisn al-Muslim, no. 48', clip: 'h48' }],
    differs: 'Most sit on the left foot with the right foot upright, toes towards the Qibla. If that hurts, sit however you comfortably can.',
  },
  sujud2: {
    id: 'sujud2',
    pose: 'sujud',
    name: 'Sujud',
    title: 'Prostrate a second time',
    how: 'Say “Allahu akbar” and prostrate again, just like the first time. That completes one rakʿah.',
    say: [TAKBIR, { ar: 'سُبْحَانَ رَبِّيَ الأَعْلَى', tl: 'Subhana rabbiyal-aʿla', en: 'How perfect my Lord is, the Most High.', times: 3, src: 'Hisn al-Muslim, no. 41', clip: 'h41' }],
  },
  stand: {
    id: 'stand',
    pose: 'fold',
    name: 'Qiyam',
    title: 'Stand up for the next rakʿah',
    how: 'Say “Allahu akbar” and stand up again, hands folded as before. This rakʿah starts straight from al-Fatihah: no opening words this time.',
    say: [TAKBIR],
  },
  tashahhud: {
    id: 'tashahhud',
    pose: 'tashahhud',
    name: 'Tashahhud',
    title: 'Sit and bear witness',
    how: 'After the second prostration of the second rakʿah, stay sitting instead of standing. With your hands on your thighs, recite the tashahhud. Many raise the right index finger when bearing witness.',
    say: [
      { ar: 'التَّحِيَّاتُ لِلَّهِ، وَالصَّلَواتُ، وَالطَّيِّباتُ، السَّلاَمُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلاَمُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ. أَشْهَدُ أَنْ لاَ إِلَهَ إِلاَّ اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّداً عَبْدُهُ وَرَسولُهُ', tl: 'Attahiyyatu lillahi wassalawatu wattayyibat, assalamu ʿalayka ayyuhan-nabiyyu warahmatul-lahi wabarakatuh, assalamu ʿalayna waʿala ʿibadil-lahis-saliheen. Ash-hadu an la ilaha illal-lah, wa-ashhadu anna Muhammadan ʿabduhu warasooluh.', en: 'All greetings of honour are for Allah, and all prayers and good things. Peace be upon you, O Prophet, and the mercy of Allah and His blessings. Peace be upon us and upon the righteous servants of Allah. I bear witness that none has the right to be worshipped except Allah, and I bear witness that Muhammad is His servant and Messenger.', src: 'Hisn al-Muslim, no. 52', clip: 'h52' },
    ],
    differs: 'When and how the finger is raised, and the exact way of sitting, differ between schools. Ask your local imam.',
  },
  salawat: {
    id: 'salawat',
    pose: 'tashahhud',
    name: 'Salawat',
    title: 'Send blessings on the Prophet ﷺ',
    how: 'In the final sitting only, after the tashahhud, send blessings on the Prophet ﷺ.',
    say: [
      { ar: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ، وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيتَ عَلَى إِبْرَاهِيمَ، وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ', tl: 'Allahumma salli ʿala Muhammad, wa-ʿala ali Muhammad, kama sallayta ʿala Ibraheema wa-ʿala ali Ibraheem, innaka Hameedun Majeed. Allahumma barik ʿala Muhammad, wa-ʿala ali Muhammad, kama barakta ʿala Ibraheema wa-ʿala ali Ibraheem, innaka Hameedun Majeed.', en: 'O Allah, send prayers upon Muhammad and the family of Muhammad, as You sent prayers upon Ibraheem and the family of Ibraheem; You are full of praise and majesty. O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibraheem and the family of Ibraheem; You are full of praise and majesty.', src: 'Hisn al-Muslim, no. 53', clip: 'h53' },
    ],
  },
  beforesalam: {
    id: 'beforesalam',
    pose: 'tashahhud',
    name: 'Dua',
    title: 'Make a dua',
    how: 'Before ending the prayer you may ask Allah for anything good. This one was taught by the Prophet ﷺ. It is recommended, so leave it until you’re ready.',
    say: [
      { ar: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، وَمِنْ عَذَابِ جَهَنَّمَ، وَمِنْ فِتْنَةِ الْمَحْيَا وَالْمَمَاتِ، وَمِنْ شَرِّ فِتْنَةِ الْمَسِيحِ الدَّجَّالِ', tl: 'Allahumma innee aʿoothu bika min ʿathabil-qabr, wamin ʿathabi jahannam, wamin fitnatil-mahya walmamat, wamin shari fitnatil-maseehid-dajjal.', en: 'O Allah, I seek refuge in You from the punishment of the grave, from the punishment of Hell, from the trials of life and death, and from the evil of the trial of the False Messiah.', src: 'Hisn al-Muslim, no. 55', clip: 'h55' },
    ],
  },
  salam: {
    id: 'salam',
    pose: 'salam',
    name: 'Taslim',
    title: 'End with peace',
    how: 'Turn your head to the right and say the greeting of peace, then turn to the left and say it again. Your prayer is complete.',
    say: [{ ar: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ', tl: 'As-salamu ʿalaykum wa rahmatullah', en: 'Peace be upon you, and the mercy of Allah.', times: 2, src: 'Right, then left' }],
  },
};

/** The order to learn them in (one two-rakʿah prayer, start to finish). */
export const LEARN_ORDER = ['niyyah', 'takbir', 'opening', 'refuge', 'fatihah', 'surah', 'ruku', 'rise', 'sujud', 'between', 'sujud2', 'stand', 'tashahhud', 'salawat', 'beforesalam', 'salam'];

export type Beat = { step: string; rakah: number };

/** A whole prayer of n rakʿahs as a list of steps, for "Pray along". */
export function prayerBeats(n: number): Beat[] {
  const out: Beat[] = [];
  const add = (r: number, ...ids: string[]) => ids.forEach((step) => out.push({ step, rakah: r }));
  for (let r = 1; r <= n; r++) {
    if (r === 1) add(r, 'niyyah', 'takbir', 'opening', 'refuge');
    else add(r, 'stand');
    add(r, 'fatihah');
    if (r <= 2) add(r, 'surah');
    add(r, 'ruku', 'rise', 'sujud', 'between', 'sujud2');
    if (r === n) add(r, 'tashahhud', 'salawat', 'beforesalam', 'salam');
    else if (r === 2) add(r, 'tashahhud');
  }
  return out;
}

/** The obligatory (fard) rakʿahs of the five daily prayers. */
export const PRAYERS: { id: string; name: string; ar: string; rakahs: number; aloud: string }[] = [
  { id: 'fajr', name: 'Fajr', ar: 'الفجر', rakahs: 2, aloud: 'Dawn, before sunrise' },
  { id: 'dhuhr', name: 'Dhuhr', ar: 'الظهر', rakahs: 4, aloud: 'Just after midday' },
  { id: 'asr', name: 'Asr', ar: 'العصر', rakahs: 4, aloud: 'Afternoon' },
  { id: 'maghrib', name: 'Maghrib', ar: 'المغرب', rakahs: 3, aloud: 'Just after sunset' },
  { id: 'isha', name: 'Isha', ar: 'العشاء', rakahs: 4, aloud: 'Night' },
];

/** Wudu, the washing before prayer: the common order, as taught in most mosques. */
export const WUDU: { title: string; how: string; times?: number }[] = [
  { title: 'Intend and say Bismillah', how: 'Intend in your heart to make wudu for prayer, and say “Bismillah” (in the name of Allah).' },
  { title: 'Wash your hands', how: 'Wash both hands up to the wrists, between the fingers too.', times: 3 },
  { title: 'Rinse your mouth', how: 'Take water into your mouth, swirl it around and spit it out.', times: 3 },
  { title: 'Rinse your nose', how: 'Sniff a little water into your nose with your right hand and blow it out with your left.', times: 3 },
  { title: 'Wash your face', how: 'From the hairline to the chin, and from ear to ear.', times: 3 },
  { title: 'Wash your arms', how: 'Right arm then left, from the fingertips up to and including the elbows.', times: 3 },
  { title: 'Wipe your head', how: 'With wet hands, wipe over your head from the front to the back and back again.' },
  { title: 'Wipe your ears', how: 'With wet fingers, wipe inside your ears with your index fingers and behind them with your thumbs.' },
  { title: 'Wash your feet', how: 'Right foot then left, up to and including the ankles, between the toes too.', times: 3 },
  { title: 'Bear witness', how: 'Finish with the shahada.' },
];
export const WUDU_END: Words = { ar: 'أَشْهَدُ أَنْ لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّداً عَبْدُهُ وَرَسُولُهُ', tl: 'Ashhadu an la ilaha illal-lahu wahdahu la shareeka lah, wa-ashhadu anna Muhammadan ʿabduhu warasooluh.', en: 'I bear witness that none has the right to be worshipped except Allah, alone without partner, and I bear witness that Muhammad is His servant and Messenger.', src: 'Hisn al-Muslim, no. 13' };

/** Good to know before you start: widely agreed basics, with differences sent to the local imam. */
export const BEFORE: { title: string; how: string }[] = [
  { title: 'Be clean', how: 'Make wudu (below). Your body, clothes and the place you pray should be clean; a prayer mat helps but isn’t required.' },
  { title: 'Cover yourself', how: 'Men cover at least from the navel to the knees, and usually the shoulders. Women cover everything except the face and hands; many also cover the feet. Loose clothes help.' },
  { title: 'Face the Qibla', how: 'Face the Kaaba in Makkah. Munib’s Qibla compass shows you which way.' },
  { title: 'Pray in its time', how: 'Each prayer has its own window during the day. Prayer times shows them for where you are.' },
  { title: 'For sisters', how: 'During a period, or bleeding after childbirth, a woman doesn’t pray, and doesn’t make up those prayers later. She can still remember Allah and make dua.' },
  { title: 'Start where you are', how: 'If you can’t say the Arabic yet, keep learning it and pray as well as you can; ask your local imam what to say until then. Allah doesn’t burden a soul beyond what it can bear (Quran 2:286).' },
];
