#!/usr/bin/env python3
"""
Builds src/data/feedMore.ts: more For you cards from sources Munib already has (Saj, 15 Nov 2026:
"keep populating the For you tab with almost infinite content").

  - Duas: chosen chapters of the Hisn al-Muslim library already in src/data/duas.ts (Arabic, English and
    transliteration exactly as in that library), plus its 20 Quran duas, with a feed title and moods.
  - Names of Allah: all 99 in the list narrated in Jamiʿ at-Tirmidhi 3507. Where a name (or the verb it comes
    from) appears in the Quran, the card quotes that ayah in Saheeh International, taken from quran-json, and this
    script CHECKS that the Arabic really appears in that ayah before using it. Names not found in the Quran point
    to the hadith instead, with a short plain explanation.
  - Surah introductions: all 114, with Munib's own one-line summary of what each surah is about (written for
    Munib, flagged for a scholar's check), its number of ayat and where it was revealed (from surahs.json).

Usage: python3 scripts/build-feed-more.py <path to quran-json package>   (e.g. node_modules/quran-json or an npm pack)
"""
import json, re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QJ = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'node_modules', 'quran-json')
CH = lambda s: json.load(open(os.path.join(QJ, 'dist', 'chapters', 'en', f'{s}.json')))

HARAKAT = re.compile('[ؐ-ًؚ-ٰٟۖ-ۭـ]')
def norm(t: str) -> str:
    t = HARAKAT.sub('', t)
    for a, b in (('ٱ', 'ا'), ('أ', 'ا'), ('إ', 'ا'), ('آ', 'ا'), ('ى', 'ي'), ('ة', 'ه'), ('ؤ', 'و'), ('ئ', 'ي'), ('ء', '')):
        t = t.replace(a, b)
    return re.sub(r'\s+', ' ', t)

_cache = {}
def ayah(s, a):
    if s not in _cache:
        _cache[s] = CH(s)['verses']
    v = _cache[s][a - 1]
    tr = v['translation'].strip()
    if not re.search(r'[.!?"”’)\]]$', tr):
        tr += '.'
    return v['text'], tr

# ---------------------------------------------------------------- Names of Allah
# (transliteration, Arabic, meaning, (surah, ayah, words that must appear in it) or None, explanation if not in the Quran, moods)
T = 'Jamiʿ at-Tirmidhi 3507'
NAMES = [
    ('Ar-Raḥmān', 'الرَّحْمَٰن', 'The Entirely Merciful', (1, 3, 'الرحمن'), None, []),
    ('Ar-Raḥīm', 'الرَّحِيم', 'The Especially Merciful', (1, 3, 'الرحيم'), None, ['forgiveness']),
    ('Al-Malik', 'الْمَلِك', 'The King', (59, 23, 'الملك'), None, []),
    ('Al-Quddūs', 'الْقُدُّوس', 'The Most Pure', (59, 23, 'القدوس'), None, []),
    ('As-Salām', 'السَّلَام', 'The Source of Peace', (59, 23, 'السلم'), None, ['anxious']),
    ('Al-Muʾmin', 'الْمُؤْمِن', 'The Giver of Safety', (59, 23, 'المومن'), None, ['anxious']),
    ('Al-Muhaymin', 'الْمُهَيْمِن', 'The Watchful Guardian', (59, 23, 'المهيمن'), None, []),
    ('Al-ʿAzīz', 'الْعَزِيز', 'The Almighty', (59, 23, 'العزيز'), None, ['strength']),
    ('Al-Jabbār', 'الْجَبَّار', 'The Compeller, who mends what is broken', (59, 23, 'الجبار'), None, ['grieving']),
    ('Al-Mutakabbir', 'الْمُتَكَبِّر', 'The Supreme in Greatness', (59, 23, 'المتكبر'), None, []),
    ('Al-Khāliq', 'الْخَالِق', 'The Creator', (59, 24, 'الخلق'), None, []),
    ('Al-Bāriʾ', 'الْبَارِئ', 'The Maker, who brings into being', (59, 24, 'البارى'), None, []),
    ('Al-Muṣawwir', 'الْمُصَوِّر', 'The Fashioner of forms', (59, 24, 'المصور'), None, ['parenting']),
    ('Al-Ghaffār', 'الْغَفَّار', 'The Ever-Forgiving', (71, 10, 'غفارا'), None, ['forgiveness']),
    ('Al-Qahhār', 'الْقَهَّار', 'The Subduer of all', (38, 65, 'القهار'), None, []),
    ('Al-Wahhāb', 'الْوَهَّاب', 'The Giver of Gifts', (3, 8, 'الوهاب'), None, ['grateful', 'parenting']),
    ('Al-Fattāḥ', 'الْفَتَّاح', 'The Opener', (34, 26, 'الفتاح'), None, ['money', 'guidance']),
    ('Al-ʿAlīm', 'الْعَلِيم', 'The All-Knowing', (2, 32, 'العليم'), None, []),
    ('Al-Qābiḍ', 'الْقَابِض', 'The Withholder', (2, 245, 'يقبض'), None, ['money']),
    ('Al-Bāsiṭ', 'الْبَاسِط', 'The Extender', (2, 245, 'يبصط'), None, ['money']),
    ('Al-Khāfiḍ', 'الْخَافِض', 'The One who lowers', None, 'He lowers whom He wills: no rank or status in this world is ever beyond Him.', []),
    ('Ar-Rāfiʿ', 'الرَّافِع', 'The One who raises', (6, 83, 'نرفع'), None, ['strength']),
    ('Al-Muʿizz', 'الْمُعِزّ', 'The Giver of Honour', (3, 26, 'وتعز'), None, []),
    ('Al-Mudhill', 'الْمُذِلّ', 'The One who humbles', (3, 26, 'وتذل'), None, []),
    ('As-Samīʿ', 'السَّمِيع', 'The All-Hearing', (2, 127, 'السميع'), None, ['lonely']),
    ('Al-Baṣīr', 'الْبَصِير', 'The All-Seeing', (42, 11, 'البصير'), None, []),
    ('Al-Ḥakam', 'الْحَكَم', 'The Judge', (6, 114, 'حكما'), None, ['conflict']),
    ('Al-ʿAdl', 'الْعَدْل', 'The Utterly Just', None, 'He never wrongs anyone, even by the weight of an atom (Quran 4:40).', ['conflict']),
    ('Al-Laṭīf', 'اللَّطِيف', 'The Subtly Kind', (67, 14, 'اللطيف'), None, ['anxious']),
    ('Al-Khabīr', 'الْخَبِير', 'The All-Aware', (67, 14, 'الخبير'), None, []),
    ('Al-Ḥalīm', 'الْحَلِيم', 'The Forbearing', (2, 225, 'حليم'), None, ['forgiveness']),
    ('Al-ʿAẓīm', 'الْعَظِيم', 'The Magnificent', (42, 4, 'العظيم'), None, []),
    ('Al-Ghafūr', 'الْغَفُور', 'The All-Forgiving', (39, 53, 'الغفور'), None, ['forgiveness']),
    ('Ash-Shakūr', 'الشَّكُور', 'The Most Appreciative', (35, 30, 'شكور'), None, ['grateful']),
    ('Al-ʿAliyy', 'الْعَلِيّ', 'The Most High', (42, 4, 'العلي'), None, []),
    ('Al-Kabīr', 'الْكَبِير', 'The Most Great', (22, 62, 'الكبير'), None, []),
    ('Al-Ḥafīẓ', 'الْحَفِيظ', 'The Preserver', (11, 57, 'حفيظ'), None, ['anxious']),
    ('Al-Muqīt', 'الْمُقِيت', 'The Nourisher', (4, 85, 'مقيتا'), None, ['money']),
    ('Al-Ḥasīb', 'الْحَسِيب', 'The Reckoner, who is enough', (33, 39, 'حسيبا'), None, []),
    ('Al-Jalīl', 'الْجَلِيل', 'The Majestic', None, 'All majesty belongs to Him. The Quran calls Him “the Owner of Majesty and Honour” (55:27).', []),
    ('Al-Karīm', 'الْكَرِيم', 'The Most Generous', (82, 6, 'الكريم'), None, ['grateful']),
    ('Ar-Raqīb', 'الرَّقِيب', 'The Ever-Watchful', (4, 1, 'رقيبا'), None, ['temptation']),
    ('Al-Mujīb', 'الْمُجِيب', 'The One who Answers', (11, 61, 'مجيب'), None, ['lonely', 'anxious']),
    ('Al-Wāsiʿ', 'الْوَاسِع', 'The All-Encompassing', (2, 115, 'وسع'), None, []),
    ('Al-Ḥakīm', 'الْحَكِيم', 'The All-Wise', (2, 32, 'الحكيم'), None, ['guidance']),
    ('Al-Wadūd', 'الْوَدُود', 'The Most Loving', (85, 14, 'الودود'), None, ['lonely']),
    ('Al-Majīd', 'الْمَجِيد', 'The Most Glorious', (11, 73, 'مجيد'), None, []),
    ('Al-Bāʿith', 'الْبَاعِث', 'The Resurrector', (22, 7, 'يبعث'), None, []),
    ('Ash-Shahīd', 'الشَّهِيد', 'The Witness', (4, 79, 'شهيدا'), None, ['conflict']),
    ('Al-Ḥaqq', 'الْحَقّ', 'The Truth', (22, 6, 'الحق'), None, ['guidance']),
    ('Al-Wakīl', 'الْوَكِيل', 'The Trustee, the one to rely on', (3, 173, 'الوكيل'), None, ['anxious']),
    ('Al-Qawiyy', 'الْقَوِيّ', 'The All-Strong', (22, 74, 'لقوي'), None, ['strength']),
    ('Al-Matīn', 'الْمَتِين', 'The Firm', (51, 58, 'المتين'), None, ['strength']),
    ('Al-Waliyy', 'الْوَلِيّ', 'The Protecting Friend', (42, 28, 'الولي'), None, ['lonely']),
    ('Al-Ḥamīd', 'الْحَمِيد', 'The Praiseworthy', (42, 28, 'الحميد'), None, ['grateful']),
    ('Al-Muḥṣī', 'الْمُحْصِي', 'The One who counts all things', (72, 28, 'واحصي'), None, []),
    ('Al-Mubdiʾ', 'الْمُبْدِئ', 'The Originator', (85, 13, 'يبدي'), None, []),
    ('Al-Muʿīd', 'الْمُعِيد', 'The Restorer', (85, 13, 'ويعيد'), None, []),
    ('Al-Muḥyī', 'الْمُحْيِي', 'The Giver of Life', (30, 50, 'لمحي'), None, []),
    ('Al-Mumīt', 'الْمُمِيت', 'The Taker of Life', (57, 2, 'ويميت'), None, ['grieving']),
    ('Al-Ḥayy', 'الْحَيّ', 'The Ever-Living', (3, 2, 'الحي'), None, ['grieving']),
    ('Al-Qayyūm', 'الْقَيُّوم', 'The Sustainer of all', (3, 2, 'القيوم'), None, ['anxious']),
    ('Al-Wājid', 'الْوَاجِد', 'The One who lacks nothing', None, 'He finds whatever He wants and lacks nothing at all.', []),
    ('Al-Mājid', 'الْمَاجِد', 'The Noble', None, 'Glorious in His nature and generous in what He gives.', []),
    ('Al-Wāḥid', 'الْوَاحِد', 'The One', (38, 65, 'الوحد'), None, ['newmuslim']),
    ('Al-Aḥad', 'الْأَحَد', 'The Unique', (112, 1, 'احد'), None, ['newmuslim']),
    ('Aṣ-Ṣamad', 'الصَّمَد', 'The Eternal Refuge', (112, 2, 'الصمد'), None, ['anxious', 'newmuslim']),
    ('Al-Qādir', 'الْقَادِر', 'The All-Able', (6, 65, 'القادر'), None, ['strength']),
    ('Al-Muqtadir', 'الْمُقْتَدِر', 'The All-Powerful', (54, 55, 'مقتدر'), None, []),
    ('Al-Muqaddim', 'الْمُقَدِّم', 'The One who brings forward', None, 'He brings forward whatever He wills, at the time He knows is best.', []),
    ('Al-Muʾakhkhir', 'الْمُؤَخِّر', 'The One who delays', None, 'When something you hoped for is delayed, it is held by the One who knows its best time.', ['anxious']),
    ('Al-Awwal', 'الْأَوَّل', 'The First', (57, 3, 'الاول'), None, []),
    ('Al-Ākhir', 'الْآخِر', 'The Last', (57, 3, 'والاخر'), None, []),
    ('Aẓ-Ẓāhir', 'الظَّاهِر', 'The Manifest', (57, 3, 'والظهر'), None, []),
    ('Al-Bāṭin', 'الْبَاطِن', 'The Hidden', (57, 3, 'والباطن'), None, []),
    ('Al-Wālī', 'الْوَالِي', 'The Governor of all', None, 'He governs everything that exists; nothing is outside His care.', []),
    ('Al-Mutaʿālī', 'الْمُتَعَالِي', 'The Most Exalted', (13, 9, 'المتعال'), None, []),
    ('Al-Barr', 'الْبَرّ', 'The Source of all Goodness', (52, 28, 'البر'), None, ['grateful']),
    ('At-Tawwāb', 'التَّوَّاب', 'The Ever-Accepting of repentance', (2, 37, 'التواب'), None, ['forgiveness', 'temptation']),
    ('Al-Muntaqim', 'الْمُنْتَقِم', 'The One who brings justice on wrongdoers', (32, 22, 'منتقمون'), None, []),
    ('Al-ʿAfuww', 'الْعَفُوّ', 'The Pardoner, who erases sins', (4, 99, 'عفوا'), None, ['forgiveness']),
    ('Ar-Raʾūf', 'الرَّءُوف', 'The Most Kind', (2, 207, 'رءوف'), None, ['lonely']),
    ('Mālik al-Mulk', 'مَالِكُ الْمُلْك', 'The Owner of all Sovereignty', (3, 26, 'ملك الملك'), None, []),
    ('Dhul-Jalāli wal-Ikrām', 'ذُو الْجَلَالِ وَالْإِكْرَام', 'The Owner of Majesty and Honour', (55, 27, 'والاكرام'), None, ['grieving']),
    ('Al-Muqsiṭ', 'الْمُقْسِط', 'The Equitable', (3, 18, 'بالقسط'), None, ['conflict']),
    ('Al-Jāmiʿ', 'الْجَامِع', 'The Gatherer', (3, 9, 'جامع'), None, ['grieving', 'family']),
    ('Al-Ghaniyy', 'الْغَنِيّ', 'The Self-Sufficient', (35, 15, 'الغني'), None, ['money']),
    ('Al-Mughnī', 'الْمُغْنِي', 'The Enricher', (24, 32, 'يغنهم'), None, ['money']),
    ('Al-Māniʿ', 'الْمَانِع', 'The Preventer', None, 'He holds back what would harm you, even when you cannot see it.', ['anxious']),
    ('Aḍ-Ḍārr', 'الضَّارّ', 'The One in whose hand harm lies', (6, 17, 'بضر'), None, []),
    ('An-Nāfiʿ', 'النَّافِع', 'The One in whose hand benefit lies', (6, 17, 'بخير'), None, []),
    ('An-Nūr', 'النُّور', 'The Light', (24, 35, 'نور'), None, ['guidance']),
    ('Al-Hādī', 'الْهَادِي', 'The Guide', (22, 54, 'لهاد'), None, ['guidance', 'newmuslim']),
    ('Al-Badīʿ', 'الْبَدِيع', 'The Originator, without any model', (2, 117, 'بديع'), None, []),
    ('Al-Bāqī', 'الْبَاقِي', 'The Everlasting', (55, 27, 'ويبقي'), None, ['grieving']),
    ('Al-Wārith', 'الْوَارِث', 'The Inheritor of all', (15, 23, 'الورثون'), None, []),
    ('Ar-Rashīd', 'الرَّشِيد', 'The Guide to what is right', None, 'He guides all things to their right end, with perfect wisdom.', ['guidance']),
    ('Aṣ-Ṣabūr', 'الصَّبُور', 'The Most Patient', None, 'He is patient with His servants and does not hurry to punish.', ['forgiveness']),
]

# ---------------------------------------------------------------- Duas: Hisn al-Muslim chapters for the feed
# chapter id → (feed title, moods, how many of its duas to use)
DUA_PICK = {
    27: ('For the morning and evening', [], 6),
    28: ('Before you sleep', ['anxious'], 4),
    1: ('When you wake up', [], 2),
    8: ('Before wudu', ['newmuslim'], 1),
    9: ('After wudu', ['newmuslim'], 2),
    10: ('As you leave home', ['anxious'], 2),
    11: ('As you come home', ['family'], 1),
    12: ('On the way to the mosque', [], 1),
    13: ('Entering the mosque', ['newmuslim'], 1),
    14: ('Leaving the mosque', [], 1),
    15: ('When you hear the adhan', ['newmuslim'], 3),
    2: ('Getting dressed', [], 1),
    3: ('In new clothes', [], 1),
    25: ('After the prayer', [], 4),
    29: ('If you wake in the night', ['anxious'], 1),
    30: ('When you are afraid or can’t sleep', ['anxious', 'lonely'], 1),
    31: ('After a bad dream', ['anxious'], 2),
    34: ('In worry and grief', ['anxious', 'grieving'], 2),
    35: ('When anguish takes hold', ['anxious', 'grieving'], 4),
    39: ('When you fear people may harm you', ['anxious'], 1),
    40: ('When doubts come to you', ['guidance', 'temptation'], 3),
    41: ('When debt weighs on you', ['money'], 2),
    42: ('When you are distracted in prayer', ['temptation'], 1),
    43: ('When something feels too hard', ['strength'], 1),
    44: ('After a sin', ['forgiveness', 'temptation'], 1),
    45: ('Against whispers', ['temptation'], 3),
    46: ('When things don’t go your way', ['strength', 'grieving'], 1),
    47: ('For new parents', ['parenting', 'family'], 1),
    48: ('Protection for children', ['parenting'], 1),
    49: ('Visiting someone who is ill', ['unwell'], 2),
    51: ('When you are very ill', ['unwell'], 3),
    53: ('When loss comes', ['grieving'], 1),
    57: ('For a family that has lost someone', ['grieving'], 1),
    60: ('Visiting the graves', ['grieving'], 1),
    61: ('When the wind blows', [], 2),
    62: ('When you hear thunder', [], 1),
    63: ('Asking for rain', [], 2),
    64: ('When it rains', ['grateful'], 1),
    65: ('After the rain', ['grateful'], 1),
    67: ('When you see the new moon', [], 1),
    68: ('Breaking your fast', [], 2),
    69: ('Before you eat', ['newmuslim'], 2),
    70: ('After you eat', ['grateful'], 2),
    71: ('For your host', ['grateful'], 1),
    72: ('For someone who gives you a drink', ['grateful'], 1),
    76: ('The first fruit of the season', ['grateful'], 1),
    77: ('When you sneeze', ['newmuslim'], 1),
    79: ('For a newly married couple', ['marriage'], 1),
    82: ('When you feel angry', ['angry'], 1),
    83: ('When you see someone suffering', ['grateful'], 1),
    85: ('Before you leave a gathering', [], 1),
    86: ('When someone says “May Allah forgive you”', [], 1),
    87: ('For someone who does you a kindness', ['grateful'], 1),
    89: ('When someone says “I love you for the sake of Allah”', ['family'], 1),
    90: ('For someone who shares their wealth with you', ['money', 'grateful'], 1),
    91: ('When you repay a loan', ['money'], 1),
    92: ('Against hidden shirk', [], 1),
    93: ('When someone says “May Allah bless you”', [], 1),
    94: ('Against bad omens', ['anxious'], 1),
    95: ('Getting in a car or on a journey', [], 1),
    96: ('Setting off on a journey', [], 1),
    97: ('Arriving in a town or city', [], 1),
    98: ('Entering a market or shopping centre', ['money'], 1),
    100: ('For the family you leave behind', ['family'], 1),
    101: ('For someone setting off on a journey', ['family'], 2),
    105: ('Coming home from a journey', ['grateful'], 1),
    106: ('When something pleases or upsets you', ['grateful', 'strength'], 1),
    112: ('For someone you spoke badly to', ['conflict', 'forgiveness'], 1),
    114: ('When someone praises you', [], 1),
    122: ('When you are startled', ['anxious'], 2),
    123: ('When good news comes', ['grateful'], 1),
    124: ('When you feel pain in your body', ['unwell'], 1),
    125: ('When you admire something', [], 1),
    126: ('When you feel frightened', ['anxious'], 1),
    129: ('Asking forgiveness', ['forgiveness'], 4),
    130: ('Words of remembrance', ['anxious', 'grateful'], 6),
    131: ('How the Prophet ﷺ glorified Allah', [], 1),
}
# The 20 Quran duas (ids 201–220) all go in, with these moods.
QURAN_DUA_MOODS = {
    201: ['guidance'], 202: ['strength'], 203: ['strength', 'anxious'], 204: ['guidance', 'temptation'], 205: ['forgiveness'],
    206: ['parenting'], 207: ['family'], 208: ['family'], 209: ['guidance'], 210: ['anxious'], 211: ['guidance'],
    212: ['unwell'], 213: ['parenting', 'marriage'], 214: ['forgiveness'], 215: ['marriage', 'family'], 216: ['money'],
    217: ['anxious'], 218: ['grateful', 'family'], 219: ['conflict', 'grieving'], 220: ['guidance'],
}
MAX_AR = 260  # longer duas don't fit on one card: they stay in Find a dua
MAX_EN = 330
MAX_AYAH = 240  # a name's ayah longer than this is swapped for the shortest ayah that also contains it

def tidy(en: str) -> str:
    en = en.strip()
    if en.startswith('(') and en.endswith(')') and en.count('(') == 1:
        en = en[1:-1].strip()
    return en

# ---------------------------------------------------------------- Surah introductions (Munib's own words; scholar check)
SURAH_ABOUT = {
    1: 'The opening of the Quran and of every prayer: praise of Allah, and a request to be guided on the straight path.',
    2: 'The longest surah: faith, the story of the Children of Israel, fasting, Hajj, family and money, and Ayat al-Kursi.',
    3: 'Holding firm in faith after setbacks, the family of ʿImran, Maryam and ʿIsa, and the battle of Uhud.',
    4: 'Justice and care for the weak: women, orphans, inheritance and fairness in the family.',
    5: 'Keeping promises, what is lawful to eat, and the story of the table spread from heaven.',
    6: 'Allah’s oneness shown through creation, and Ibrahim’s search for his Lord among the stars, moon and sun.',
    7: 'The story of humankind from Adam, the prophets who came after him, and the people on the Heights.',
    8: 'Lessons from the battle of Badr: trust, unity and keeping faith in hard moments.',
    9: 'The only surah without the basmalah: sincerity, hypocrisy and those who stayed behind from Tabuk.',
    10: 'Yunus and his people, the only nation saved by turning back to Allah in time.',
    11: 'Hud, Nuh and other prophets who stayed firm while their people turned away.',
    12: 'The full story of Yusuf, called “the most beautiful of stories”: betrayal, patience and forgiveness.',
    13: 'Thunder glorifies Allah, and hearts find rest in His remembrance.',
    14: 'Ibrahim’s prayers for his family and for Makkah, and the good word like a good tree.',
    15: 'Named after a valley where an earlier people lived; Allah promises to protect the Quran.',
    16: 'The bee, and the countless blessings of Allah in nature that call us to gratitude.',
    17: 'The Night Journey from Makkah to Jerusalem, and how to treat parents with kindness.',
    18: 'The young men of the cave, the two gardens, Musa and al-Khidr, and Dhul-Qarnayn. Many read it on Fridays.',
    19: 'Maryam and the birth of ʿIsa, Zakariyya’s quiet prayer for a son, and Ibrahim with his father.',
    20: 'Musa from the basket on the river to standing before Pharaoh, and Adam’s turning back.',
    21: 'The prophets as one family, each one calling on Allah in their hardest moment.',
    22: 'Hajj, the call of Ibrahim to the people, and the rites that remember him.',
    23: 'The qualities of the successful believers, starting with humility in prayer.',
    24: 'Light upon light: modesty, family and the Ayah of Light.',
    25: 'The Criterion between right and wrong, and the gentle qualities of the servants of the Most Merciful.',
    26: 'The poets, and Musa, Ibrahim, Nuh and others, each told with the same refrain of Allah’s mercy.',
    27: 'Sulayman, the ant, the hoopoe and the Queen of Sheba.',
    28: 'Musa’s early life, his mother’s trust in Allah, and Qarun and his wealth.',
    29: 'The spider’s fragile house: faith is tested, and the tested are not left alone.',
    30: 'The Romans’ defeat and promised victory, and Allah’s signs in love, sleep and languages.',
    31: 'Luqman’s wise advice to his son about faith, parents, prayer and humility.',
    32: 'The prostration: creation, the next life, and those who rise from their beds to call on their Lord.',
    33: 'The Confederates who besieged Madinah, and the family of the Prophet ﷺ.',
    34: 'Sheba, a people blessed with gardens who turned from gratitude, and Dawud and Sulayman.',
    35: 'Allah, the Originator of the heavens and the earth, and the angels with wings.',
    36: 'Often called the heart of the Quran: the message, the townspeople, and life after death.',
    37: 'Those lined up in ranks: Ibrahim’s sacrifice, Yunus in the whale and other prophets.',
    38: 'Dawud and Sulayman, and Ayyub’s patience in illness.',
    39: 'The groups on the Last Day, and the call: “do not despair of the mercy of Allah.”',
    40: 'The believer in Pharaoh’s family who spoke up for Musa, and the call to make dua.',
    41: 'The Quran explained in detail, and the angels who come to those who stay firm.',
    42: 'Consultation: deciding matters together, forgiving and patience.',
    43: 'The gold ornaments of this world, and how little they weigh with Allah.',
    44: 'The smoke, Pharaoh’s fall, and the night the Quran was sent down.',
    45: 'The kneeling of every nation on the Last Day, and Allah’s signs all around us.',
    46: 'The sand dunes of the people of Hud, and kindness to parents.',
    47: 'Named after the Prophet Muhammad ﷺ: faith in action, and reflecting on the Quran.',
    48: 'The clear victory of the treaty of Hudaybiyah, and tranquillity sent into hearts.',
    49: 'The rooms of the Prophet ﷺ: manners, checking news, and not mocking or backbiting.',
    50: 'Qaf: Allah is closer than our jugular vein, and the one who turns back to Him (the meaning of Munib).',
    51: 'The scattering winds, and the purpose of creation: to worship Allah.',
    52: 'The mountain where Musa spoke with Allah, and the reward of the righteous.',
    53: 'The star, the Prophet’s ﷺ ascension, and that each soul has only what it strives for.',
    54: 'The splitting of the moon, and the refrain: “We have made the Quran easy to remember.”',
    55: 'The Most Merciful, and the refrain: “Which of the favours of your Lord will you deny?”',
    56: 'The inevitable event, and the three groups of people on the Last Day.',
    57: 'Iron, giving in Allah’s way, and how short this life is.',
    58: 'The woman who pleaded about her husband, and Allah who heard her.',
    59: 'The gathering, and the names of Allah in its last three ayat.',
    60: 'The woman tested on her faith, and kindness to those who are not hostile.',
    61: 'The ranks: say what you do, and ʿIsa’s good news of a messenger to come.',
    62: 'Friday: leave trade and hurry to the remembrance of Allah.',
    63: 'The hypocrites, and giving in charity before death comes.',
    64: 'Mutual loss and gain on the Last Day, and families as a test.',
    65: 'Divorce done with fairness, and that whoever fears Allah, He makes a way out for them.',
    66: 'A lesson from the Prophet’s ﷺ household, and sincere repentance.',
    67: 'The dominion of Allah. The Prophet ﷺ said it intercedes for whoever recites it.',
    68: 'The pen, the Prophet’s ﷺ great character, and the owners of the garden.',
    69: 'The sure reality of the Last Day, and the record given in the right hand.',
    70: 'The ways of ascent, and the human tendency to impatience, except for those who pray.',
    71: 'Nuh calling his people night and day for 950 years, and his dua for forgiveness.',
    72: 'The jinn who heard the Quran and believed.',
    73: 'The one wrapped in garments: standing in prayer at night and reciting slowly.',
    74: 'The one covered in a cloak: arise and warn, and the early days of revelation.',
    75: 'The Resurrection, and the self-reproaching soul.',
    76: 'Humankind: the righteous who feed others for the love of Allah, and the reward of Paradise.',
    77: 'Those sent forth, with the refrain about the Day of Judgement.',
    78: 'The great news of what comes after this life.',
    79: 'Those who pull out the souls, and Musa sent to Pharaoh.',
    80: 'He frowned: the blind man who came seeking, and that every soul matters.',
    81: 'The folding up of the sun, and the questions asked on the Last Day.',
    82: 'The splitting of the sky, and “What has deceived you about your generous Lord?”',
    83: 'Those who give short measure, and the record of the righteous.',
    84: 'The sky split open, and each person receiving their record.',
    85: 'The constellations, and the believers who held to faith through persecution.',
    86: 'The night star: every soul has a protector over it.',
    87: 'The Most High: glorify the name of your Lord. Often recited in Friday and Eid prayers.',
    88: 'The overwhelming event, and the camel, the sky and the mountains as signs.',
    89: 'The dawn, and the soul at peace called back to its Lord.',
    90: 'The city of Makkah, and the steep path: freeing a slave and feeding the hungry.',
    91: 'The sun: the one who purifies the soul succeeds.',
    92: 'The night: giving, and the ease that follows those who give.',
    93: 'The morning hours: your Lord has not left you. Revealed to comfort the Prophet ﷺ.',
    94: 'The relief: with hardship comes ease, said twice.',
    95: 'The fig: humans created in the best form.',
    96: 'The clot: the first ayat ever revealed, beginning with “Read”.',
    97: 'The Night of Decree, better than a thousand months.',
    98: 'The clear proof, and the people who believe and do good.',
    99: 'The earthquake: even an atom’s weight of good will be seen.',
    100: 'The racing horses, and how ungrateful a person can be to their Lord.',
    101: 'The striking hour, and the weighing of deeds.',
    102: 'Competition in worldly gain distracts you until you reach the graves.',
    103: 'Time: all are in loss except those who believe, do good and encourage truth and patience.',
    104: 'The slanderer who gathers wealth and counts it.',
    105: 'The elephant army that came to destroy the Kaʿbah.',
    106: 'Quraysh: worship the Lord of this House, who fed them and kept them safe.',
    107: 'Small kindnesses: those who neglect prayer and refuse to help with small things.',
    108: 'Abundance: the shortest surah, and a gift to the Prophet ﷺ.',
    109: 'The disbelievers: “For you your religion, and for me mine.”',
    110: 'Help and victory, and turning to Allah in praise and forgiveness.',
    111: 'The palm fibre: Abu Lahab and his wife, who opposed the Prophet ﷺ.',
    112: 'Sincerity: who Allah is, in four short ayat. Equal to a third of the Quran.',
    113: 'The daybreak: seeking refuge from the harm of what Allah created.',
    114: 'Humankind: seeking refuge with the Lord of people from the whisperer.',
}

def main():
    duas_src = open(os.path.join(ROOT, 'src', 'data', 'duas.ts')).read()
    j = duas_src.index('[', duas_src.index('=', duas_src.index('export const DUA_TOPICS')))
    topics, _ = json.JSONDecoder().raw_decode(duas_src[j:])
    by_id = {t['id']: t for t in topics}
    snippets_src = open(os.path.join(ROOT, 'src', 'data', 'snippets.ts')).read()
    have_ar = set(norm(m)[:24] for m in re.findall(r"kind: 'dua'[^}]*?ar: '([^']*)'", snippets_src))
    have_names = set(norm(m) for m in re.findall(r"kind: 'name', ar: '([^']*)'", snippets_src))

    out = []
    # Duas
    for cid, (title, moods, n) in DUA_PICK.items():
        t = by_id[cid]
        used = 0
        for d in t['duas']:
            if used >= n:
                break
            if len(d['ar']) > MAX_AR or len(d.get('en') or '') > MAX_EN or norm(d['ar'])[:24] in have_ar or not d.get('en'):
                continue
            have_ar.add(norm(d['ar'])[:24])
            src = t['src'] + (f' · say it {d["n"]} times' if d.get('n', 1) > 1 else '')
            out.append({'id': f'hd-{d["id"]}', 'kind': 'dua', 'title': title, 'ar': d['ar'], 'tl': d.get('tl') or '', 'meaning': tidy(d['en']), 'source': src, **({'moods': moods} if moods else {})})
            used += 1
    for cid, moods in QURAN_DUA_MOODS.items():
        t = by_id[cid]
        d = t['duas'][0]
        if len(d['ar']) > MAX_AR or norm(d['ar'])[:24] in have_ar:
            continue
        have_ar.add(norm(d['ar'])[:24])
        out.append({'id': f'qd-{cid}', 'kind': 'dua', 'title': t['title'], 'ar': d['ar'], 'tl': d.get('tl') or '', 'meaning': d['en'], 'source': t['src'], 'moods': moods})
    n_duas = len(out)

    # Names
    bad, long = [], []
    for i, (tl, ar, meaning, ref, explain, moods) in enumerate(NAMES, 1):
        if norm(ar) in have_names:
            continue
        if ref:
            s, a, must = ref
            text, tr = ayah(s, a)
            if norm(must) not in norm(text):
                bad.append((tl, s, a, must, norm(text)[:120]))
                continue
            if len(tr) > MAX_AYAH:
                long.append((tl, s, a, len(tr)))
            body, source = f'“{tr}”', f'Quran {s}:{a} · Saheeh International · One of the 99 names ({T})'
        else:
            body, source = explain, f'{T} · The 99 names: Sahih al-Bukhari 2736'
        out.append({'id': f'n99-{i}', 'kind': 'name', 'ar': ar, 'tl': tl, 'meaning': meaning, 'body': body, 'source': source, **({'moods': moods} if moods else {})})
    if bad:
        print('NOT FOUND IN THE AYAH (fix the reference):')
        for b in bad:
            print(' ', b)
        sys.exit(1)
    for l in long:
        print('long ayah (choose a shorter one by hand if it reads badly):', l)
    n_names = len(out) - n_duas

    # Surahs
    surahs = json.load(open(os.path.join(ROOT, 'src', 'data', 'surahs.json')))
    assert len(SURAH_ABOUT) == 114
    for s in range(1, 115):
        out.append({'id': f'about-{s}', 'kind': 'surah', 's': s, 'about': SURAH_ABOUT[s]})

    head = '''/**
 * More For you cards, generated by scripts/build-feed-more.py (15 Nov 2026); don't edit by hand, change the script.
 * Duas from the Hisn al-Muslim library in duas.ts and its Quran duas; all 99 Names of Allah (Jamiʿ at-Tirmidhi 3507),
 * each ayah checked to contain the name; 114 surah introductions in Munib's own words.
 * ALL of it needs a scholar's check before launch, like the rest of Munib's religious content.
 */
import type { Snippet } from './snippets';

export const MORE_SNIPPETS: Snippet[] = '''
    open(os.path.join(ROOT, 'src', 'data', 'feedMore.ts'), 'w').write(head + json.dumps(out, ensure_ascii=False, indent=0) + ';\n')
    print(f'{n_duas} duas, {n_names} names, 114 surahs → {len(out)} cards')

main()
