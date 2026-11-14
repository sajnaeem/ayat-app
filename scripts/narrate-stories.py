"""
Narrates the bedtime stories (src/data/bedtime.ts) with Kokoro, an open-source AI voice, into website/stories/<id>.mp3, with <id>.json saying when each paragraph starts.
The app says the voice is AI. Usage:
  node --experimental-strip-types -e "import('./src/data/bedtime.ts').then(m=>console.log(JSON.stringify(m.STORIES)))" > /tmp/stories.json
  python3 scripts/narrate-stories.py <kokoro models dir> /tmp/stories.json [id ...]
"""
import json, subprocess, sys, tempfile, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

models, src = sys.argv[1], sys.argv[2]
only = set(sys.argv[3:])
k = Kokoro(models + '/kokoro-v1.0.onnx', models + '/voices-v1.0.bin')
VOICE, LANG, SPEED = 'bf_emma', 'en-gb', 0.74

# Names the English voice gets wrong: the sounds it should make instead (IPA, as Kokoro uses).
FIX = {
    'Allah': 'əlˈɑː', 'Allah’s': 'əlˈɑːz', 'Quran': 'kʊɹˈɑːn', 'Yunus': 'jˈuːnʊs', 'Nuh': 'nˈuːh', 'Ibrahim': 'ɪbɹɑːhˈiːm',
    'Musa': 'mˈuːsɑː', 'Sulayman': 'sʊlaɪmˈɑːn', 'Maryam': 'mˈɑːɹjam', 'Isa': 'ˈiːsɑː', 'al-Judi': 'ɐl dʒˈuːdiː',
    'Bismillah': 'bɪsmɪlˈɑː', 'Israel': 'ɪsɹɑːˈiːl', 'Bani': 'bˈani',
    'Yusuf': 'jˈuːsʊf', 'Yaqub': 'jɑːkˈuːb', 'Ayyub': 'ɐjˈuːb', 'Zakariyya': 'zækɐɹˈiːjɑː', 'Yahya': 'jˈɑːhjɑː', 'minbar': 'mˈɪnbɑː', 'Madinah': 'mɐdˈiːnɐ',
}
FIXP = [(k.tokenizer.phonemize(a, LANG).strip(), b) for a, b in sorted(FIX.items(), key=lambda x: -len(x[0]))]

def tts(text):
    text = text.replace('ﷺ', ', peace and blessings be upon him,').replace('“', '').replace('”', '').replace('…', '...')
    ph = k.tokenizer.phonemize(text, LANG)
    # Swap whole words only (so "Nuh" doesn't change "nothing"); a linking r after Allah ("ˈaləɹ") counts too.
    def fix(tok):
        core = tok.rstrip('.,!?;:')
        tail = tok[len(core):]
        for a, b in FIXP:
            if core in (a, a + 'ɹ'):
                return b + tail
        return tok
    ph = ' '.join(fix(w) for w in ph.split(' '))
    s, sr = k.create(ph, voice=VOICE, speed=SPEED, lang=LANG, is_phonemes=True)
    a = np.abs(s); idx = np.where(a > 0.01)[0]
    return s[max(0, idx[0] - int(.03 * sr)): idx[-1] + int(.1 * sr)], sr

for st in json.load(open(src)):
    if only and st['id'] not in only:
        continue
    parts, sr, starts, pos = [], 24000, [], 0.5
    for i, text in enumerate([f"{st['title']}.", *st['paras'], st['think'], 'Goodnight.']):
        s, sr = tts(text)
        starts.append(round(pos, 2))
        pos += len(s) / sr
        parts.append(s)
        gap = 2.0 if i == 0 or i >= len(st['paras']) else 1.4
        parts.append(np.zeros(int(gap * sr), dtype=s.dtype))
        pos += int(gap * sr) / sr
    audio = np.concatenate([np.zeros(int(.5 * sr), dtype=parts[0].dtype), *parts])
    with tempfile.NamedTemporaryFile(suffix='.wav') as w:
        sf.write(w.name, audio, sr)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', w.name, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', f"website/stories/{st['id']}.mp3"], check=True)
    # When each part starts (title, each paragraph, the question, goodnight), so the app can follow along.
    json.dump({'starts': starts, 'length': round(len(audio) / sr, 2)}, open(f"website/stories/{st['id']}.json", 'w'))
    print(st['id'], round(len(audio) / sr), 's')
