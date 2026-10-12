#!/usr/bin/env python3
"""Export the game's assets for the F256.

Runs the browser prototype headless with ?export (game/js/export.js does the drawing and packing), pulls the packed
files out of the page, and writes them to f256/assets/ plus the generated defs file f256/src/tskassets.d.

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
    r = data['report']
    print(f"tiles {r['tiles']} in {r['sets']} set(s); maps " + ', '.join(f"{m['name']} {m['w']}x15" for m in r['maps']))
    print(f"sprite cells {r['cells']} ({r['cells']} K), frames {r['frames']}; CLUTs: sprites {r['sprClut']}, tiles {r['tileClut']}")
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
    tiles = (ASSETS / 'tiles.bin').read_bytes()
    maps = (ASSETS / 'maps.bin').read_bytes()
    tc = clut('clut_tile.bin')

    # the three maps composited at scroll 0, and each map on its own, the way VICKY would draw them
    def draw_map(img, i, scroll):
        w, off = D[f'MAP{i}.W'], D[f'MAP{i}.Of']
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
    for scroll in (0, 800):
        img = Image.new('RGBA', (320, 240), (0, 0, 0, 255))
        for i, rate in ((0, 0.25), (1, 0.5), (2, 1.0)):
            draw_map(img, i, scroll * rate)
        img.convert('RGB').resize((640, 480), Image.NEAREST).save(PREVIEW / f'layers_scroll{scroll}.png')

    # every animation frame rebuilt from cells + frame table, facing right and mirrored
    spr = (ASSETS / 'sprites.bin').read_bytes()
    frm = (ASSETS / 'frames.bin').read_bytes()
    sc = clut('clut_spr.bin')
    nf = struct.unpack('>H', frm[:2])[0]

    def draw_frame(img, f, ox, oy):
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
    for prefix in ('HR', 'SK'):
        first, mir = D[f'{prefix}.First'], D[f'{prefix}.Mir']
        img = Image.new('RGBA', (min(mir, 16) * 80 + 20, ((mir + 15) // 16) * 2 * 80 + 20), (40, 26, 16, 255))
        for i in range(mir):
            col, row = i % 16, (i // 16) * 2
            draw_frame(img, first + i, 40 + col * 80, 72 + row * 80)
            draw_frame(img, first + mir + i, 40 + col * 80, 72 + (row + 1) * 80)
        img.convert('RGB').save(PREVIEW / f'frames_{prefix}.png')
    print(f'previews: {PREVIEW} ({nf} frames checked)')


if __name__ == '__main__':
    if '--check' not in sys.argv:
        export()
    previews()
