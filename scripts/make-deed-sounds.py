"""Daily deeds sounds (Saj, 15 Nov 2026: "a sound effect every time an item and prayer is checked off").
Like the welcome sound: shaped air only, no musical notes, chimes, bells or instruments.
  tick.mp3  a soft, short puff of air with a light sparkle (one deed ticked)
  done.mp3  a brighter rising breeze with a scatter of light (the whole list done)
Run: python3 scripts/make-deed-sounds.py  (needs numpy, scipy, ffmpeg)."""
import numpy as np, subprocess, scipy.signal as sg, scipy.io.wavfile as wf
SR = 44100
rng = np.random.default_rng(33)

def band(x, lo, hi):
    b, a = sg.butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return sg.lfilter(b, a, x)

def save(name, st, peak):
    st = st / np.max(np.abs(st)) * peak
    wf.write(f'/tmp/{name}.wav', SR, (st * 32767).astype(np.int16))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'/tmp/{name}.wav', '-codec:a', 'libmp3lame', '-b:a', '96k', f'assets/sounds/{name}.mp3'], check=True)

# tick: 0.32s. A quick soft body (low-mid air) and a tiny bright grain just after it.
n = int(SR * 0.32); t = np.arange(n) / SR
body = band(rng.standard_normal(n), 500, 1900) * np.exp(-t / 0.035) * np.clip(t / 0.004, 0, 1)
spark = band(rng.standard_normal(n), 5200, 9500) * np.exp(-np.clip(t - 0.03, 0, None) / 0.06) * (t > 0.03) * 0.35
mono = body + spark
fade = np.ones(n); fade[-int(0.05 * SR):] = np.linspace(1, 0, int(0.05 * SR))
save('tick', np.stack([mono * fade, mono * fade], 1), 0.45)

# done: 2.2s. The breeze opens upward and a shower of light grains falls through it.
n = int(SR * 2.2); t = np.arange(n) / SR
sweep = np.clip(t / 1.0, 0, 1)
env = np.where(t < 0.7, (t / 0.7) ** 1.5, np.exp(-(t - 0.7) / 0.6))
breeze = (band(rng.standard_normal(n), 250, 1100) * (1 - 0.6 * sweep) + band(rng.standard_normal(n), 900, 3400) * sweep * 0.7) * env
shower = np.zeros(n)
for _ in range(60):
    at = rng.uniform(0.25, 1.9); dur = rng.uniform(0.05, 0.16)
    i0, i1 = int(at * SR), int(min(n, (at + dur) * SR))
    shower[i0:i1] += rng.standard_normal(i1 - i0) * np.hanning(i1 - i0) * rng.uniform(0.3, 1.0) * np.exp(-((at - 0.9) ** 2) / 0.5)
shower = band(shower, 4500, 10000) * 0.5
mono = breeze + shower
pan = 0.5 + 0.3 * np.sin(2 * np.pi * t / 2.2 - np.pi / 2)
st = np.stack([mono * np.sqrt(1 - pan), mono * np.sqrt(pan)], 1)
fade = np.ones(n); fade[-int(0.35 * SR):] = np.linspace(1, 0, int(0.35 * SR)); st *= fade[:, None]
save('done', st, 0.55)
print('ok')
