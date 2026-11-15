/**
 * A gathering of dua for someone who has passed away (Saj, 15 Nov 2026: "My mum invited a scholar home today to lead
 * dua for my dad… everyone sits around and listens… it doesn't replace having a human, but if a family wanted to do it
 * every day this option is there").
 *
 * Only established duas: Hisn al-Muslim's duas for the deceased (nos. 156, 157, 159, 164, from the funeral prayer and
 * after burial) and duas from the Quran (17:24 and 14:41 for parents, 59:10 for all who went before us), opened with
 * the salawat (Hisn no. 53). The Arabic "him" forms are Hisn al-Muslim's text (hisnmuslim.com); the "her" forms were
 * written for Munib by changing the pronouns and verbs, and for a woman the line "a spouse better than his spouse" is
 * left out (scholars differ on saying it for a woman). The English is Munib's own plain rendering, with the person's
 * name in place of the first "him" or "her" so the room knows who is being prayed for. The transliterations are
 * Munib's learner spelling. ALL of it needs a scholar's check, especially the "her" forms and the English.
 *
 * Recordings: the "him" forms by Hamad Al-Durayhim (website/salah/h<n>.mp3, from the MIT-licensed Islamic Pro Azkar
 * dataset); there is no recording of the "her" forms, so for a sister the Arabic is shown and the English read aloud.
 * The Quran duas are recited by al-Husary. The spoken English (when chosen) is an AI voice and says so.
 */

type P = { he: string; him: string; his: string; He: string; son: string };
export const pronouns = (she: boolean): P =>
  she ? { he: 'she', him: 'her', his: 'her', He: 'She', son: 'daughter' } : { he: 'he', him: 'him', his: 'his', He: 'He', son: 'son' };

export type GatherDua = {
  id: string;
  title: string;
  ar: { m: string; f: string };
  tl: { m: string; f: string };
  en: (name: string, p: P) => string;
  src: string;
  /** Recording of the "him" form (website/salah/<clip>.mp3). */
  clip?: string;
  /** A Quran dua: recited by al-Husary (the Arabic is the same whoever it is for). */
  quran?: { s: number; a: number };
  /** Only when the person was the reader's mother or father. */
  parent?: boolean;
};

export const SALAWAT: GatherDua = {
  id: 'salawat',
  title: 'Blessings on the Prophet ﷺ',
  ar: {
    m: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ، وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيتَ عَلَى إِبْرَاهِيمَ، وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
    f: '',
  },
  tl: {
    m: 'Allaahumma salli ʿalaa Muhammad, wa ʿalaa aali Muhammad, kamaa sallayta ʿalaa Ibraaheema wa ʿalaa aali Ibraaheem, innaka Hameedum-Majeed. Allaahumma baarik ʿalaa Muhammad, wa ʿalaa aali Muhammad, kamaa baarakta ʿalaa Ibraaheema wa ʿalaa aali Ibraaheem, innaka Hameedum-Majeed.',
    f: '',
  },
  en: () => 'O Allah, send Your blessings on Muhammad and the family of Muhammad, as You sent blessings on Ibrahim and the family of Ibrahim; You are worthy of all praise, full of glory. O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibrahim and the family of Ibrahim; You are worthy of all praise, full of glory.',
  src: 'Hisn al-Muslim, no. 53 (Bukhari 3370)',
  clip: 'h53',
};

export const GATHER_DUAS: GatherDua[] = [
  {
    id: 'h156',
    title: 'Forgive and have mercy',
    ar: {
      m: 'اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ، وَعَافِهِ، وَاعْفُ عَنْهُ، وَأَكْرِمْ نُزُلَهُ، وَوَسِّعْ مُدْخَلَهُ، وَاغْسِلْهُ بِالْمَاءِ وَالثَّلْجِ وَالْبَرَدِ، وَنَقِّهِ مِنَ الْخَطَايَا كَمَا نَقَّيْتَ الثَّوْبَ الأَبْيَضَ مِنَ الدَّنَسِ، وَأَبْدِلْهُ دَاراً خَيْراً مِنْ دَارِهِ، وَأَهْلاً خَيْراً مِنْ أَهْلِهِ، وَزَوْجاً خَيْراً مِنْ زَوْجِهِ، وَأَدْخِلْهُ الْجَنَّةَ، وَأَعِذْهُ مِنْ عَذَابِ الْقَبْرِ وَعَذَابِ النَّارِ',
      f: 'اللَّهُمَّ اغْفِرْ لَهَا وَارْحَمْهَا، وَعَافِهَا، وَاعْفُ عَنْهَا، وَأَكْرِمْ نُزُلَهَا، وَوَسِّعْ مُدْخَلَهَا، وَاغْسِلْهَا بِالْمَاءِ وَالثَّلْجِ وَالْبَرَدِ، وَنَقِّهَا مِنَ الْخَطَايَا كَمَا نَقَّيْتَ الثَّوْبَ الأَبْيَضَ مِنَ الدَّنَسِ، وَأَبْدِلْهَا دَاراً خَيْراً مِنْ دَارِهَا، وَأَهْلاً خَيْراً مِنْ أَهْلِهَا، وَأَدْخِلْهَا الْجَنَّةَ، وَأَعِذْهَا مِنْ عَذَابِ الْقَبْرِ وَعَذَابِ النَّارِ',
    },
    tl: {
      m: 'Allaahummagh-fir lahu warham-hu, wa ʿaafihi waʿ-fu ʿanhu, wa akrim nuzulahu, wa wassiʿ mudkhalahu, waghsil-hu bil-maaʾi wath-thalji wal-barad, wa naqqihi minal-khataayaa kamaa naqqaytath-thawbal-abyada minad-danas, wa abdil-hu daaran khayran min daarihi, wa ahlan khayran min ahlihi, wa zawjan khayran min zawjihi, wa adkhil-hul-jannah, wa aʿidh-hu min ʿadhaabil-qabri wa ʿadhaabin-naar.',
      f: 'Allaahummagh-fir lahaa warham-haa, wa ʿaafihaa waʿ-fu ʿanhaa, wa akrim nuzulahaa, wa wassiʿ mudkhalahaa, waghsil-haa bil-maaʾi wath-thalji wal-barad, wa naqqihaa minal-khataayaa kamaa naqqaytath-thawbal-abyada minad-danas, wa abdil-haa daaran khayran min daarihaa, wa ahlan khayran min ahlihaa, wa adkhil-hal-jannah, wa aʿidh-haa min ʿadhaabil-qabri wa ʿadhaabin-naar.',
    },
    en: (n, p) =>
      `O Allah, forgive ${n} and have mercy on ${p.him}. Keep ${p.him} safe and pardon ${p.him}. Make ${p.his} welcome an honourable one, and make ${p.his} resting place wide. Wash ${p.him} with water, snow and hail, and cleanse ${p.him} of sins as a white garment is cleansed of dirt. Give ${p.him} a home better than ${p.his} home, and a family better than ${p.his} family${p.he === 'he' ? ', and a spouse better than his spouse' : ''}. Admit ${p.him} into Paradise, and protect ${p.him} from the punishment of the grave and the punishment of the Fire.`,
    src: 'Hisn al-Muslim, no. 156 (Muslim 963)',
    clip: 'h156',
  },
  {
    id: 'h159',
    title: 'In need of Your mercy',
    ar: {
      m: 'اللَّهُمَّ عَبْدُكَ وَابْنُ أَمَتِكَ احْتَاجَ إِلَى رَحْمَتِكَ، وَأَنْتَ غَنِيٌّ عَنْ عَذَابِهِ، إِنْ كَانَ مُحْسِناً فَزِدْ فِي حَسَنَاتِهِ، وَإِنْ كَانَ مُسِيئاً فَتَجَاوَزْ عَنْهُ',
      f: 'اللَّهُمَّ أَمَتُكَ وَبِنْتُ أَمَتِكَ احْتَاجَتْ إِلَى رَحْمَتِكَ، وَأَنْتَ غَنِيٌّ عَنْ عَذَابِهَا، إِنْ كَانَتْ مُحْسِنَةً فَزِدْ فِي حَسَنَاتِهَا، وَإِنْ كَانَتْ مُسِيئَةً فَتَجَاوَزْ عَنْهَا',
    },
    tl: {
      m: 'Allaahumma ʿabduka wabnu amatika, ihtaaja ilaa rahmatika, wa anta ghaniyyun ʿan ʿadhaabihi. In kaana muhsinan fa-zid fee hasanaatihi, wa in kaana museeʾan fa-tajaawaz ʿanhu.',
      f: 'Allaahumma amatuka wa bintu amatika, ihtaajat ilaa rahmatika, wa anta ghaniyyun ʿan ʿadhaabihaa. In kaanat muhsinatan fa-zid fee hasanaatihaa, wa in kaanat museeʾatan fa-tajaawaz ʿanhaa.',
    },
    en: (n, p) =>
      `O Allah, ${n} is Your servant, the ${p.son} of Your servant. ${p.He} is in need of Your mercy, and You have no need to punish ${p.him}. If ${p.he} did good, add to ${p.his} good deeds; and if ${p.he} did wrong, overlook it.`,
    src: 'Hisn al-Muslim, no. 159 (al-Hakim)',
    clip: 'h159',
  },
  {
    id: 'h164',
    title: 'Keep them firm',
    ar: { m: 'اللَّهُمَّ اغْفِرْ لَهُ، اللَّهُمَّ ثَبِّتْهُ', f: 'اللَّهُمَّ اغْفِرْ لَهَا، اللَّهُمَّ ثَبِّتْهَا' },
    tl: { m: 'Allaahummagh-fir lahu. Allaahumma thabbit-hu.', f: 'Allaahummagh-fir lahaa. Allaahumma thabbit-haa.' },
    en: (n, p) => `O Allah, forgive ${n}. O Allah, keep ${p.him} firm.`,
    src: 'Hisn al-Muslim, no. 164 (Abu Dawud 3221)',
    clip: 'h164',
  },
  {
    id: 'h157',
    title: 'Our living and our dead',
    ar: {
      m: 'اللَّهُمَّ اغْفِرْ لِحَيِّنَا وَمَيِّتِنَا، وَشَاهِدِنَا وَغَائِبِنَا، وَصَغِيرِنَا وَكَبيرِنَا، وَذَكَرِنَا وَأُنْثَانَا. اللَّهُمَّ مَنْ أَحْيَيْتَهُ مِنَّا فَأَحْيِهِ عَلَى الْإِسْلاَمِ، وَمَنْ تَوَفَّيْتَهُ مِنَّا فَتَوَفَّهُ عَلَى الإِيمَانِ، اللَّهُمَّ لاَ تَحْرِمْنَا أَجْرَهُ، وَلاَ تُضِلَّنَا بَعْدَهُ',
      f: 'اللَّهُمَّ اغْفِرْ لِحَيِّنَا وَمَيِّتِنَا، وَشَاهِدِنَا وَغَائِبِنَا، وَصَغِيرِنَا وَكَبيرِنَا، وَذَكَرِنَا وَأُنْثَانَا. اللَّهُمَّ مَنْ أَحْيَيْتَهُ مِنَّا فَأَحْيِهِ عَلَى الْإِسْلاَمِ، وَمَنْ تَوَفَّيْتَهُ مِنَّا فَتَوَفَّهُ عَلَى الإِيمَانِ، اللَّهُمَّ لاَ تَحْرِمْنَا أَجْرَهَا، وَلاَ تُضِلَّنَا بَعْدَهَا',
    },
    tl: {
      m: 'Allaahummagh-fir li-hayyinaa wa mayyitinaa, wa shaahidinaa wa ghaaʾibinaa, wa sagheerinaa wa kabeerinaa, wa dhakarinaa wa unthaanaa. Allaahumma man ahyaytahu minnaa fa-ahyihi ʿalal-islaam, wa man tawaffaytahu minnaa fa-tawaffahu ʿalal-eemaan. Allaahumma laa tahrimnaa ajrahu, wa laa tudillanaa baʿdah.',
      f: 'Allaahummagh-fir li-hayyinaa wa mayyitinaa, wa shaahidinaa wa ghaaʾibinaa, wa sagheerinaa wa kabeerinaa, wa dhakarinaa wa unthaanaa. Allaahumma man ahyaytahu minnaa fa-ahyihi ʿalal-islaam, wa man tawaffaytahu minnaa fa-tawaffahu ʿalal-eemaan. Allaahumma laa tahrimnaa ajrahaa, wa laa tudillanaa baʿdahaa.',
    },
    en: (n, p) =>
      `O Allah, forgive our living and our dead, those of us here and those far away, our young and our old, our men and our women. O Allah, whoever of us You keep alive, keep them alive upon Islam, and whoever of us You take, take them upon faith. O Allah, do not keep from us the reward of ${n}, and do not let us go astray after ${p.him}.`,
    src: 'Hisn al-Muslim, no. 157 (Abu Dawud 3201, Tirmidhi 1024, Ibn Majah 1498)',
    clip: 'h157',
  },
  {
    id: 'q17_24',
    title: 'For our parents',
    ar: { m: 'وَٱخۡفِضۡ لَهُمَا جَنَاحَ ٱلذُّلِّ مِنَ ٱلرَّحۡمَةِ وَقُل رَّبِّ ٱرۡحَمۡهُمَا كَمَا رَبَّيَانِي صَغِيرٗا', f: '' },
    tl: { m: 'Wakhfid lahumaa janaahadh-dhulli minar-rahmati wa qur-rabbir-ham-humaa kamaa rabbayaanee sagheeraa.', f: '' },
    en: () => 'My Lord, have mercy on them, as they brought me up when I was small.',
    src: 'Quran 17:24',
    quran: { s: 17, a: 24 },
    parent: true,
  },
  {
    id: 'q14_41',
    title: 'Forgive my parents',
    ar: { m: 'رَبَّنَا ٱغۡفِرۡ لِي وَلِوَٰلِدَيَّ وَلِلۡمُؤۡمِنِينَ يَوۡمَ يَقُومُ ٱلۡحِسَابُ', f: '' },
    tl: { m: 'Rabbanagh-fir lee wa li-waalidayya wa lil-muʾmineena yawma yaqoomul-hisaab.', f: '' },
    en: () => 'Our Lord, forgive me and my parents and the believers on the Day the account is established.',
    src: 'Quran 14:41',
    quran: { s: 14, a: 41 },
    parent: true,
  },
  {
    id: 'q59_10',
    title: 'All who went before us',
    ar: { m: 'وَٱلَّذِينَ جَآءُو مِنۢ بَعۡدِهِمۡ يَقُولُونَ رَبَّنَا ٱغۡفِرۡ لَنَا وَلِإِخۡوَٰنِنَا ٱلَّذِينَ سَبَقُونَا بِٱلۡإِيمَٰنِ وَلَا تَجۡعَلۡ فِي قُلُوبِنَا غِلّٗا لِّلَّذِينَ ءَامَنُواْ رَبَّنَآ إِنَّكَ رَءُوفٞ رَّحِيمٌ', f: '' },
    tl: { m: 'Walladheena jaaʾoo mim baʿdihim yaqooloona rabbanagh-fir lanaa wa li-ikhwaaninal-ladheena sabaqoonaa bil-eemaani wa laa tajʿal fee quloobinaa ghillal-lilladheena aamanoo rabbanaa innaka raʾoofur-raheem.', f: '' },
    en: () => 'Our Lord, forgive us and our brothers and sisters who went before us in faith, and put no resentment in our hearts toward those who believe. Our Lord, You are Kind and Merciful.',
    src: 'Quran 59:10',
    quran: { s: 59, a: 10 },
  },
];

/** Surahs a family can listen to after al-Fatihah (0 = none). */
export const GATHER_SURAHS: { s: number; label: string; note: string }[] = [
  { s: 0, label: 'None', note: 'Al-Fatihah, then the duas' },
  { s: 112, label: 'Al-Ikhlas', note: 'Under a minute' },
  { s: 67, label: 'Al-Mulk', note: 'About 10 minutes' },
  { s: 36, label: 'Ya-Sin', note: 'About 20 minutes' },
];

export type Beat =
  | { kind: 'intro'; say: string }
  | { kind: 'surah'; s: number }
  | { kind: 'dua'; dua: GatherDua; ar: string; tl: string; en: string; clip?: string }
  | { kind: 'close'; say: string };

/** The whole gathering, in order. */
export function gatheringBeats(name: string, she: boolean, parent: boolean, fatihah: boolean, surah: number): Beat[] {
  const p = pronouns(she);
  const sName = surah ? GATHER_SURAHS.find((x) => x.s === surah)?.label : '';
  const begin = fatihah ? ` We begin with Surah al-Fatihah${sName ? `, then Surah ${sName}` : ''}.` : sName ? ` We begin with Surah ${sName}.` : '';
  const out: Beat[] = [{ kind: 'intro', say: `Bismillah. We have gathered to make dua for ${name}.${begin}` }];
  if (fatihah) out.push({ kind: 'surah', s: 1 });
  if (surah) out.push({ kind: 'surah', s: surah });
  for (const d of [SALAWAT, ...GATHER_DUAS]) {
    if (d.parent && !parent) continue;
    const fem = she && !!d.ar.f;
    out.push({ kind: 'dua', dua: d, ar: fem ? d.ar.f : d.ar.m, tl: fem ? d.tl.f : d.tl.m, en: d.en(name, p), clip: fem ? undefined : d.clip });
  }
  out.push({ kind: 'close', say: `May Allah accept this from all of us, and have mercy on ${name}.` });
  return out;
}
