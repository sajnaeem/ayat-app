# Builds the dua library for "Find a dua" (src/data/duas.ts) and the title list in supabase/functions/duas/index.ts.
# Sources (clone first): github.com/YousefAsalya/islamic-pro-azkar-api (MIT; Hisn al-Muslim from hisnmuslim.com, Arabic + English),
# github.com/wafaaelmaandy/hisn-muslim-json (transliterations), and the quran-json 3.1.2 npm package (Quran duas).
# After running, Arabic is cleaned of the source's (( )) quote marks (see arclean in the commit of 13 Nov 2026).
import json, re
ar = json.load(open('/home/claude/yousefasalya/islamic-pro-azkar-api/data/ar.json', encoding='utf-8-sig'))
en = json.load(open('/home/claude/yousefasalya/islamic-pro-azkar-api/data/en.json', encoding='utf-8-sig'))
wa = json.load(open('/home/claude/wafaaelmaandy/hisn-muslim-json/husn_en.json', encoding='utf-8-sig'))['English']
tl = {}
for c in wa:
    for z in c['TEXT']:
        tl[str(z['ID'])] = z.get('LANGUAGE_ARABIC_TRANSLATED_TEXT') or ''

def balanced(t):
    d = 0
    for ch in t:
        d += ch == '('
        d -= ch == ')'
        if d < 0:
            return False
    return d == 0

def clean(t):
    t = (t or '').replace('\r', ' ').replace('\n', ' ')
    t = re.sub(r'\s+', ' ', t).strip()
    # strip one layer of wrapping brackets the source uses: ((...)) or (...)
    for _ in range(2):
        if t.startswith('((') and t.endswith('))'):
            t = t[2:-2].strip()
        elif t.startswith('(') and t.endswith(')') and balanced(t[1:-1]):
            t = t[1:-1].strip()
    return t

def tclean(t):
    # the source writes the Arabic letter ʿayn as "AA" and hamza as "/"
    t = clean(t).replace('AA', 'ʿ').replace('/', 'ʾ')
    return t

A = {c['id']: c for c in ar}
topics = []
for c in en:
    a = A[c['id']]
    duas = []
    for i, z in enumerate(c['array']):
        za = a['array'][i]
        t = tl.get(z['filename'], '')
        if t.startswith('Recite ') or not t:  # e.g. "Recite Ayat-Al-Kursiy": not a transliteration
            t = ''
        duas.append({'id': f"h{z['filename']}", 'ar': clean(za['text']), 'tl': tclean(t), 'en': clean(z['text']), 'n': z.get('count') or 1})
    title = c['category'].strip()
    title = title[0].upper() + title[1:]
    title = title.replace('vocation for someone who says', 'Invocation for someone who says')
    topics.append({'id': c['id'], 'title': title, 'src': f"Hisn al-Muslim, chapter {c['id']}", 'duas': duas})

# Duas from the Quran, for situations Hisn al-Muslim covers less (exact Mushaf text from quran-json)
Q = [
    (201, 'For good in this life and the next', [(2, 201, 201)]),
    (202, 'For patience and steadfastness', [(2, 250, 250)]),
    (203, 'When a burden feels too heavy', [(2, 286, 286)]),
    (204, 'To keep your heart firm on guidance', [(3, 8, 8)]),
    (205, 'Asking forgiveness after a mistake', [(7, 23, 23)]),
    (206, 'For yourself and your children to keep praying', [(14, 40, 40)]),
    (207, 'For forgiveness for your parents', [(14, 41, 41)]),
    (208, 'For mercy for your parents', [(17, 24, 24)]),
    (209, 'For guidance and mercy in a hard situation', [(18, 10, 10)]),
    (210, 'Before speaking, an exam or an interview: for confidence and ease', [(20, 25, 28)]),
    (211, 'For more knowledge, when studying', [(20, 114, 114)]),
    (212, 'When ill or suffering for a long time', [(21, 83, 83)]),
    (213, 'For a child', [(21, 89, 89)]),
    (214, 'For forgiveness and mercy', [(23, 118, 118)]),
    (215, 'For a loving spouse and righteous children', [(25, 74, 74)]),
    (216, 'When in need of provision, work or help', [(28, 24, 24)]),
    (217, 'Handing your affairs over to Allah', [(40, 44, 44)]),
    (218, 'Gratitude, and for your parents and children', [(46, 15, 15)]),
    (219, 'For the believers who came before us, and against bitterness in the heart', [(59, 10, 10)]),
    (220, 'For wisdom and to be among the righteous', [(26, 83, 85)]),
]
for tid, title, refs in Q:
    duas = []
    for s, a1, a2 in refs:
        d = json.load(open(f'/tmp/dl3/package/dist/chapters/en/{s}.json'))
        vs = [v for v in d['verses'] if a1 <= v['id'] <= a2]
        duas.append({
            'id': f'q{s}_{a1}',
            'ar': ' '.join(v['text'] for v in vs),
            'tl': tclean(' '.join(v['transliteration'] for v in vs)),
            'en': ' '.join(v['translation'] for v in vs),
            'n': 1,
        })
        src = f"Quran {s}:{a1}" + (f"–{a2}" if a2 != a1 else '')
    topics.append({'id': tid, 'title': title, 'src': src, 'duas': duas})

print(len(topics), sum(len(t['duas']) for t in topics))
open('topics.json', 'w').write(json.dumps(topics, ensure_ascii=False))
# Titles list for the AI
open('titles.txt', 'w').write('\n'.join(f"{t['id']}: {t['title']}" for t in topics))
