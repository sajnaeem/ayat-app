"""Munib's welcome sound: a soft breeze of light (no musical notes, no instruments). Filtered noise only.
Run: python3 scripts/make-welcome-sound.py  ->  assets/sounds/welcome.mp3 (needs numpy, scipy, ffmpeg)."""
import numpy as np, subprocess, scipy.signal as sg, scipy.io.wavfile as wf
SR, DUR = 44100, 3.6
n = int(SR * DUR); t = np.arange(n) / SR
rng = np.random.default_rng(50)  # 50:33

def band(x, lo, hi):
    b, a = sg.butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return sg.lfilter(b, a, x)

def env(attack, peak, release):
    e = np.zeros(n)
    a = (t < attack); e[a] = (t[a] / attack) ** 2
    s = (t >= attack) & (t < peak); e[s] = 1
    r = t >= peak; e[r] = np.exp(-(t[r] - peak) / release)
    return e

# 1. the breeze: warm noise whose band slowly opens upward, like air moving through a room
noise = rng.standard_normal(n)
lo = band(noise, 180, 900) * 0.9
mid = band(rng.standard_normal(n), 700, 2600) * 0.5
sweep = np.clip(t / 2.2, 0, 1)
breeze = (lo * (1 - 0.5 * sweep) + mid * sweep) * env(1.4, 1.7, 0.9)

# 2. the shimmer: a scatter of tiny soft grains of high air (no pitch), thickest as the breeze peaks
shimmer = np.zeros(n)
for _ in range(36):
    at = rng.uniform(0.6, 3.0); dur = rng.uniform(0.18, 0.45)
    i0, i1 = int(at * SR), int(min(n, (at + dur) * SR))
    g = np.hanning(i1 - i0) * rng.uniform(0.3, 1.0) * np.exp(-((at - 1.6) ** 2) / 0.9)
    shimmer[i0:i1] += rng.standard_normal(i1 - i0) * g
shimmer = band(shimmer, 4200, 8500) * 0.22

mono = breeze + shimmer
# gentle stereo drift: the air moves from left to right
pan = 0.5 + 0.35 * np.sin(2 * np.pi * t / DUR - np.pi / 2)
L, R = mono * np.sqrt(1 - pan), mono * np.sqrt(pan)
st = np.stack([L, R], 1)
fade = np.ones(n); fade[-int(0.4 * SR):] = np.linspace(1, 0, int(0.4 * SR)); st *= fade[:, None]
st = st / np.max(np.abs(st)) * 0.5  # quiet: peak around -6 dB
wf.write('/tmp/welcome.wav', SR, (st * 32767).astype(np.int16))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', '/tmp/welcome.wav', '-codec:a', 'libmp3lame', '-b:a', '96k', 'assets/sounds/welcome.mp3'], check=True)
print('ok')
