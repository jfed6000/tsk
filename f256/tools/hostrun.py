#!/usr/bin/env python3
"""hostrun.py - the tsk module on the host 6809 (Tempest's tools/cpu6809.py), the OS-9 calls answered here.

Proves the game logic, never the hardware: the driver calls succeed and do nothing, except what the program
reads back (SS.GfxAlloc's block numbers, the asset files through I$Open/I$Read, SS.LiveKeys from a script or
nothing). Each pass (one F$Sleep) can print the variables named on the command line, from tsk.map, and the
sprite records the pass pushed.

    python3 tools/hostrun.py --demo --passes 600 --watch hst,ht,hx,hz,hh,hvh --every 5
    python3 tools/hostrun.py --demo --passes 400 --records 120
    python3 tools/hostrun.py --args bg --passes 3000 --every 60 --watch hst,hx,hhp,hlives --enemies
"""
import argparse, os, re, sys

TEMPEST = os.path.expanduser('~/projects/wild/tempest/tools')
sys.path.insert(0, TEMPEST)
from cpu6809 import CPU6809, C  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
F256 = os.path.dirname(HERE)
MODBASE, PARAMS, WINDOW = 0x8000, 0x7F00, 0x4000      # the data area is at 0 (up to 16K)
F_EXIT, F_ICPT, F_SLEEP, F_MAPBLK, F_CLRBLK = 0x06, 0x09, 0x0A, 0x4F, 0x50
I_OPEN, I_READ, I_WRITLN, I_GETSTT, I_SETSTT, I_CLOSE = 0x84, 0x89, 0x8C, 0x8D, 0x8E, 0x8F
SS_MCR, SS_LIVEKEYS, SS_GFXALLOC, SS_SPRPUSH = 0x8C, 0xC6, 0xD4, 0xD1
E_EOF, E_PNNF = 211, 216


class Exit(Exception):
    pass


class Host(CPU6809):
    def __init__(self, sym, passes, watch, every, records, enemies=False):
        super().__init__()
        self.sym, self.passes, self.watch, self.every, self.records = sym, passes, watch, every, records
        self.enemies, self.kos, self.hits = enemies, 0, 0
        self.files, self.nextblk, self.npass, self.pushes = {}, 0x40, 0, []

    def v(self, name, size=None):
        a = self.sym[name]
        if size == 1:
            return self.mem[a]
        n = self.mem[a] << 8 | self.mem[a + 1]
        return n - 0x10000 if n & 0x8000 else n

    def step(self):
        pc = self.pc
        if self.mem[pc] == 0x10 and self.mem[pc + 1] == 0x3F:
            fn = self.mem[pc + 2]
            self.pc = (pc + 3) & 0xFFFF
            err = self.os9(fn)
            if err:
                self.b, self.cc = err, self.cc | C
            else:
                self.cc &= ~C
            return
        super().step()

    def os9(self, fn):
        if fn == F_EXIT:
            raise Exit(self.b)
        if fn == F_SLEEP:
            self.npass += 1
            c = self.cycles - getattr(self, 'c0', 0)
            self.c0 = self.cycles
            if self.npass > 1:
                self.cmax = max(getattr(self, 'cmax', 0), c)
                self.ctot = getattr(self, 'ctot', 0) + c
            if self.watch and self.npass % self.every == 0:
                line = f'{self.npass:5} ' + ' '.join(f'{w}={self.v(w, 1 if w in BYTES else None)}' for w in self.watch)
                if self.enemies:
                    line += '  ' + self.enemy_table()
                print(line)
            if self.npass >= self.passes:
                raise Exit(0)
            return 0
        if fn in (F_ICPT, F_CLRBLK, I_CLOSE):
            return 0
        if fn == F_MAPBLK:
            self.u = WINDOW
            return 0
        if fn == I_WRITLN:
            s = bytes(self.mem[self.x:self.x + self.y]).split(b'\r')[0]
            print('  [tsk]', s.decode('latin-1'))
            return 0
        if fn == I_OPEN:
            name = bytes(self.mem[self.x:self.x + 32]).split(b'\r')[0].decode()
            path = os.path.join(F256, 'assets', name)
            if not os.path.exists(path):
                return E_PNNF
            p = len(self.files) + 3
            self.files[p] = [open(path, 'rb').read(), 0]
            self.a = p
            return 0
        if fn == I_READ:
            f = self.files[self.a]
            chunk = f[0][f[1]:f[1] + self.y]
            if not chunk:
                return E_EOF
            f[1] += len(chunk)
            if self.x + len(chunk) <= 0x10000:
                self.mem[self.x:self.x + len(chunk)] = chunk
            self.y = len(chunk)
            return 0
        if fn == I_GETSTT:
            if self.b == SS_LIVEKEYS:
                self.a = self.x = self.y = self.u = 0
                return 0
            if self.b == SS_MCR:
                self.x, self.y = 1, 0
                return 0
            return 208
        if fn == I_SETSTT:
            if self.b == SS_GFXALLOC:
                self.x, self.nextblk = self.nextblk, self.nextblk + self.x
            elif self.b == SS_SPRPUSH and self.records and self.npass == self.records:
                self.dump_records()
            return 0
        raise Exit(f'unmodelled os9 call ${fn:02X}')

    def enemy_table(self):
        """Each live enemy: state, x and z in pixels, health, skull (h = headless)."""
        e0, n, size = self.sym['en'], 5, 23
        out = []
        for i in range(n):
            b = self.mem[e0 + i * size:e0 + (i + 1) * size]
            if not b[0]:
                continue
            w = lambda o: ((b[o] << 8 | b[o + 1]) ^ 0x8000) - 0x8000
            st = ['-', 'rise', 'appr', 'aim', 'shoot', 'reload', 'stag', 'headl', 'air', 'down', 'getup'][b[0]]
            out.append(f'{st}@{w(2) >> 4},{w(4) >> 4}{"/h" + str(w(6) >> 4) if w(6) else ""} hp{(b[15] ^ 0x80) - 0x80}{"" if b[19] else " H"}')
        return ' | '.join(out)

    def dump_records(self):
        r = self.sym['recs']
        for i in range(self.v('nrec', 1)):
            b = self.mem[r + i * 8:r + i * 8 + 8]
            print(f'  rec {i:2}: ctrl={b[0]:02X} addr={b[1]:02X}{b[2]:02X}{b[3]:02X} x={b[4] << 8 | b[5]:4} y={b[6] << 8 | b[7]:4}')


BYTES = set()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--demo', action='store_true')
    ap.add_argument('--passes', type=int, default=300)
    ap.add_argument('--watch', default='hst,ht,hx,hz,hh,hvh,hfr')
    ap.add_argument('--every', type=int, default=1)
    ap.add_argument('--records', type=int, default=0, help='print the sprite records pushed on this pass')
    ap.add_argument('--args', default=None, help='the parameters (d demo, b autopilot, g god); --demo = d')
    ap.add_argument('--enemies', action='store_true', help='print the enemy table with the watched variables')
    a = ap.parse_args()
    sym = {}
    for line in open(os.path.join(F256, 'tsk.map')):
        m = re.match(r'Symbol: (\S+) \(\S+\) = ([0-9A-F]+)', line)
        if m:
            sym[m.group(1)] = int(m.group(2), 16)
    for line in open(os.path.join(F256, 'src', 'data.a')):      # the one-byte variables
        m = re.match(r'^(\w+)\s+rmb\s+1\b', line)
        if m:
            BYTES.add(m.group(1))
    mod = open(os.path.join(F256, 'tsk'), 'rb').read()
    exe, size = mod[9] << 8 | mod[10], mod[11] << 8 | mod[12]
    h = Host(sym, a.passes, [w for w in a.watch.split(',') if w], a.every, a.records, a.enemies)
    h.load(MODBASE, mod)
    args = a.args if a.args is not None else 'd' if a.demo else ''
    h.load(PARAMS, args.encode() + b'\r')
    h.x, h.u, h.dp, h.s, h.pc = PARAMS, 0, 0, size, MODBASE + exe
    try:
        while True:
            h.step()
    except Exit as e:
        print('exit:', e)
    if h.npass > 2:   # 6809 cycles in a pass, the OS-9 calls not counted (a 60 Hz tick is ~105,000 at 6.29 MHz)
        print(f'cycles a pass: average {h.ctot // (h.npass - 1)}, most {h.cmax}')


if __name__ == '__main__':
    main()
