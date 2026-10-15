#!/usr/bin/env python3
"""Export the game's assets for the F256.

Runs the browser prototype headless with ?export (game/js/export.js does the drawing and packing), pulls the packed
files out of the page, and writes them to f256/assets/ plus the generated defs file f256/src/tskassets.d and tables f256/src/tsktabs.a.

Then it proves the data: it rebuilds pictures from the .bin files alone (tiles + maps + CLUT, cells + frame table
+ CLUT) into f256/assets/preview/, to compare with the browser before anything touches hardware.

    python3 f256/tools/export.py            # export + previews
    python3 f256/tools/export.py --check    # previews only, from the existing .bin files
"""
import base64, html, json, os, re, struct, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GAME = ROOT / 'game'
ASSETS = ROOT / 'f256' / 'assets'
SRC = ROOT / 'f256' / 'src'
PREVIEW = ASSETS / 'preview'
CHROMIUM = os.environ.get('CHROMIUM', 'chromium')


def export():
    url = (GAME / 'index.html').as_uri() + '?export'
    out = subprocess.run([CHROMIUM, '--headless=new', '--no-sandbox', '--disable-gpu', '--virtual-time-budget=20000',
                          '--dump-dom', url], capture_output=True, text=True, timeout=300)
    m = re.search(r'<pre id="tskexport">(.*?)</pre>', out.stdout, re.S)
    if not m:
        sys.exit('export failed: no <pre id="tskexport"> in the page\n' + out.stderr[-2000:])
    data = json.loads(html.unescape(m.group(1)))
    ASSETS.mkdir(parents=True, exist_ok=True)
    SRC.mkdir(parents=True, exist_ok=True)
    for name, b64 in data['files'].items():
        (ASSETS / name).write_bytes(base64.b64decode(b64))
    (SRC / 'tskassets.d').write_text(data['defs'])
    (SRC / 'tsktabs.a').write_text(data['tabs'])
    r = data['report']
    for st in r['stages']:
        print(f"{st['key']}: tiles {st['tiles']} in {st['sets']} set(s); maps " + ', '.join(f"{m['name']} {m['w']}x15" for m in st['maps']))
    print(f"shared sprite cells {r['cells']}, stage cells {r['ovl']}; frames {r['frames']}; CLUTs: sprites {r['sprClut']}, tiles {r['tileClut']}")
    for k, v in r['sizes'].items():
        print(f'  {k:16} {v:8} bytes')


def defs():
    """The equates from the generated defs file, as a dict."""
    d = {}
    for line in (SRC / 'tskassets.d').read_text().splitlines():
        m = re.match(r'^(\S+)\s+equ\s+(\S+)', line)
        if m:
            v = m.group(2)
            d[m.group(1)] = int(v[1:], 16) if v.startswith('$') else int(v)
    return d


def clut(name):
    b = (ASSETS / name).read_bytes()
    return [(b[i * 4 + 2], b[i * 4 + 1], b[i * 4], 255 if i else 0) for i in range(256)]


def previews():
    from PIL import Image
    D = defs()
    PREVIEW.mkdir(parents=True, exist_ok=True)
    tc = clut('clut_tile.bin')

    # each stage's three maps composited, the way VICKY would draw them (Main Street also at its darkest)
    def draw_map(img, i, scroll):
        w, off = D[f'{sk}.MAP{i}.W'], D[f'{sk}.MAP{i}.Of']
        for ty in range(15):
            for tx in range(w):
                o = off + (ty * w + tx) * 2
                n = maps[o] | ((maps[o + 1] & 7) << 8)
                x0 = tx * 16 - int(scroll)
                if x0 <= -16 or x0 >= img.width:
                    continue
                for y in range(16):
                    for x in range(16):
                        p = tiles[n * 256 + y * 16 + x]
                        if p and 0 <= x0 + x < img.width:
                            img.putpixel((x0 + x, ty * 16 + y), tc[p])
    dusk = (ASSETS / 'clut_dusk.bin').read_bytes()
    for sk, sf in (('BH', 'bh'), ('MS', 'ms')):
        tiles = (ASSETS / f'tiles_{sf}.bin').read_bytes()
        maps = (ASSETS / f'maps_{sf}.bin').read_bytes()
        for scroll, shade in ((0, None), (800, None)) + (((1200, 12),) if sk == 'MS' else ()):
            if shade is not None:
                tc = [(dusk[shade * 1024 + i * 4 + 2], dusk[shade * 1024 + i * 4 + 1], dusk[shade * 1024 + i * 4], 255) for i in range(256)]
            img = Image.new('RGBA', (320, 240), (0, 0, 0, 255))
            for i, rate in ((0, 0.25), (1, 0.5), (2, 1.0)):
                draw_map(img, i, scroll * rate)
            img.convert('RGB').resize((640, 480), Image.NEAREST).save(PREVIEW / f'layers_{sf}_{scroll}{"_night" if shade else ""}.png')
            tc = clut('clut_tile.bin')

    # every animation frame rebuilt from cells + frame table, facing right and mirrored
    shared = (ASSETS / 'sprites.bin').read_bytes()
    banks = {'TB': 'bh', 'CY': 'ms', 'TW': 'ms'}       # stage groups: their cells come from spr_<stage>.bin
    frm = (ASSETS / 'frames.bin').read_bytes()
    sc = clut('clut_spr.bin')
    nf = struct.unpack('>H', frm[:2])[0]

    cur = [shared]

    def draw_frame(img, f, ox, oy, spr=None):
        spr = spr or cur[0]
        o = struct.unpack('>H', frm[2 + f * 2:4 + f * 2])[0]
        n = frm[o]
        for k in range(n):
            dx, dy = struct.unpack('>bb', frm[o + 1 + k * 4:o + 3 + k * 4])
            cell = struct.unpack('>H', frm[o + 3 + k * 4:o + 5 + k * 4])[0]
            for y in range(32):
                for x in range(32):
                    p = spr[cell * 1024 + y * 32 + x]
                    if p:
                        img.putpixel((ox + dx + x, oy + dy + y), sc[p])
        return n
    prefixes = [k[:-6] for k in D if k.endswith('.First')]
    for n, prefix in enumerate(prefixes):           # every group: facing right, and below it mirrored (if it has mirrors)
        first, mir = D[f'{prefix}.First'], D[f'{prefix}.Mir']
        cur[0] = shared + ((ASSETS / f'spr_{banks[prefix]}.bin').read_bytes() if prefix in banks else b'')
        last = D[f'{prefixes[n + 1]}.First'] if n + 1 < len(prefixes) else nf
        cnt, rows = (mir, 2) if mir else (last - first, 1)
        tx = prefix == 'TX'
        cw, per = (200, 6) if tx else (80, 16)
        img = Image.new('RGBA', (min(cnt, per) * cw + 20, ((cnt + per - 1) // per) * rows * 80 + 20), (40, 26, 16, 255))
        for i in range(cnt):
            col, row = i % per, (i // per) * rows
            x0, y0 = (cw // 2, 16) if tx else (40, 72)
            draw_frame(img, first + i, x0 + col * cw, y0 + row * 80)
            if mir:
                draw_frame(img, first + mir + i, x0 + col * cw, y0 + (row + 1) * 80)
        img.convert('RGB').save(PREVIEW / f'frames_{prefix}.png')
    print(f'previews: {PREVIEW} ({nf} frames checked)')


if __name__ == '__main__':
    if '--check' not in sys.argv:
        export()
    previews()
