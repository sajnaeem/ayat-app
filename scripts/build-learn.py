"""
Builds src/data/learn.ts: the short surahs for learning to recite in prayer, ayah by ayah.
Arabic + Saheeh International + transliteration from quran-json 3.1.2 (the same data Munib bundles).
Transliteration is Munib's own (TL below), in the form said when stopping at the end of each ayah.
Needs checking by someone who teaches Quran.
Usage: python3 scripts/build-learn.py /path/to/quran-json/dist
"""
import json, re, sys
src = sys.argv[1]

# Path order: al-Fatihah first (it's in every rakʿah), then roughly easiest first.
PATH = [1, 108, 112, 103, 114, 113, 106, 110, 111, 105, 107, 109, 94, 102, 97, 104, 95, 99, 101, 93, 100]
NOTES = {
    1: "Recited in every rakʿah of every prayer, so it comes first.",
    108: "The shortest surah in the Quran: three ayat, ten words.",
    112: "The Prophet ﷺ said it is equal to a third of the Quran (Sahih al-Bukhari 5013).",
    103: "Three short ayat on what makes a life not wasted.",
    114: "Seeking refuge with Allah. With al-Falaq and al-Ikhlas, recited morning and evening (Sunan Abi Dawud 5082).",
    113: "Seeking refuge with Allah from harm. Pairs with an-Nas.",
    106: "About the Prophet’s tribe, Quraysh, and the blessings they were given.",
    110: "Help and victory, and what to do when they come: praise Allah and ask His forgiveness.",
    111: "About Abu Lahab, the Prophet’s uncle who opposed him.",
    105: "The army with the elephant that came to destroy the Kaʿbah.",
    107: "Small kindnesses, and praying with care.",
    109: "The Prophet ﷺ recited it with al-Ikhlas in the two rakʿahs before Fajr (Sahih Muslim 726).",
    94: "Twice it says: with hardship comes ease.",
    102: "How chasing more distracts us, until the grave.",
    97: "About Laylat al-Qadr, the Night of Decree, better than a thousand months.",
    104: "A warning about mocking people and hoarding wealth.",
    95: "Allah swears by the fig and the olive: people were created in the best form.",
    99: "The earthquake of the Last Day, and every atom’s weight of good seen.",
    101: "The Striking Hour, and the scales.",
    93: "Revealed to comfort the Prophet ﷺ: your Lord has not left you.",
    100: "The charging horses, and how ungrateful people can be.",
}

# Learner-friendly transliteration, written for Munib: plain spelling, long vowels as aa / ee / oo,
# ' for ʿayn and hamzah, joined the way the words are said, and stopping on the last letter of each ayah.
TL = {}
for line in """1|Bismillaahir-Rahmaanir-Raheem|Al-hamdu lillaahi Rabbil-'aalameen|Ar-Rahmaanir-Raheem|Maaliki yawmid-deen|Iyyaaka na'budu wa iyyaaka nasta'een|Ihdinas-siraatal-mustaqeem|Siraatal-ladheena an'amta 'alayhim ghayril-maghdoobi 'alayhim wa lad-daalleen
108|Innaa a'taynaakal-kawthar|Fa salli li Rabbika wanhar|Inna shaani'aka huwal-abtar
112|Qul huwal-laahu ahad|Allaahus-samad|Lam yalid wa lam yoolad|Wa lam yakul-lahoo kufuwan ahad
103|Wal-'asr|Innal-insaana lafee khusr|Illal-ladheena aamanoo wa 'amilus-saalihaati wa tawaasaw bil-haqqi wa tawaasaw bis-sabr
114|Qul a'oodhu bi Rabbin-naas|Malikin-naas|Ilaahin-naas|Min sharril-waswaasil-khannaas|Alladhee yuwaswisu fee sudoorin-naas|Minal-jinnati wan-naas
113|Qul a'oodhu bi Rabbil-falaq|Min sharri maa khalaq|Wa min sharri ghaasiqin idhaa waqab|Wa min sharrin-naffaathaati fil-'uqad|Wa min sharri haasidin idhaa hasad
106|Li eelaafi Quraysh|Eelaafihim rihlatash-shitaa'i was-sayf|Falya'budoo Rabba haadhal-bayt|Alladhee at'amahum min joo'iw-wa aamanahum min khawf
110|Idhaa jaa'a nasrul-laahi wal-fath|Wa ra'aytan-naasa yadkhuloona fee deenil-laahi afwaajaa|Fasabbih bi hamdi Rabbika wastaghfirh, innahoo kaana tawwaabaa
111|Tabbat yadaa Abee Lahabiw-wa tabb|Maa aghnaa 'anhu maaluhoo wa maa kasab|Sayaslaa naaran dhaata lahab|Wamra'atuhoo hammaalatal-hatab|Fee jeedihaa hablum-mim-masad
105|Alam tara kayfa fa'ala Rabbuka bi as-haabil-feel|Alam yaj'al kaydahum fee tadleel|Wa arsala 'alayhim tayran abaabeel|Tarmeehim bi hijaaratim-min sijjeel|Faja'alahum ka'asfim-ma'kool
107|Ara'aytal-ladhee yukadh-dhibu bid-deen|Fadhaalikal-ladhee yadu''ul-yateem|Wa laa yahuddu 'alaa ta'aamil-miskeen|Fawaylul-lil-musalleen|Alladheena hum 'an salaatihim saahoon|Alladheena hum yuraa'oon|Wa yamna'oonal-maa'oon
109|Qul yaa ayyuhal-kaafiroon|Laa a'budu maa ta'budoon|Wa laa antum 'aabidoona maa a'bud|Wa laa ana 'aabidum-maa 'abadtum|Wa laa antum 'aabidoona maa a'bud|Lakum deenukum wa liya deen
94|Alam nashrah laka sadrak|Wa wada'naa 'anka wizrak|Alladhee anqada zahrak|Wa rafa'naa laka dhikrak|Fa inna ma'al-'usri yusraa|Inna ma'al-'usri yusraa|Fa idhaa faraghta fansab|Wa ilaa Rabbika farghab
102|Alhaakumut-takaathur|Hattaa zurtumul-maqaabir|Kallaa sawfa ta'lamoon|Thumma kallaa sawfa ta'lamoon|Kallaa law ta'lamoona 'ilmal-yaqeen|Latarawunnal-jaheem|Thumma latarawunnahaa 'aynal-yaqeen|Thumma latus'alunna yawma'idhin 'anin-na'eem
97|Innaa anzalnaahu fee laylatil-qadr|Wa maa adraaka maa laylatul-qadr|Laylatul-qadri khayrum-min alfi shahr|Tanazzalul-malaa'ikatu war-roohu feehaa bi idhni Rabbihim min kulli amr|Salaamun hiya hattaa matla'il-fajr
104|Waylul-likulli humazatil-lumazah|Alladhee jama'a maalaw-wa 'addadah|Yahsabu anna maalahoo akhladah|Kallaa layumbadhanna fil-hutamah|Wa maa adraaka mal-hutamah|Naarul-laahil-mooqadah|Allatee tattali'u 'alal-af'idah|Innahaa 'alayhim mu'sadah|Fee 'amadim-mumaddadah
95|Wat-teeni waz-zaytoon|Wa toori seeneen|Wa haadhal-baladil-ameen|Laqad khalaqnal-insaana fee ahsani taqweem|Thumma radadnaahu asfala saafileen|Illal-ladheena aamanoo wa 'amilus-saalihaati falahum ajrun ghayru mamnoon|Famaa yukadh-dhibuka ba'du bid-deen|Alaysal-laahu bi ahkamil-haakimeen
99|Idhaa zulzilatil-ardu zilzaalahaa|Wa akhrajatil-ardu athqaalahaa|Wa qaalal-insaanu maa lahaa|Yawma'idhin tuhaddithu akhbaarahaa|Bi anna Rabbaka awhaa lahaa|Yawma'idhiy-yasdurun-naasu ashtaatal-liyuraw a'maalahum|Famay-ya'mal mithqaala dharratin khayray-yarah|Wa may-ya'mal mithqaala dharratin sharray-yarah
101|Al-qaari'ah|Mal-qaari'ah|Wa maa adraaka mal-qaari'ah|Yawma yakoonun-naasu kal-faraashil-mabthooth|Wa takoonul-jibaalu kal-'ihnil-manfoosh|Fa ammaa man thaqulat mawaazeenuh|Fahuwa fee 'eeshatir-raadiyah|Wa ammaa man khaffat mawaazeenuh|Fa ummuhoo haawiyah|Wa maa adraaka maa hiyah|Naarun haamiyah
93|Wad-duhaa|Wal-layli idhaa sajaa|Maa wadda'aka Rabbuka wa maa qalaa|Wa lal-aakhiratu khayrul-laka minal-oolaa|Wa lasawfa yu'teeka Rabbuka fatardaa|Alam yajidka yateeman fa aawaa|Wa wajadaka daallan fahadaa|Wa wajadaka 'aa'ilan fa aghnaa|Fa ammal-yateema falaa taqhar|Wa ammas-saa'ila falaa tanhar|Wa ammaa bi ni'mati Rabbika fahaddith
100|Wal-'aadiyaati dabhaa|Fal-mooriyaati qadhaa|Fal-mugheeraati subhaa|Fa atharna bihee naq'aa|Fawasatna bihee jam'aa|Innal-insaana li Rabbihee lakanood|Wa innahoo 'alaa dhaalika lashaheed|Wa innahoo lihubbil-khayri lashadeed|Afalaa ya'lamu idhaa bu'thira maa fil-quboor|Wa hussila maa fis-sudoor|Inna Rabbahum bihim yawma'idhil-lakhabeer""".splitlines():
    s, *ayat = line.split('|')
    TL[int(s)] = ayat

out = []
for s in PATH:
    d = json.load(open(f'{src}/chapters/en/{s}.json'))
    assert len(TL[s]) == len(d['verses']), s
    ayat = [{'ar': v['text'], 'tl': TL[s][i], 'en': v['translation']} for i, v in enumerate(d['verses'])]
    words = sum(len(v['text'].split()) for v in d['verses'])
    out.append({'s': s, 'name': d['transliteration'], 'meaning': d['translation'], 'words': words, 'note': NOTES[s], 'ayat': ayat})

with open('src/data/learn.ts', 'w') as f:
    f.write('// Generated by scripts/build-learn.py from quran-json 3.1.2. Do not edit by hand.\n')
    f.write('// Notes and transliterations need checking by a Quran teacher.\n\n')
    f.write('export type LearnAyah = { ar: string; tl: string; en: string };\n')
    f.write('export type LearnSurah = { s: number; name: string; meaning: string; words: number; note: string; ayat: LearnAyah[] };\n\n')
    f.write('export const LEARN: LearnSurah[] = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
print(len(out), 'surahs')
for o in out[:6]:
    print(o['s'], [a['tl'] for a in o['ayat']])
