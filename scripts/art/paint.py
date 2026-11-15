#!/usr/bin/env python3
"""
Munib's painted scenes (Saj, 15 Nov 2026: one art style everywhere, in the light of the prayer day).

Every picture is painted by this script, layer by layer (sky, clouds, far hills in haze, nearer hills, trees, a mosque
or an arch, water), then given a brush texture. Each scene is made four times, in the light of Fajr, the day, Maghrib
and Isha, so the app's pictures change with the prayer day. No people or faces, no lettering. Nothing is traced or
copied from anyone's artwork: it is all geometry and noise from the seeds below.

Run:  python3 scripts/art/paint.py [scene ...]      (needs numpy, scipy, Pillow and ImageMagick's `convert`)
Writes assets/art/paint/<scene>-<phase>.jpg  (valley: 900x1125 for the tall headers; the rest 520x520 for cards).
"""
import math, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter, zoom

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'art', 'paint')
rgb = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float32) / 255
mix = lambda a, b, t: a + (b - a) * t
tup = lambda c: tuple(int(max(0, min(1, v)) * 255) for v in c)

PHASES = {
    'fajr': dict(sky=[(0, '#4E67A6'), (0.42, '#B79CC6'), (0.72, '#F3BFA6'), (1, '#FBE2BE')], sun=(0.30, 0.86, '#FFE7BC', 0.9), moon=None, stars=0.07,
                 haze='#F1CFC6', far='#A99BC4', near='#2F5F4E', cloud='#FFD9C2', stone='#EFD9C8', stone2='#C9A8A6', dome='#5C86B5', lit='#FFD68A', lights=0.6, water='#C9A9C4'),
    'day': dict(sky=[(0, '#4F9CDD'), (0.55, '#9FCFF1'), (1, '#E4F1F4')], sun=(0.74, 0.2, '#FFFBE6', 0.85), moon=None, stars=0,
                haze='#D9E9F1', far='#93B9CF', near='#3B7A4C', cloud='#FFFFFF', stone='#F6EBD6', stone2='#D4BFA0', dome='#2F86B8', lit='#6F8FA6', lights=0, water='#7FB9DE'),
    'maghrib': dict(sky=[(0, '#34398A'), (0.38, '#A6529A'), (0.68, '#F08658'), (1, '#FFD189')], sun=(0.62, 0.9, '#FFEBB0', 1.0), moon=None, stars=0.05,
                    haze='#F2A27A', far='#8A5B93', near='#27294B', cloud='#FFB07A', stone='#F1C9A0', stone2='#B77E78', dome='#3B5FA8', lit='#FFD27A', lights=0.9, water='#C2649A'),
    'isha': dict(sky=[(0, '#090F3A'), (0.55, '#1B2B76'), (1, '#4257A0')], sun=None, moon=(0.72, 0.2), stars=1.0,
                 haze='#3A4C95', far='#27387C', near='#0B1232', cloud='#3A4A92', stone='#6F7FB8', stone2='#3C4A8C', dome='#3350A8', lit='#FFD98A', lights=1.0, water='#22347E'),
}
GOLD = rgb('#E6C06A')


def noise2(h, w, scale, seed, stretch=(1, 1)):
    r = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(4):
        s = max(2, scale / (2 ** o))
        gh, gw = max(2, int(h / (s * stretch[0])) + 2), max(2, int(w / (s * stretch[1])) + 2)
        g = r.standard_normal((gh, gw)).astype(np.float32)
        out += amp * zoom(g, (h / gh, w / gw), order=3)[:h, :w]
        tot += amp
        amp *= 0.5
    return out / tot


def noise1(n, scale, seed, octaves=5, peaks=False):
    r = np.random.default_rng(seed)
    out = np.zeros(n, np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        s = max(2, scale / (2 ** o))
        g = r.standard_normal(int(n / s) + 3).astype(np.float32)
        v = zoom(g, n / len(g), order=3)[:n]
        out += amp * ((1 - np.abs(v)) * 2 - 1 if peaks else v)
        tot += amp
        amp *= 0.5
    return out / tot * 1.9


class Canvas:
    def __init__(self, w, h, phase, seed):
        self.w, self.h, self.p, self.seed = w, h, PHASES[phase], seed
        self.phase = phase
        self.img = np.zeros((h, w, 3), np.float32)
        self.yy, self.xx = np.mgrid[0:h, 0:w].astype(np.float32)
        self.c = {k: rgb(v) for k, v in self.p.items() if isinstance(v, str)}

    # ---- sky
    def sky(self, horizon=0.62):
        p, h, w = self.p, self.h, self.w
        t = np.clip(self.yy / (h * horizon), 0, 1)
        stops = p['sky']
        out = np.zeros_like(self.img)
        for (a, ca), (b, cb) in zip(stops, stops[1:]):
            m = ((t >= a) & (t <= b))[..., None]
            k = ((t - a) / (b - a + 1e-6))[..., None]
            k = k * k * (3 - 2 * k)
            out = np.where(m, mix(rgb(ca), rgb(cb), k), out)
        out *= 1 + 0.035 * noise2(h, w, 260, self.seed + 1, (0.35, 1.6))[..., None]
        self.img = out
        if p['stars']:
            r = np.random.default_rng(self.seed + 2)
            n = int(w * h / 5200 * p['stars'])
            layer = np.zeros((h, w), np.float32)
            for _ in range(n):
                x, y = r.integers(0, w), int(r.random() ** 1.6 * h * horizon * (0.92 if p['stars'] >= 1 else 0.4))
                layer[y, x] = r.random() * 0.9 + 0.4
            big = gaussian_filter(layer, 1.1) * 9 + gaussian_filter(layer, 3.2) * 14
            self.img += np.clip(big, 0, 1)[..., None] * np.array([1, 0.97, 0.88])
        if p['sun']:
            sx, sy, col, strength = p['sun']
            self.glow(sx * w, sy * h * horizon, w * 0.6, rgb(col), 0.55 * strength)
            self.glow(sx * w, sy * h * horizon, w * 0.16, rgb(col), 0.8 * strength)
            self.disc(sx * w, sy * h * horizon, w * 0.036, rgb('#FFFDF0'), 0.95)
        if p['moon']:
            mx, my = p['moon'][0] * w, p['moon'][1] * h * horizon
            self.glow(mx, my, w * 0.3, rgb('#BFCBFF'), 0.32)
            r0 = w * 0.052
            d1 = np.hypot(self.xx - mx, self.yy - my)
            d2 = np.hypot(self.xx - (mx + r0 * 0.46), self.yy - (my - r0 * 0.14))
            m = np.clip(r0 - d1, 0, 1.5) / 1.5 * np.clip(d2 - r0 * 0.9, 0, 1.5) / 1.5
            self.img = mix(self.img, rgb('#FFF6D8'), m[..., None])

    def glow(self, cx, cy, r, col, a):
        d = np.hypot(self.xx - cx, self.yy - cy) / r
        g = np.exp(-d * d * 2.2) * a
        self.img = 1 - (1 - self.img) * (1 - col * g[..., None])

    def disc(self, cx, cy, r, col, a):
        d = np.hypot(self.xx - cx, self.yy - cy)
        m = np.clip((r - d) / 2 + 0.5, 0, 1) * a
        self.img = mix(self.img, col, m[..., None])

    def clouds(self, y0, y1, n=7, seed=0, a=0.55):
        r = np.random.default_rng(self.seed + 30 + seed)
        layer = np.zeros((self.h, self.w), np.float32)
        for _ in range(n):
            cx, cy = r.random() * self.w, (y0 + r.random() * (y1 - y0)) * self.h
            sx, sy = self.w * (0.1 + r.random() * 0.2), self.h * (0.006 + r.random() * 0.012)
            for k in range(5):
                ox, oy = (r.random() - 0.5) * sx * 1.6, (r.random() - 0.5) * sy * 2.4
                layer += np.exp(-(((self.xx - cx - ox) / sx) ** 2 + ((self.yy - cy - oy) / sy) ** 2) * 2.0) * (0.5 + r.random() * 0.5)
        layer = np.clip(layer * 0.55, 0, 1) * (0.75 + 0.25 * noise2(self.h, self.w, 60, self.seed + 31, (0.4, 1.8)))
        self.img = mix(self.img, self.c['cloud'], (np.clip(layer, 0, 1) * a)[..., None])

    # ---- land
    def ridge(self, y, amp, scale, depth_t, seed, mist=0.55, col=None, rough=0.07, peaks=False):
        """A range of hills. y, amp as fractions of height; depth_t 0 = far (hazy), 1 = near."""
        h, w = self.h, self.w
        prof = (y + amp * noise1(w, scale * w, self.seed + seed, peaks=peaks)) * h
        base = col if col is not None else mix(self.c['far'], self.c['near'], depth_t ** 1.25)
        base = mix(self.c['haze'], base, 0.36 + 0.64 * depth_t ** 0.6)
        below = self.yy - prof[None, :]
        m = np.clip(below / 1.5, 0, 1)
        band = np.clip(below / (h * 0.16), 0, 1)
        colr = mix(base * (1.07 + 0.05 * (1 - depth_t)), base * 0.9, band[..., None])
        colr = mix(colr, self.c['haze'], (np.clip(below / (h * 0.2), 0, 1) ** 1.5 * mist * (1 - 0.6 * depth_t))[..., None])
        colr *= 1 + rough * noise2(h, w, 46, self.seed + seed + 5, (0.6, 1.3))[..., None] + rough * 0.6 * noise2(h, w, 9, self.seed + seed + 6, (1.6, 0.5))[..., None]
        # the side facing the light is a little warmer and brighter
        src = self.p['sun'] or self.p['moon']
        if src:
            slope = np.gradient(gaussian_filter(prof, w * 0.012))
            lit = np.clip(slope * (1 if src[0] < 0.5 else -1) * 0.6, -1, 1)[None, :] * np.exp(-np.clip(below, 0, None) / (h * 0.05))
            colr = np.clip(colr * (1 + 0.16 * lit[..., None]), 0, 1)
        self.img = mix(self.img, colr, m[..., None])
        return prof

    def flowers(self, prof, n, cols, seed=0, rmin=3, rmax=7, spread=0.08):
        r = np.random.default_rng(self.seed + 1300 + seed)
        im, d = self.layer()
        dim = 0.5 if self.phase == 'isha' else 0.8 if self.phase == 'maghrib' else 1
        for _ in range(n):
            x = int(r.integers(0, self.w))
            y = prof[x] + 8 + r.random() ** 1.5 * spread * self.h
            rr = r.integers(rmin, rmax + 1)
            d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=tup(rgb(cols[int(r.integers(0, len(cols)))]) * dim) + (255,))
        self.put(im, 0, 0.8)

    def water(self, y0, y1, glitter_x=None):
        h, w = self.h, self.w
        a, b = int(y0 * h), int(y1 * h)
        src = self.img[max(0, 2 * a - b):a][::-1]
        if len(src) < b - a:
            src = np.concatenate([src, np.repeat(src[-1:], b - a - len(src), 0)])
        ref = src[:b - a]
        ref = gaussian_filter(ref, (1.5, 9, 0))
        t = np.linspace(0, 1, b - a)[:, None, None]
        wat = mix(ref, self.c['water'], 0.28 + 0.3 * t)
        rip = noise2(b - a, w, 36, self.seed + 60, (0.16, 3.2))[..., None]
        wat *= 1 + 0.09 * rip
        self.img[a:b] = wat
        if glitter_x is not None and (self.p['sun'] or self.p['moon']):
            col = rgb(self.p['sun'][2]) if self.p['sun'] else rgb('#DCE4FF')
            yy = self.yy[a:b] - a
            xx = self.xx[a:b]
            wid = w * (0.02 + 0.07 * yy / (b - a))
            g = np.exp(-((xx - glitter_x * w) / wid) ** 2) * (0.35 + 0.65 * (noise2(b - a, w, 14, self.seed + 61, (0.12, 2.4)) > 0.1))
            self.img[a:b] = 1 - (1 - self.img[a:b]) * (1 - col * (g * 0.6)[..., None])

    def haze_band(self, y, thick=0.05, a=0.5):
        g = np.exp(-((self.yy - y * self.h) / (thick * self.h)) ** 2) * a
        g *= 0.7 + 0.3 * noise2(self.h, self.w, 120, self.seed + 70, (0.3, 2.5))
        self.img = mix(self.img, self.c['haze'], np.clip(g, 0, 1)[..., None])

    # ---- things drawn as shapes
    def layer(self):
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        return im, ImageDraw.Draw(im)

    def put(self, im, haze=0.0, soften=0.6):
        a = np.asarray(im.filter(ImageFilter.GaussianBlur(soften)), np.float32) / 255
        col = mix(a[..., :3], self.c['haze'], haze)
        self.img = mix(self.img, col, a[..., 3:4])

    def cypress(self, d, x, base, hgt, col, seed=0):
        r = np.random.default_rng(self.seed + 500 + seed + int(x))
        wdt = hgt * (0.13 + 0.04 * r.random())
        L, R = [], []
        for i in range(15):
            t = i / 14
            half = wdt * (math.sin(math.pi * (t ** 0.75)) ** 0.8) * (0.86 + 0.28 * r.random()) * (1 - 0.3 * t)
            y = base - hgt * t
            L.append((x - half, y)); R.append((x + half, y))
        d.polygon(L + R[::-1], fill=tup(col) + (255,))
        d.polygon([(x + wdt * 0.12, base - hgt * 0.98)] + R[::-1][:13] + [(x + wdt * 0.2, base)], fill=tup(col * 0.86) + (255,))

    def tree(self, d, x, base, s, col, seed=0):
        r = np.random.default_rng(self.seed + 700 + seed + int(x))
        d.line([(x, base), (x - s * 0.05, base - s * 0.5)], fill=tup(col * 0.5) + (255,), width=max(2, int(s * 0.07)))
        for _ in range(11):
            ox, oy, rr = (r.random() - 0.5) * s * 0.9, -s * (0.45 + r.random() * 0.5), s * (0.16 + r.random() * 0.16)
            shade = 0.82 + 0.34 * (-(ox / s) - (oy / s + 0.7))
            c = col * shade
            d.ellipse([x + ox - rr, base + oy - rr, x + ox + rr, base + oy + rr], fill=tup(c) + (255,))

    def palm(self, d, x, base, s, col, seed=0):
        r = np.random.default_rng(self.seed + 900 + seed)
        pts = [(x + math.sin(t * 1.3) * s * 0.12, base - s * t) for t in np.linspace(0, 1, 9)]
        d.line(pts, fill=tup(col * 0.8) + (255,), width=max(2, int(s * 0.055)))
        tx, ty = pts[-1]
        for a in np.linspace(-math.pi * 0.97, -math.pi * 0.03, 11):
            ln = s * (0.46 + 0.14 * r.random())
            spine = [(tx + math.cos(a) * ln * t, ty + math.sin(a) * ln * t * 0.75 + 0.6 * ln * t * t) for t in np.linspace(0, 1, 10)]
            d.line(spine, fill=tup(col) + (255,), width=max(2, int(s * 0.022)))
            for i in range(1, 10):  # the leaflets hanging from each frond
                x1, y1 = spine[i]
                d.line([(x1, y1), (x1 - math.cos(a) * s * 0.03, y1 + s * 0.085 * (1 - i / 14))], fill=tup(col) + (255,), width=max(2, int(s * 0.03)))
        d.ellipse([tx - s * 0.04, ty - s * 0.03, tx + s * 0.04, ty + s * 0.05], fill=tup(col * 0.8) + (255,))

    def arch_pts(self, cx, base, half, spring, k=0.45, n=24):
        """A pointed arch opening: sides rise to `spring`, then two arcs meet at the point."""
        r = half * (1 + k)
        top = math.sqrt(max(0, r * r - (half * k) ** 2))
        pts = [(cx - half, base), (cx - half, spring)]
        a0 = math.pi
        a1 = math.pi + math.acos((half * k) / r)
        for t in np.linspace(a0, a1, n):
            pts.append((cx + half * k + r * math.cos(t), spring + r * math.sin(t)))
        for t in np.linspace(2 * math.pi - math.acos((half * k) / r), 2 * math.pi, n):
            pts.append((cx - half * k + r * math.cos(t), spring + r * math.sin(t)))
        pts += [(cx + half, spring), (cx + half, base)]
        return pts, spring - top

    def dome(self, d, cx, base, r, col, onion=1.12):
        pts = []
        for t in np.linspace(0, math.pi, 40):
            bulge = 1 + 0.16 * math.sin(t) ** 3
            pts.append((cx - r * math.cos(t) * bulge * (0.92 if abs(math.cos(t)) > 0.97 else 1), base - r * onion * math.sin(t) ** 0.9))
        d.polygon(pts, fill=tup(col) + (255,))
        d.polygon([p for p in pts if p[0] >= cx] + [(cx + r * 0.25, base)], fill=tup(col * 0.8) + (255,))
        hl = [(cx - r * 0.62 + r * 0.22 * math.cos(t), base - r * 0.62 + r * 0.34 * math.sin(t)) for t in np.linspace(0, 2 * math.pi, 20)]
        d.polygon(hl, fill=tup(mix(col, np.ones(3, np.float32), 0.3)) + (255,))
        top = base - r * onion
        d.line([(cx, top + r * 0.04), (cx, top - r * 0.34)], fill=tup(GOLD) + (255,), width=max(2, int(r * 0.05)))
        cr = r * 0.11
        d.ellipse([cx - cr, top - r * 0.34 - cr * 2, cx + cr, top - r * 0.34], fill=tup(GOLD) + (255,))
        return top

    def minaret(self, d, x, base, hgt, wdt, lit):
        c, s = self.c['stone'], self.c['stone2']
        d.rectangle([x - wdt / 2, base - hgt, x + wdt / 2, base], fill=tup(c) + (255,))
        d.rectangle([x, base - hgt, x + wdt / 2, base], fill=tup(s) + (255,))
        for f in (0.62, 0.86):
            y = base - hgt * f
            d.rectangle([x - wdt * 0.95, y - wdt * 0.28, x + wdt * 0.95, y + wdt * 0.1], fill=tup(mix(c, s, 0.3)) + (255,))
        top = base - hgt
        d.rectangle([x - wdt * 0.36, top - wdt * 1.1, x + wdt * 0.36, top], fill=tup(mix(c, s, 0.4)) + (255,))
        if lit > 0:
            d.rectangle([x - wdt * 0.2, top - wdt * 0.9, x + wdt * 0.2, top - wdt * 0.2], fill=tup(self.c['lit']) + (255,))
        d.polygon([(x - wdt * 0.5, top - wdt * 1.1), (x + wdt * 0.5, top - wdt * 1.1), (x, top - wdt * 3.1)], fill=tup(self.c['dome']) + (255,))
        d.line([(x, top - wdt * 3.0), (x, top - wdt * 3.9)], fill=tup(GOLD) + (255,), width=max(2, int(wdt * 0.16)))
        return top - wdt * 1.1

    def mosque(self, cx, base, s, haze=0.0, minarets=2):
        im, d = self.layer()
        c, sh, lit, L = self.c['stone'], self.c['stone2'], self.c['lit'], self.p['lights']
        win = lit if L > 0 else sh * 0.78
        wl, wr, wt = cx - s * 1.25, cx + s * 1.25, base - s * 0.62
        lamps = []
        for i, mx in enumerate([cx - s * 1.42, cx + s * 1.42][:minarets]):
            lamps.append((mx, self.minaret(d, mx, base, s * 2.05, s * 0.15, L)))
        d.rectangle([wl, wt, wr, base], fill=tup(c) + (255,))
        d.rectangle([cx + s * 0.45, wt, wr, base], fill=tup(mix(c, sh, 0.55)) + (255,))
        d.rectangle([wl, wt - s * 0.05, wr, wt], fill=tup(mix(c, sh, 0.35)) + (255,))
        for i in range(7):
            ax = wl + (wr - wl) * (i + 0.5) / 7
            if i == 3:
                continue
            pts, _ = self.arch_pts(ax, base - s * 0.08, s * 0.1, base - s * 0.33)
            d.polygon(pts, fill=tup(win) + (255,))
        # the portal
        d.rectangle([cx - s * 0.3, base - s * 0.86, cx + s * 0.3, base], fill=tup(mix(c, np.ones(3, np.float32), 0.12)) + (255,))
        d.rectangle([cx - s * 0.3, base - s * 0.86, cx + s * 0.3, base - s * 0.8], fill=tup(self.c['dome']) + (255,))
        pts, _ = self.arch_pts(cx, base, s * 0.17, base - s * 0.42)
        d.polygon(pts, fill=tup(win if L > 0 else sh * 0.6) + (255,))
        # domes
        for dx, rr in ((-0.78, 0.26), (0.78, 0.26)):
            d.rectangle([cx + dx * s - rr * s * 0.8, wt - s * 0.1, cx + dx * s + rr * s * 0.8, wt], fill=tup(mix(c, sh, 0.3)) + (255,))
            self.dome(d, cx + dx * s, wt - s * 0.1, rr * s, self.c['dome'])
        d.rectangle([cx - s * 0.52, wt - s * 0.3, cx + s * 0.52, wt], fill=tup(c) + (255,))
        d.rectangle([cx + s * 0.1, wt - s * 0.3, cx + s * 0.52, wt], fill=tup(mix(c, sh, 0.5)) + (255,))
        for i in range(5):
            ax = cx - s * 0.4 + s * 0.2 * i
            d.rectangle([ax - s * 0.035, wt - s * 0.23, ax + s * 0.035, wt - s * 0.07], fill=tup(win) + (255,))
        self.dome(d, cx, wt - s * 0.3, s * 0.56, self.c['dome'])
        self.put(im, haze)
        if L > 0:
            self.glow(cx, base - s * 0.3, s * 2.2, lit, 0.2 * L)
            for lx, ly in lamps:
                self.glow(lx, ly + s * 0.08, s * 0.3, lit, 0.55 * L)

    def birds(self, n, x0, y0, spread, seed=0):
        r = np.random.default_rng(self.seed + 1100 + seed)
        im, d = self.layer()
        col = tup(mix(self.c['near'], self.c['haze'], 0.25)) + (220,)
        for _ in range(n):
            x, y = (x0 + (r.random() - 0.5) * spread) * self.w, (y0 + (r.random() - 0.5) * spread * 0.5) * self.h
            s = self.w * (0.008 + r.random() * 0.007)
            d.line([(x - s, y - s * 0.35), (x, y), (x + s, y - s * 0.45)], fill=col, width=max(2, int(self.w * 0.0028)))
        self.put(im, 0, 0.5)

    def finish(self, path, size):
        img = np.clip(self.img, 0, 1)
        # a little warmth and depth: darker corners, gentle contrast
        v = 1 - 0.16 * (((self.xx / self.w - 0.5) ** 2 + (self.yy / self.h - 0.55) ** 2) * 1.6)
        img = np.clip((img - 0.5) * 1.06 + 0.5, 0, 1) * v[..., None]
        with tempfile.TemporaryDirectory() as t:
            a, b = os.path.join(t, 'a.png'), os.path.join(t, 'b.png')
            Image.fromarray((img * 255).astype(np.uint8)).save(a)
            subprocess.run(['convert', a, '-paint', str(max(2, self.w // 380)), b], check=True)  # brush strokes
            painted = np.asarray(Image.open(b).convert('RGB'), np.float32) / 255
        img = mix(img, painted, 0.72)
        grain = noise2(self.h, self.w, 5, self.seed + 99) * 0.018 + noise2(self.h, self.w, 90, self.seed + 98, (0.5, 1.5)) * 0.02
        img = np.clip(img + grain[..., None], 0, 1)
        im = Image.fromarray((img * 255).astype(np.uint8)).resize(size, Image.LANCZOS)
        im.save(path, quality=84, optimize=True, progressive=True)


# ------------------------------------------------------------------ scenes

def valley(phase):
    """The tall header: open sky for the words, mountains in haze, a river, a mosque on its rise, cypresses."""
    c = Canvas(1440, 1800, phase, 11)
    c.sky(0.66)
    c.clouds(0.2, 0.5, 9, 0, 0.5 if phase != 'isha' else 0.28)
    c.ridge(0.615, 0.028, 0.5, 0.14, 1, peaks=True)
    c.ridge(0.64, 0.026, 0.34, 0.26, 2, peaks=True)
    c.haze_band(0.655, 0.022, 0.5)
    c.ridge(0.655, 0.03, 0.4, 0.3, 6)
    p = c.ridge(0.7, 0.028, 0.3, 0.46, 3)
    im, d = c.layer()
    col = mix(c.c['far'], c.c['near'], 0.6)
    for x in (90, 160, 205, 420, 470, 1010, 1220, 1270, 1345):
        c.cypress(d, x, p[x] + 24, 110 + (x % 60), col)
    for x in (300, 620, 1120):
        c.tree(d, x, p[x] + 26, 80, col)
    c.put(im, 0.34)
    gx = (c.p['sun'] or c.p['moon'])[0]
    c.water(0.745, 0.8, gx)
    hill = c.ridge(0.79, 0.03, 0.55, 0.78, 4, mist=0.0)
    hill2 = np.minimum(hill, (0.775 + 0.0 * hill) * c.h + ((np.arange(c.w) - 800) / 520.0) ** 2 * 90)
    cx = 800
    base = float(min(hill[cx], hill2[cx])) + 20
    c.mosque(cx, base, 165, haze=0.08)
    im, d = c.layer()
    col = mix(c.c['far'], c.c['near'], 0.93)
    for x in (360, 430, 490, 1085, 1140, 1195):
        c.cypress(d, x, hill[x] + 50, 240 + (x % 90), col)
    for x in (250, 575, 1010, 1290):
        c.tree(d, x, hill[x] + 56, 130, mix(col, c.c['haze'], 0.14))
    c.put(im, 0.05)
    c.flowers(hill, 70, ['#F6E7A8', '#FFFFFF', '#F3A7B8'], 1, 2, 4, 0.06)
    near = c.ridge(0.9, 0.03, 0.4, 1.0, 5, mist=0.0)
    c.flowers(near, 120, ['#F4D36A', '#FFFFFF', '#E8627A', '#F3A7B8'], 2, 3, 7, 0.08)
    im, d = c.layer()
    for x in (50, 140, 1300, 1395):
        c.cypress(d, x, 1800, 470 + (x % 120), c.c['near'] * 0.82)
    c.put(im, 0)
    if phase == 'day':
        c.birds(6, 0.3, 0.3, 0.2)
    return c


def card(phase, seed):
    return Canvas(1040, 1040, phase, seed)


def mist(phase):
    """Layer on layer of hills in mist, the light low between them."""
    c = card(phase, 21)
    c.sky(0.6)
    c.clouds(0.12, 0.34, 5, 0, 0.45 if phase != 'isha' else 0.25)
    for i, (y, t) in enumerate([(0.5, 0.0), (0.58, 0.18), (0.66, 0.38), (0.75, 0.6), (0.85, 0.82)]):
        c.ridge(y, 0.06, 0.5 - 0.05 * i, t, 10 + i)
        if i < 4:
            c.haze_band(y + 0.085, 0.022, 0.42)
    p = c.ridge(0.94, 0.03, 0.5, 1.0, 20, mist=0)
    im, d = c.layer()
    for x in (90, 170, 860, 930, 985):
        c.cypress(d, x, 1040, 300 + (x % 110), c.c['near'] * 0.9)
    c.put(im)
    if phase in ('day', 'fajr'):
        c.birds(5, 0.6, 0.26, 0.22)
    return c


def sea(phase):
    """A still sea at the edge of the land, the light laid across it."""
    c = card(phase, 31)
    c.sky(0.56)
    c.clouds(0.18, 0.44, 6, 0, 0.5 if phase != 'isha' else 0.25)
    c.ridge(0.535, 0.02, 0.6, 0.1, 1)
    gx = (c.p['sun'][0] if c.p['sun'] else c.p['moon'][0])
    c.water(0.56, 1.0, gx)
    p = c.ridge(0.9, 0.05, 0.35, 1.0, 3, mist=0)
    im, d = c.layer()
    c.palm(d, 150, 1000, 430, c.c['near'] * 0.9, 1)
    c.palm(d, 250, 1040, 330, c.c['near'] * 0.9, 2)
    c.put(im)
    return c


def minaret(phase):
    """A dome and its minaret close up against the sky."""
    c = card(phase, 41)
    c.sky(0.95)
    c.clouds(0.3, 0.7, 7, 0, 0.5 if phase != 'isha' else 0.25)
    c.ridge(0.86, 0.03, 0.5, 0.15, 1)
    im, d = c.layer()
    st, sh = c.c['stone'], c.c['stone2']
    top = c.minaret(d, 330, 1060, 880, 96, c.p['lights'])
    d.rectangle([520, 800, 1040, 1040], fill=tup(st) + (255,))
    d.rectangle([820, 800, 1040, 1040], fill=tup(mix(st, sh, 0.5)) + (255,))
    d.rectangle([520, 780, 1040, 806], fill=tup(c.c['dome']) + (255,))
    for i in range(4):
        pts, _ = c.arch_pts(600 + i * 130, 1040, 38, 900)
        d.polygon(pts, fill=tup(c.c['lit'] if c.p['lights'] else sh * 0.75) + (255,))
    d.rectangle([600, 700, 960, 782], fill=tup(mix(st, sh, 0.2)) + (255,))
    c.dome(d, 780, 700, 215, c.c['dome'])
    c.put(im)
    if c.p['lights']:
        c.glow(330, top + 30, 150, c.c['lit'], 0.6 * c.p['lights'])
        c.glow(780, 960, 420, c.c['lit'], 0.16 * c.p['lights'])
    im, d = c.layer()
    for x in (60, 150, 980):
        c.cypress(d, x, 1040, 380 + (x % 90), c.c['near'] * 0.9)
    c.put(im)
    if phase != 'isha':
        c.birds(7, 0.66, 0.22, 0.3)
    return c


def arch(phase):
    """Looking out through a pointed arch to the hills, a prayer rug on the floor."""
    c = card(phase, 51)
    c.sky(0.6)
    c.clouds(0.2, 0.42, 5, 0, 0.45 if phase != 'isha' else 0.25)
    c.ridge(0.52, 0.05, 0.5, 0.05, 1)
    c.ridge(0.6, 0.04, 0.4, 0.4, 2)
    hill = c.ridge(0.68, 0.03, 0.5, 0.75, 3, mist=0.3)
    c.mosque(560, hill[560] + 12, 62, haze=0.25)
    im, d = c.layer()
    for x in (330, 390, 700, 760):
        c.cypress(d, x, hill[x] + 30, 130 + (x % 50), mix(c.c['far'], c.c['near'], 0.9))
    c.put(im, 0.1)
    # the wall around the opening
    st, sh = c.c['stone'], c.c['stone2']
    wall = mix(st, sh, 0.25)
    pts, apex = c.arch_pts(520, 800, 300, 420, 0.5)
    mask = Image.new('L', (c.w, c.h), 255)
    ImageDraw.Draw(mask).polygon(pts, fill=0)
    m = np.asarray(mask.filter(ImageFilter.GaussianBlur(1.2)), np.float32)[..., None] / 255
    shade = 1 - 0.22 * np.clip((c.xx - 520) / 520, -1, 1)[..., None] - 0.1 * (c.yy / c.h)[..., None]
    tex = 1 + 0.018 * noise2(c.h, c.w, 120, 77)[..., None]
    c.img = mix(c.img, wall * shade * tex, m)
    im, d = c.layer()
    d.line(pts[1:-1], fill=tup(GOLD) + (255,), width=7)
    pts2, _ = c.arch_pts(520, 800, 334, 420, 0.5)
    d.line(pts2[1:-1], fill=tup(c.c['dome']) + (255,), width=16)
    pts3, _ = c.arch_pts(520, 800, 352, 420, 0.5)
    d.line(pts3[1:-1], fill=tup(GOLD) + (255,), width=4)
    # the floor and the rug
    d.polygon([(0, 800), (1040, 800), (1040, 1040), (0, 1040)], fill=tup(mix(sh, st, 0.35)) + (255,))
    d.polygon([(220, 800), (820, 800), (1040, 990), (1040, 1040), (0, 1040), (0, 990)], fill=tup(mix(sh, st, 0.6)) + (255,))
    rug, rug2 = rgb('#2F5FA8'), rgb('#B8463A')
    if phase == 'isha':
        rug, rug2 = rug * 0.6, rug2 * 0.6
    d.polygon([(360, 842), (680, 842), (800, 1030), (240, 1030)], fill=tup(rug2) + (255,))
    d.polygon([(378, 856), (662, 856), (764, 1016), (276, 1016)], fill=tup(GOLD * (1 if phase != 'isha' else 0.7)) + (255,))
    d.polygon([(392, 866), (648, 866), (742, 1006), (298, 1006)], fill=tup(rug) + (255,))
    apts, _ = c.arch_pts(520, 990, 96, 930, 0.5)
    d.line(apts, fill=tup(GOLD) + (255,), width=5)
    c.put(im)
    # light falling through the arch onto the floor
    lc = rgb(c.p['sun'][2]) if c.p['sun'] else rgb('#AEBBFF')
    g = np.clip(1 - np.abs(c.xx - 520 - (c.yy - 800) * 0.25) / (240 + (c.yy - 800) * 0.6), 0, 1) * np.clip((c.yy - 800) / 30, 0, 1)
    c.img = 1 - (1 - c.img) * (1 - lc * (g * 0.22)[..., None])
    return c


def dunes(phase):
    """Dunes under the new crescent, a lantern's light by the palms."""
    c = card(phase, 61)
    c.p = dict(c.p, moon=(0.7, 0.24) if phase in ('isha', 'maghrib', 'fajr') else None)
    c.sky(0.62)
    c.clouds(0.3, 0.5, 4, 0, 0.4 if phase != 'isha' else 0.2)
    sand_f, sand_n = (rgb('#E9C9A0'), rgb('#B9793F')) if phase == 'day' else (mix(c.c['far'], rgb('#E0A070'), 0.45), mix(c.c['near'], rgb('#8A4A30'), 0.4))
    for i, (y, t) in enumerate([(0.6, 0.0), (0.68, 0.3), (0.77, 0.6), (0.88, 0.95)]):
        c.ridge(y, 0.05, 0.75 - 0.1 * i, t, 3 + i, mist=0.35, col=mix(sand_f, sand_n, t), rough=0.03)
    im, d = c.layer()
    dark = mix(sand_n, c.c['near'], 0.75) * 0.8
    c.palm(d, 250, 900, 380, dark, 1)
    c.palm(d, 330, 930, 290, dark, 2)
    c.palm(d, 170, 940, 250, dark, 3)
    d.polygon([(600, 900), (690, 800), (780, 900)], fill=tup(mix(c.c['stone'], c.c['stone2'], 0.3)) + (255,))
    d.polygon([(690, 800), (780, 900), (735, 900)], fill=tup(c.c['stone2']) + (255,))
    d.polygon([(668, 900), (690, 850), (712, 900)], fill=tup(c.c['lit'] if c.p['lights'] else c.c['stone2'] * 0.7) + (255,))
    c.put(im)
    if c.p['lights']:
        c.glow(690, 880, 190, c.c['lit'], 0.5 * c.p['lights'])
    return c


def garden(phase):
    """A garden gate: a tiled arch in a wall, trees leaning over it, the hills through it."""
    c = card(phase, 71)
    c.sky(0.62)
    c.clouds(0.14, 0.36, 5, 0, 0.45 if phase != 'isha' else 0.25)
    c.ridge(0.5, 0.05, 0.5, 0.1, 1)
    c.ridge(0.58, 0.04, 0.45, 0.45, 2)
    im, d = c.layer()
    green = mix(c.c['far'], c.c['near'], 0.85)
    for x in (120, 200, 840, 930):
        c.cypress(d, x, 760, 430 + (x % 80), green)
    for x in (300, 740):
        c.tree(d, x, 740, 260, mix(green, rgb('#7FB060') if phase == 'day' else c.c['haze'], 0.25))
    c.put(im, 0.08)
    st, sh = c.c['stone'], c.c['stone2']
    im, d = c.layer()
    d.rectangle([0, 700, 1040, 880], fill=tup(st) + (255,))
    d.rectangle([0, 690, 1040, 708], fill=tup(mix(st, sh, 0.4)) + (255,))
    d.rectangle([330, 430, 710, 880], fill=tup(mix(st, np.ones(3, np.float32), 0.1)) + (255,))
    d.rectangle([330, 430, 710, 462], fill=tup(c.c['dome']) + (255,))
    d.rectangle([330, 462, 710, 470], fill=tup(GOLD) + (255,))
    for x in (60, 190, 850, 980):
        pts, _ = c.arch_pts(x, 850, 40, 780)
        d.polygon(pts, fill=tup(c.c['dome'] * (1 if not c.p['lights'] else 0.9)) + (255,))
    c.put(im)
    # the opening shows the land beyond
    pts, _ = c.arch_pts(520, 880, 130, 640, 0.5)
    hole = Image.new('L', (c.w, c.h), 0)
    ImageDraw.Draw(hole).polygon(pts, fill=255)
    hm = np.asarray(hole.filter(ImageFilter.GaussianBlur(1)), np.float32)[..., None] / 255
    far = Canvas(1040, 1040, phase, 72)
    far.sky(0.7)
    far.ridge(0.66, 0.04, 0.5, 0.2, 1)
    h2 = far.ridge(0.76, 0.03, 0.5, 0.6, 2)
    far.mosque(520, h2[520] + 8, 40, haze=0.3, minarets=2)
    far.ridge(0.84, 0.02, 0.5, 0.9, 3, mist=0.1)
    c.img = mix(c.img, far.img, hm)
    im, d = c.layer()
    d.line(pts[1:-1], fill=tup(GOLD) + (255,), width=6)
    p2, _ = c.arch_pts(520, 880, 152, 640, 0.5)
    d.line(p2[1:-1], fill=tup(c.c['dome']) + (255,), width=14)
    # the path and flower beds
    d.polygon([(0, 880), (1040, 880), (1040, 1040), (0, 1040)], fill=tup(mix(green, c.c['near'], 0.3)) + (255,))
    d.polygon([(400, 880), (640, 880), (800, 1040), (240, 1040)], fill=tup(mix(st, sh, 0.3)) + (255,))
    r = np.random.default_rng(73)
    cols = [rgb('#E8627A'), rgb('#F4D36A'), rgb('#FFFFFF'), rgb('#E88AB0')]
    for _ in range(170):
        x, y = r.integers(0, 1040), r.integers(895, 1035)
        if 240 + (y - 880) * -1.0 + 160 < x < 800 - (1040 - y) * 1.0 + 0 and 400 - (y - 880) < x < 640 + (y - 880):
            continue
        cc = cols[r.integers(0, 4)] * (1 if phase != 'isha' else 0.55)
        rr = r.integers(4, 9)
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=tup(cc) + (255,))
    c.put(im)
    if c.p['lights']:
        c.glow(520, 760, 260, c.c['lit'], 0.22 * c.p['lights'])
    return c


def olive(phase):
    """One old tree on a hill, the valley and the light beyond it."""
    c = card(phase, 81)
    c.sky(0.64)
    c.clouds(0.16, 0.4, 6, 0, 0.5 if phase != 'isha' else 0.25)
    c.ridge(0.55, 0.05, 0.5, 0.05, 1)
    c.ridge(0.63, 0.04, 0.45, 0.3, 2)
    c.haze_band(0.7, 0.03, 0.45)
    h2 = c.ridge(0.73, 0.03, 0.5, 0.55, 3)
    c.mosque(250, h2[250] + 10, 46, haze=0.3)
    hill = c.ridge(0.84, 0.06, 0.9, 0.95, 4, mist=0)
    im, d = c.layer()
    x, base = 690, hill[690] + 30
    bark = c.c['near'] * 0.6
    d.polygon([(x - 34, base), (x - 16, base - 190), (x - 60, base - 300), (x - 30, base - 310), (x + 4, base - 220), (x + 40, base - 330), (x + 66, base - 316), (x + 30, base - 180), (x + 40, base)], fill=tup(bark) + (255,))
    leaf = mix(c.c['near'], rgb('#8FA86A') if phase in ('day', 'fajr') else c.c['far'], 0.45)
    r = np.random.default_rng(82)
    for _ in range(60):
        ox, oy = (r.random() - 0.5) * 520, -260 - r.random() * 250 + abs((r.random() - 0.5)) * 120
        rr = 34 + r.random() * 46
        shade = 0.8 + 0.4 * (-(ox / 520) + (-(oy + 380) / 400))
        d.ellipse([x + ox - rr, base + oy - rr * 0.8, x + ox + rr, base + oy + rr * 0.8], fill=tup(leaf * shade) + (255,))
    c.put(im)
    return c


def night(phase):
    """Always the night: a great moon, a sky full of stars, one window lit on the hill."""
    c = card('isha', 91)
    c.p = dict(c.p, moon=(0.3, 0.3), stars=1.5)
    c.sky(0.7)
    c.clouds(0.4, 0.6, 4, 0, 0.3)
    c.ridge(0.62, 0.05, 0.5, 0.1, 1)
    c.ridge(0.7, 0.04, 0.5, 0.4, 2)
    hill = c.ridge(0.8, 0.05, 0.8, 0.8, 3, mist=0.2)
    im, d = c.layer()
    st, sh = c.c['stone'], c.c['stone2']
    x, b = 660, hill[660] + 20
    d.rectangle([x - 110, b - 150, x + 110, b], fill=tup(st) + (255,))
    d.rectangle([x + 20, b - 150, x + 110, b], fill=tup(sh) + (255,))
    c.dome(d, x, b - 150, 86, c.c['dome'])
    pts, _ = c.arch_pts(x - 40, b - 30, 26, b - 80)
    d.polygon(pts, fill=tup(c.c['lit']) + (255,))
    for cx in (430, 500, 850, 910):
        c.cypress(d, cx, hill[cx] + 30, 240 + (cx % 80), c.c['near'] * 1.3)
    c.put(im)
    c.glow(x - 40, b - 60, 170, c.c['lit'], 0.6)
    c.ridge(0.94, 0.03, 0.5, 1.0, 5, mist=0)
    return c


SCENES = dict(valley=valley, mist=mist, sea=sea, minaret=minaret, arch=arch, dunes=dunes, garden=garden, olive=olive, night=night)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    want = sys.argv[1:] or list(SCENES)
    for name in want:
        for phase in (['isha'] if name == 'night' else list(PHASES)):
            c = SCENES[name](phase)
            size = (900, 1125) if name == 'valley' else (520, 520)
            c.finish(os.path.join(OUT, f'{name}-{phase}.jpg'), size)
            print(name, phase)
