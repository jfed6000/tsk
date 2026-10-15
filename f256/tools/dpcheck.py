#!/usr/bin/env python3
"""dpcheck.py - every direct-page operand (<name) in the tsk sources must be a direct-page variable from
src/data.a (declared before dpend). A label there instead (e.g. after a careless rename) assembles without a
murmur and writes over whatever variable shares its low byte. Run by make; exits non-zero on a stray one."""
import re, sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / 'src'
data = (SRC / 'data.a').read_text()
dp = set(re.findall(r'^(\w+)\s+rmb\b', data[:data.index('dpend')], re.M))
bad = []
for f in sorted(SRC.glob('*.a')):
    for n, line in enumerate(f.read_text().splitlines(), 1):
        if not line.strip() or line.lstrip().startswith('*'):
            continue
        tok = line.split()
        operand = (tok[2] if len(tok) > 2 else '') if not line[0].isspace() else (tok[1] if len(tok) > 1 else '')
        for m in re.finditer(r'<([A-Za-z_][\w.]*)', operand):
            name = m.group(1)
            if name.lower() not in {d.lower() for d in dp}:
                bad.append(f'{f.name}:{n}: <{name} is not a direct-page variable')
for b in bad:
    print(b)
sys.exit(1 if bad else 0)
