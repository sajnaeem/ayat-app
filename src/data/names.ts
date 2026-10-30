/**
 * Common Muslim names: Arabic spelling, meaning, and where the name appears in the Quran.
 *
 * Rules for this list:
 * - Only meanings that are widely agreed. Where the meaning is disputed (or the name isn't Arabic in origin),
 *   `m` is left out and only the person it honours is shown.
 * - `q` points to an ayah that names the person or word, or to the surah named after it.
 * - `v` lists other common English spellings. Matching ignores case, spaces, hyphens and apostrophes.
 *
 * This list should be reviewed by someone with knowledge of Arabic before launch.
 */
export type NameEntry = {
  n: string; // display spelling
  ar: string;
  m?: string; // meaning
  note?: string;
  q?: { s: number; a: number; label: string };
  v?: string[];
};

export const NAMES: NameEntry[] = [
  // Prophets and people named in the Quran
  { n: 'Muhammad', ar: 'مُحَمَّد', m: 'praised, praiseworthy', note: 'The name of the Prophet ﷺ.', q: { s: 48, a: 29, label: '“Muhammad is the Messenger of Allah” (48:29)' }, v: ['mohammed', 'mohammad', 'mohamed', 'mohamad', 'muhammed', 'mohammod', 'mahomed'] },
  { n: 'Ahmad', ar: 'أَحْمَد', m: 'most praiseworthy', note: 'A name of the Prophet ﷺ, foretold by Isa.', q: { s: 61, a: 6, label: 'Foretold by Isa (61:6)' }, v: ['ahmed', 'ahamed', 'ahmet'] },
  { n: 'Adam', ar: 'آدَم', note: 'The first human and prophet.', q: { s: 2, a: 31, label: 'Allah taught Adam the names (2:31)' } },
  { n: 'Nuh', ar: 'نُوح', note: 'Prophet Nuh (Noah).', q: { s: 71, a: 1, label: 'Surah Nuh (71)' }, v: ['nooh', 'noah'] },
  { n: 'Ibrahim', ar: 'إِبْرَاهِيم', note: 'Prophet Ibrahim (Abraham), the friend of Allah.', q: { s: 14, a: 35, label: 'Surah Ibrahim (14)' }, v: ['ebrahim', 'ibraheem', 'ibrahem', 'abraham'] },
  { n: 'Ismail', ar: 'إِسْمَاعِيل', note: 'Prophet Ismail, son of Ibrahim.', q: { s: 2, a: 127, label: 'Raising the Kaʿbah with Ibrahim (2:127)' }, v: ['ismael', 'ismaeel', 'ismaiel', 'esmail'] },
  { n: 'Ishaq', ar: 'إِسْحَاق', note: 'Prophet Ishaq (Isaac).', q: { s: 37, a: 112, label: 'Good news of Ishaq (37:112)' }, v: ['ishak', 'isaac', 'ishaaq'] },
  { n: 'Yaqub', ar: 'يَعْقُوب', note: 'Prophet Yaqub (Jacob).', q: { s: 2, a: 133, label: 'Yaqub’s last words to his sons (2:133)' }, v: ['yakub', 'yaqoob', 'yakoob', 'yacoub', 'jacob'] },
  { n: 'Yusuf', ar: 'يُوسُف', note: 'Prophet Yusuf (Joseph). His story is “the best of stories”.', q: { s: 12, a: 3, label: 'Surah Yusuf (12)' }, v: ['yousuf', 'yousef', 'yusef', 'yousaf', 'yosef', 'joseph'] },
  { n: 'Musa', ar: 'مُوسَىٰ', note: 'Prophet Musa (Moses), mentioned more than any other prophet.', q: { s: 20, a: 9, label: 'The story of Musa (20:9)' }, v: ['moosa', 'mousa', 'moses'] },
  { n: 'Harun', ar: 'هَارُون', note: 'Prophet Harun (Aaron), brother of Musa.', q: { s: 20, a: 30, label: '“Harun, my brother” (20:30)' }, v: ['haroon', 'haroun', 'aaron'] },
  { n: 'Dawud', ar: 'دَاوُود', note: 'Prophet Dawud (David), given the Zabur.', q: { s: 34, a: 10, label: 'The mountains praised with Dawud (34:10)' }, v: ['dawood', 'daoud', 'dawoud', 'david'] },
  { n: 'Sulayman', ar: 'سُلَيْمَان', note: 'Prophet Sulayman (Solomon).', q: { s: 27, a: 15, label: 'Knowledge given to Dawud and Sulayman (27:15)' }, v: ['sulaiman', 'suleiman', 'sulemaan', 'suleman', 'sulaimaan', 'solomon'] },
  { n: 'Ayyub', ar: 'أَيُّوب', note: 'Prophet Ayyub (Job), known for his patience.', q: { s: 21, a: 83, label: 'Ayyub’s prayer (21:83)' }, v: ['ayub', 'ayoub', 'ayoob', 'job'] },
  { n: 'Yunus', ar: 'يُونُس', note: 'Prophet Yunus (Jonah).', q: { s: 21, a: 87, label: 'His prayer from the darkness (21:87)' }, v: ['younus', 'younis', 'yunis', 'jonah'] },
  { n: 'Zakariya', ar: 'زَكَرِيَّا', note: 'Prophet Zakariya, father of Yahya.', q: { s: 19, a: 2, label: 'Opening of Surah Maryam (19:2)' }, v: ['zakariyya', 'zakaria', 'zakariah', 'zachariah'] },
  { n: 'Yahya', ar: 'يَحْيَىٰ', note: 'Prophet Yahya (John). Allah gave him a name “no one had before”.', q: { s: 19, a: 7, label: 'The name Yahya (19:7)' }, v: ['yahia', 'yehya', 'yahyaa'] },
  { n: 'Isa', ar: 'عِيسَىٰ', note: 'Prophet Isa (Jesus), son of Maryam.', q: { s: 19, a: 34, label: '“That is Isa, son of Maryam” (19:34)' }, v: ['eesa', 'issa', 'esa', 'jesus'] },
  { n: 'Maryam', ar: 'مَرْيَم', note: 'Mother of Isa, the only woman named in the Quran, with a surah named after her.', q: { s: 19, a: 16, label: 'Surah Maryam (19)' }, v: ['mariam', 'maryum', 'mariyam', 'meryem', 'mary'] },
  { n: 'Idris', ar: 'إِدْرِيس', note: 'Prophet Idris.', q: { s: 19, a: 56, label: '“A man of truth and a prophet” (19:56)' }, v: ['idrees', 'idriss', 'edris'] },
  { n: 'Hud', ar: 'هُود', note: 'Prophet Hud, sent to the people of ʿAad.', q: { s: 11, a: 50, label: 'Surah Hud (11)' }, v: ['hood'] },
  { n: 'Salih', ar: 'صَالِح', m: 'righteous', note: 'Prophet Salih, sent to Thamud.', q: { s: 7, a: 73, label: 'Salih and his people (7:73)' }, v: ['saleh', 'saaleh'] },
  { n: 'Shuayb', ar: 'شُعَيْب', note: 'Prophet Shuʿayb, sent to Madyan.', q: { s: 7, a: 85, label: 'Shuʿayb and Madyan (7:85)' }, v: ['shoaib', 'shuaib', 'shoayb'] },
  { n: 'Ilyas', ar: 'إِلْيَاس', note: 'Prophet Ilyas (Elijah).', q: { s: 37, a: 123, label: '“Ilyas was one of the messengers” (37:123)' }, v: ['elias', 'ilias', 'elyas'] },
  { n: 'Luqman', ar: 'لُقْمَان', note: 'Luqman the Wise, whose advice to his son fills a surah.', q: { s: 31, a: 12, label: 'Surah Luqman (31)' }, v: ['lukman', 'loqman', 'luqmaan'] },
  { n: 'Imran', ar: 'عِمْرَان', note: 'Father of Maryam; Surah Al ʿImran is named after his family.', q: { s: 3, a: 33, label: 'The family of ʿImran (3:33)' }, v: ['emran', 'imraan'] },
  { n: 'Zayd', ar: 'زَيْد', m: 'growth, increase', note: 'Zayd ibn Harithah, the only Companion named in the Quran.', q: { s: 33, a: 37, label: 'Zayd in the Quran (33:37)' }, v: ['zaid', 'zayed', 'zeyd'] },
  { n: 'Taha', ar: 'طه', note: 'The opening letters of Surah Taha.', q: { s: 20, a: 1, label: 'Surah Taha (20)' }, v: ['taaha', 'tahaa'] },
  { n: 'Yasin', ar: 'يس', note: 'The opening letters of Surah Yasin.', q: { s: 36, a: 1, label: 'Surah Yasin (36)' }, v: ['yaseen', 'yassin', 'yassine', 'yasseen'] },
  { n: 'Tariq', ar: 'طَارِق', m: 'one who comes by night; the morning star', q: { s: 86, a: 1, label: 'Surah At-Tariq (86)' }, v: ['tarik', 'tareq', 'tarek', 'tareeq'] },

  // Servants of Allah
  { n: 'Abdullah', ar: 'عَبْدُ ٱللَّه', m: 'servant of Allah', q: { s: 72, a: 19, label: '“When the servant of Allah stood” (72:19)' }, v: ['abdallah', 'abdulla', 'abdulah'] },
  { n: 'Abdur-Rahman', ar: 'عَبْدُ ٱلرَّحْمَٰن', m: 'servant of the Most Merciful', q: { s: 25, a: 63, label: 'The servants of the Most Merciful (25:63)' }, v: ['abdurrahman', 'abdulrahman', 'abdelrahman', 'abdirahman', 'abdurahman'] },
  { n: 'Abdur-Rahim', ar: 'عَبْدُ ٱلرَّحِيم', m: 'servant of the Especially Merciful', v: ['abdurrahim', 'abdulrahim', 'abdulraheem', 'abdurraheem'] },
  { n: 'Abdul-Aziz', ar: 'عَبْدُ ٱلْعَزِيز', m: 'servant of the Almighty', v: ['abdulaziz', 'abdelaziz'] },
  { n: 'Abdul-Malik', ar: 'عَبْدُ ٱلْمَلِك', m: 'servant of the King', v: ['abdulmalik', 'abdelmalik'] },
  { n: 'Abdul-Qadir', ar: 'عَبْدُ ٱلْقَادِر', m: 'servant of the All-Powerful', v: ['abdulqadir', 'abdulkadir', 'abdelkader', 'abdulqadeer'] },
  { n: 'Abdul-Karim', ar: 'عَبْدُ ٱلْكَرِيم', m: 'servant of the Most Generous', v: ['abdulkarim', 'abdulkareem', 'abdelkarim'] },
  { n: 'Abdul-Hakim', ar: 'عَبْدُ ٱلْحَكِيم', m: 'servant of the All-Wise', v: ['abdulhakim', 'abdulhakeem'] },
  { n: 'Abdul-Majid', ar: 'عَبْدُ ٱلْمَجِيد', m: 'servant of the Most Glorious', v: ['abdulmajid', 'abdulmajeed'] },
  { n: 'Abdul-Wahid', ar: 'عَبْدُ ٱلْوَاحِد', m: 'servant of the One', v: ['abdulwahid', 'abdulwahed'] },
  { n: 'Abdul-Basit', ar: 'عَبْدُ ٱلْبَاسِط', m: 'servant of the One who expands provision', v: ['abdulbasit', 'abdelbasset'] },
  { n: 'Abdul-Hamid', ar: 'عَبْدُ ٱلْحَمِيد', m: 'servant of the Praiseworthy', v: ['abdulhamid', 'abdulhameed'] },
  { n: 'Abdul-Ghafur', ar: 'عَبْدُ ٱلْغَفُور', m: 'servant of the Most Forgiving', v: ['abdulghafoor', 'abdulghafur'] },

  // Companions and family of the Prophet ﷺ
  { n: 'Ali', ar: 'عَلِيّ', m: 'high, exalted', note: 'ʿAli ibn Abi Talib, cousin and son-in-law of the Prophet ﷺ.', v: ['aly'] },
  { n: 'Umar', ar: 'عُمَر', m: 'life, long-lived', note: 'ʿUmar ibn al-Khattab, the second caliph.', v: ['omar', 'omer', 'umer'] },
  { n: 'Uthman', ar: 'عُثْمَان', note: 'ʿUthman ibn ʿAffan, the third caliph, who compiled the Quran into one book.', v: ['usman', 'osman', 'othman', 'usmaan', 'uthmaan'] },
  { n: 'Hasan', ar: 'حَسَن', m: 'good, beautiful', note: 'Grandson of the Prophet ﷺ.', v: ['hassan', 'hasaan'] },
  { n: 'Husayn', ar: 'حُسَيْن', m: 'little good one (from Hasan)', note: 'Grandson of the Prophet ﷺ.', v: ['hussain', 'hussein', 'husain', 'hossein', 'husein'] },
  { n: 'Hamza', ar: 'حَمْزَة', note: 'Hamzah ibn ʿAbd al-Muttalib, uncle of the Prophet ﷺ, “the lion of Allah”.', v: ['hamzah', 'hamsa'] },
  { n: 'Bilal', ar: 'بِلَال', note: 'Bilal ibn Rabah, the first muʾadhdhin of Islam.', v: ['belal', 'bilaal'] },
  { n: 'Khalid', ar: 'خَالِد', m: 'eternal, lasting', note: 'Khalid ibn al-Walid, “the Sword of Allah”.', v: ['khaled', 'khalied', 'kaled'] },
  { n: 'Anas', ar: 'أَنَس', m: 'warmth, friendliness', note: 'Anas ibn Malik served the Prophet ﷺ for ten years.', v: ['anass'] },
  { n: 'Talha', ar: 'طَلْحَة', note: 'Talhah ibn ʿUbaydillah, one of the ten promised Paradise.', v: ['talhah', 'talah'] },
  { n: 'Saad', ar: 'سَعْد', m: 'good fortune, happiness', note: 'Saʿd ibn Abi Waqqas, one of the ten promised Paradise.', v: ['saadh'] },
  { n: 'Aisha', ar: 'عَائِشَة', m: 'living, full of life', note: 'Mother of the Believers and one of the greatest scholars of Islam.', v: ['ayesha', 'aishah', 'ayisha', 'aysha', 'aiysha', 'ayshah'] },
  { n: 'Khadija', ar: 'خَدِيجَة', note: 'Mother of the Believers, the first person to accept Islam.', v: ['khadijah', 'khadeeja', 'khadeejah', 'hatice'] },
  { n: 'Fatima', ar: 'فَاطِمَة', note: 'Daughter of the Prophet ﷺ, leader of the women of Paradise.', v: ['fatimah', 'fatma', 'fathima', 'fatemeh', 'faatima'] },
  { n: 'Zaynab', ar: 'زَيْنَب', note: 'Name of the Prophet’s ﷺ daughter and of two Mothers of the Believers.', v: ['zainab', 'zeynab', 'zaineb', 'zenab'] },
  { n: 'Ruqayya', ar: 'رُقَيَّة', note: 'Daughter of the Prophet ﷺ.', v: ['ruqayyah', 'ruqaiya', 'rukiye', 'ruqaya', 'roqaya'] },
  { n: 'Hafsa', ar: 'حَفْصَة', note: 'Mother of the Believers, who kept the first written copy of the Quran.', v: ['hafsah', 'hafza', 'hafssa'] },
  { n: 'Sumayya', ar: 'سُمَيَّة', note: 'Sumayyah bint Khayyat, the first martyr of Islam.', v: ['sumayyah', 'sumaya', 'sumaiya', 'somaya'] },
  { n: 'Safiyya', ar: 'صَفِيَّة', m: 'pure, chosen', note: 'Mother of the Believers.', v: ['safiyyah', 'safia', 'safiya', 'safiyah'] },
  { n: 'Amina', ar: 'آمِنَة', m: 'safe, secure', note: 'Mother of the Prophet ﷺ.', v: ['aminah', 'ameena', 'aamina', 'amena'] },
  { n: 'Halima', ar: 'حَلِيمَة', m: 'gentle, forbearing', note: 'Halimah, who nursed the Prophet ﷺ as a baby.', v: ['halimah', 'haleema', 'halema'] },
  { n: 'Asma', ar: 'أَسْمَاء', note: 'Asmaʾ bint Abi Bakr, who helped the Prophet ﷺ during the Hijrah.', v: ['asmaa', 'asmah'] },

  // Words from the Quran and beautiful meanings
  { n: 'Nur', ar: 'نُور', m: 'light', q: { s: 24, a: 35, label: '“Allah is the Light of the heavens and the earth” (24:35)' }, v: ['noor', 'nour', 'nura', 'noora', 'nora'] },
  { n: 'Huda', ar: 'هُدَىٰ', m: 'guidance', q: { s: 2, a: 2, label: '“Guidance for the God-conscious” (2:2)' }, v: ['hoda', 'hudaa'] },
  { n: 'Sakina', ar: 'سَكِينَة', m: 'tranquillity, calm', q: { s: 48, a: 4, label: 'Tranquillity sent down into hearts (48:4)' }, v: ['sakinah', 'sakeena', 'sakeenah'] },
  { n: 'Rahma', ar: 'رَحْمَة', m: 'mercy', q: { s: 7, a: 156, label: '“My mercy encompasses all things” (7:156)' }, v: ['rahmah', 'rehma'] },
  { n: 'Jannah', ar: 'جَنَّة', m: 'garden, Paradise', q: { s: 3, a: 133, label: 'A garden as wide as the heavens and earth (3:133)' }, v: ['jana', 'janna', 'jannat'] },
  { n: 'Firdaws', ar: 'فِرْدَوْس', m: 'the highest garden of Paradise', q: { s: 18, a: 107, label: 'The gardens of Firdaws (18:107)' }, v: ['firdous', 'firdaus', 'firdose', 'firdos'] },
  { n: 'Kawthar', ar: 'كَوْثَر', m: 'abundance; a river in Paradise', q: { s: 108, a: 1, label: 'Surah Al-Kawthar (108)' }, v: ['kausar', 'kawsar', 'kauthar', 'kevser', 'kosar'] },
  { n: 'Ridwan', ar: 'رِضْوَان', m: 'Allah’s pleasure and approval', q: { s: 9, a: 72, label: '“Approval from Allah is greater” (9:72)' }, v: ['rizwan', 'redwan', 'rizwaan', 'ridhwan'] },
  { n: 'Naeem', ar: 'نَعِيم', m: 'bliss, delight', q: { s: 82, a: 13, label: '“The righteous will be in bliss” (82:13)' }, v: ['naim', 'naeim', 'nayeem'] },
  { n: 'Karim', ar: 'كَرِيم', m: 'generous, noble', q: { s: 82, a: 6, label: '“Your Lord, the Most Generous” (82:6)' }, v: ['kareem', 'kerim'] },
  { n: 'Iman', ar: 'إِيمَان', m: 'faith', v: ['eman', 'imaan', 'emaan'] },
  { n: 'Dua', ar: 'دُعَاء', m: 'supplication, prayer', q: { s: 40, a: 60, label: '“Call upon Me; I will respond” (40:60)' }, v: ['duaa', 'doaa', 'doa'] },
  { n: 'Ayat', ar: 'آيَات', m: 'signs; verses of the Quran', v: ['ayaat', 'aayat'] },
  { n: 'Ihsan', ar: 'إِحْسَان', m: 'excellence; doing good', q: { s: 55, a: 60, label: '“Is the reward for good anything but good?” (55:60)' }, v: ['ehsan', 'ihsaan', 'ehsaan'] },
  { n: 'Sabr', ar: 'صَبْر', m: 'patience', q: { s: 2, a: 153, label: '“Seek help through patience and prayer” (2:153)' } },
  { n: 'Amal', ar: 'أَمَل', m: 'hope', v: ['aamal'] },
  { n: 'Hiba', ar: 'هِبَة', m: 'gift', v: ['hibah', 'heba'] },
  { n: 'Ilham', ar: 'إِلْهَام', m: 'inspiration', v: ['elham', 'ilhaam'] },
  { n: 'Inaya', ar: 'عِنَايَة', m: 'care, concern', v: ['inayah', 'enaya', 'inaaya'] },
  { n: 'Layla', ar: 'لَيْلَىٰ', m: 'night', v: ['laila', 'leila', 'leyla', 'lailah', 'laylah'] },
  { n: 'Yasmin', ar: 'يَاسْمِين', m: 'jasmine', v: ['yasmine', 'yasmeen', 'jasmin', 'jasmine', 'yazmin'] },
  { n: 'Zahra', ar: 'زَهْرَاء', m: 'radiant, shining', note: 'A title of Fatimah, daughter of the Prophet ﷺ.', v: ['zahraa', 'zehra'] },
  { n: 'Amira', ar: 'أَمِيرَة', m: 'princess, leader', v: ['ameera', 'amirah', 'ameerah'] },
  { n: 'Aaliyah', ar: 'عَالِيَة', m: 'high, exalted', v: ['aliyah', 'aliya', 'aaliya', 'alia', 'aliyaa'] },
  { n: 'Salma', ar: 'سَلْمَىٰ', m: 'peaceful, safe', v: ['selma', 'salmah'] },
  { n: 'Malak', ar: 'مَلَاك', m: 'angel', v: ['malaak'] },
  { n: 'Hana', ar: 'هَنَاء', m: 'happiness, contentment', v: ['hanaa', 'hanna', 'hannah'] },
  { n: 'Sara', ar: 'سَارَة', note: 'Sarah, wife of Prophet Ibrahim.', v: ['sarah', 'saara'] },
  { n: 'Samira', ar: 'سَمِيرَة', m: 'companion in evening conversation', v: ['sameera', 'samirah', 'sameerah'] },
  { n: 'Rania', ar: 'رَانِيَة', m: 'one who gazes', v: ['raniya', 'raniah', 'raaniya'] },

  // Popular boys’ names
  { n: 'Mustafa', ar: 'مُصْطَفَىٰ', m: 'the chosen one', note: 'A title of the Prophet ﷺ.', v: ['mustapha', 'mostafa', 'moustafa', 'mustafaa'] },
  { n: 'Mahmud', ar: 'مَحْمُود', m: 'praised', v: ['mahmood', 'mahmoud', 'mehmood', 'mahmut'] },
  { n: 'Hamid', ar: 'حَامِد', m: 'one who praises Allah', v: ['hameed', 'hamed', 'haamid'] },
  { n: 'Rashid', ar: 'رَاشِد', m: 'rightly guided', v: ['rashed', 'rasheed', 'raashid'] },
  { n: 'Hadi', ar: 'هَادِي', m: 'guide', v: ['haadi', 'hady'] },
  { n: 'Amir', ar: 'أَمِير', m: 'prince, commander', v: ['ameer', 'emir'] },
  { n: 'Aamir', ar: 'عَامِر', m: 'full of life, prosperous', v: ['amer', 'aamer'] },
  { n: 'Ammar', ar: 'عَمَّار', m: 'one who builds, full of life', note: 'ʿAmmar ibn Yasir, an early Companion.', v: ['amaar', 'ammaar'] },
  { n: 'Faris', ar: 'فَارِس', m: 'knight, horseman', v: ['fares', 'faaris'] },
  { n: 'Mansur', ar: 'مَنْصُور', m: 'victorious, given help', v: ['mansoor', 'mansour'] },
  { n: 'Nasir', ar: 'نَاصِر', m: 'helper, supporter', v: ['nasser', 'naser'] },
  { n: 'Qasim', ar: 'قَاسِم', m: 'one who shares out', note: 'The name of the Prophet’s ﷺ son; his kunyah was Abu al-Qasim.', v: ['kasim', 'qassim', 'qaasim', 'kassim'] },
  { n: 'Said', ar: 'سَعِيد', m: 'happy, fortunate', v: ['saeed', 'sayeed'] },
  { n: 'Salim', ar: 'سَلِيم', m: 'safe, sound', v: ['saleem', 'selim', 'salem'] },
  { n: 'Sami', ar: 'سَامِي', m: 'elevated, lofty', v: ['samy', 'saami'] },
  { n: 'Zain', ar: 'زَيْن', m: 'beauty, grace', v: ['zayn', 'zane', 'zein'] },
  { n: 'Rayyan', ar: 'رَيَّان', m: 'well-watered, quenched', note: 'Ar-Rayyan is the gate of Paradise for those who fast.', v: ['rayan', 'raiyan', 'rayaan'] },
  { n: 'Adil', ar: 'عَادِل', m: 'just, fair', v: ['adel', 'aadil', 'aadel'] },
  { n: 'Ayman', ar: 'أَيْمَن', m: 'blessed, fortunate', v: ['aiman', 'eyman'] },
  { n: 'Basim', ar: 'بَاسِم', m: 'smiling', v: ['basem', 'baasim', 'bassem'] },
  { n: 'Faisal', ar: 'فَيْصَل', m: 'one who judges decisively', v: ['faysal', 'feisal', 'faizal'] },
  { n: 'Irfan', ar: 'عِرْفَان', m: 'knowledge, recognition', v: ['erfan', 'irfaan'] },
  { n: 'Jamal', ar: 'جَمَال', m: 'beauty', v: ['jamaal', 'gamal'] },
  { n: 'Kamal', ar: 'كَمَال', m: 'perfection, completeness', v: ['kamaal', 'kemal'] },
  { n: 'Majid', ar: 'مَاجِد', m: 'glorious, noble', v: ['majed', 'maajid', 'majeed'] },
  { n: 'Munir', ar: 'مُنِير', m: 'radiant, giving light', v: ['muneer', 'mounir'] },
  { n: 'Nabil', ar: 'نَبِيل', m: 'noble', v: ['nabeel'] },
  { n: 'Sajid', ar: 'سَاجِد', m: 'one who prostrates in prayer', v: ['sajed', 'saajid'] },
  { n: 'Shakir', ar: 'شَاكِر', m: 'thankful', v: ['shaker', 'shaakir'] },
  { n: 'Tahir', ar: 'طَاهِر', m: 'pure', v: ['taher', 'taahir'] },
  { n: 'Yasir', ar: 'يَاسِر', m: 'one who makes things easy', note: 'Yasir ibn ʿAmir, father of ʿAmmar, an early Muslim.', v: ['yaser', 'yasser', 'yaasir'] },
  { n: 'Walid', ar: 'وَلِيد', m: 'newborn', v: ['waleed', 'walied', 'oualid'] },
  { n: 'Ibad', ar: 'عِبَاد', m: 'servants (of Allah)', v: ['ebad', 'ibaad'] },
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');

const INDEX = new Map<string, NameEntry>();
for (const e of NAMES) {
  for (const k of [e.n, ...(e.v ?? [])]) {
    const key = norm(k);
    if (key && !INDEX.has(key)) INDEX.set(key, e);
  }
}

/**
 * Finds the meaning of a display name: first the whole name ("Abdur Rahman"), then the first word ("Yusuf Khan").
 * Returns null when there's no confident match, so nothing is shown rather than a guess.
 */
export function lookupName(display: string): NameEntry | null {
  const whole = norm(display);
  if (whole.length < 2) return null;
  const hit = INDEX.get(whole);
  if (hit) return hit;
  const first = norm(display.trim().split(/\s+/)[0] ?? '');
  // "Abdul Rahman" → "abdulrahman" handled above; "Abdul" alone isn't a name.
  if (first.length < 2 || first === 'abdul' || first === 'abd' || first === 'abu') return null;
  return INDEX.get(first) ?? null;
}
