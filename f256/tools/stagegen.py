#!/usr/bin/env python3
"""stagegen.py - the glue between tsk (the core module) and the stage modules (tskms, tskgt, tskcd).

A stage's own code (its boss, its gimmicks) lives in a stage module of at most 8K, F$Loaded with the stage's art
(stage.a LoadStage, stgmod.a) into the process's free 8K slot, so the core only ever holds one stage's code.
The sources stay as they were: calls across the line go through stubs, written here from the sources.

    python3 tools/stagegen.py vec     src/tskvec.d (the data area's slots) and src/tskhook.a (the core's side)
    python3 tools/stagegen.py core    src/tskcore.d: the core's constants for the stage modules (needs tsk.map)

The data area holds a slot per hook (HK.<name>: a stage routine the core calls) and per core routine a stage
module calls (CV.<name>). The core's stub for a hook is `<name> jmp [HK.<name>,u]`; a module's stub for a core
routine is `<name> jmp [CV.<name>,u]` (U is the data area everywhere in tsk). StgLoad fills HK from the module's
hook table (offsets, 0 = none: those point at NoHook) and CvInit fills CV at start-up from CoreTab.
"""
import re, sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / 'src'
F256 = SRC.parent
MODULES = {'ms': ['dillon.a'], 'gt': ['ghost.a'], 'cd': ['ride.a', 'jack.a'], 'th': ['train.a', 'sting.a'], 'mi': ['mission.a', 'toro.a']}   # a stage module's files
BRANCH = re.compile(r'^l?b(sr|ra|eq|ne|cc|cs|hs|lo|hi|ls|ge|gt|le|lt|pl|mi|vc|vs)$|^jsr$|^jmp$')
SKIP = {'equ', 'set', 'rmb', 'macro', 'endm'}
CARRYSET = {'BotGila', 'BotJack', 'BotShell', 'BotTrain', 'BotMission'}         # hooks whose "nothing to do" is carry set (NoHookC)


def core_files():
    out = []
    for l in open(SRC / 'tsk.asm'):
        m = re.match(r'\s+use\s+(\S+\.a)\b', l)
        if m and m.group(1) not in ('data.a', 'tskhook.a'):
            out.append(m.group(1))
    return out


def parse(f):
    """(definitions {lower: (name, kind)}, references [(lower name, op)]) of one source file."""
    defs, refs = {}, []
    for l in open(SRC / f):
        if l.startswith('*') or not l.strip():
            continue
        if not l[0].isspace():
            p = l.split(None, 3)
            name, rest = p[0], p[1:]
            defs[name.lower()] = (name, rest[0].lower() if rest else '')
        else:
            rest = l.split(None, 2)
        if len(rest) < 2:
            continue
        op, arg = rest[0].lower(), rest[1]
        if op in ('fcc', 'fcs'):
            continue
        for t in re.findall(r"(?<!')[A-Za-z_][\w.]*", arg):
            refs.append((t.lower(), op))
    return defs, refs


def analyse():
    core = core_files()
    stage_files = [f for fs in MODULES.values() for f in fs]
    for f in stage_files:
        if f in core:
            sys.exit(f'stagegen: {f} is still in tsk.asm')
    P = {f: parse(f) for f in core + stage_files + ['data.a']}
    owner = {}
    for f, (d, _) in P.items():
        for k in d:
            owner.setdefault(k, f)
    modof = {f: m for m, fs in MODULES.items() for f in fs}
    hooks, cvs, consts, problems = {}, {}, {}, []
    for f, (d, refs) in P.items():
        for t, op in refs:
            o = owner.get(t)
            if not o or o == f or o == 'data.a':
                continue
            name, kind = P[o][0][t]
            if kind in SKIP and kind != 'rmb':
                if f in modof and o not in modof:
                    consts[name] = o                       # a core constant a module uses
                elif f not in modof and o in modof:
                    problems.append(f'{f}: the constant {name} lives in {o} (a stage module)')
                elif f in modof and o in modof and modof[f] != modof[o]:
                    problems.append(f'{f}: the constant {name} lives in {o} (another stage module)')
                continue
            if kind == 'rmb':
                continue
            if f in modof and o in modof:
                if modof[f] != modof[o]:
                    problems.append(f'{f}: {name} is in {o}, another stage module')
                continue
            if f in modof:                                 # a module calls the core
                if not BRANCH.match(op):
                    problems.append(f'{f}: {op} {name} - a core address, not a call (no stub for it)')
                cvs.setdefault(name, set()).add(modof[f])
            elif o in modof:                               # the core calls a module
                if not BRANCH.match(op) and op != 'fdb':       # (a state table's entry: the stub's address)
                    problems.append(f'{f}: {op} {name} - a stage module address, not a call')
                hooks[name] = modof[o]
    return core, P, hooks, cvs, consts, problems


def gen_vec():
    core, P, hooks, cvs, consts, problems = analyse()
    if problems:
        sys.exit('stagegen:\n  ' + '\n  '.join(sorted(set(problems))))
    H, V = sorted(hooks, key=str.lower), sorted(cvs, key=str.lower)
    w = ['* tskvec.d - generated by tools/stagegen.py: the stage modules\' slots in the data area (data.a)',
         '* HK.<x>: the stage routine x (the current module\'s, or NoHook); CV.<x>: the core routine x',
         'hkslots              equ       .']
    w += [f'HK.{h:<17}rmb       2' for h in H]
    w += [f'NHk                 equ       {len(H)}', 'cvslots             equ       .']
    w += [f'CV.{c:<17}rmb       2' for c in V]
    w += [f'NCv                 equ       {len(V)}']
    (SRC / 'tskvec.d').write_text('\n'.join(w) + '\n')
    w = ['* tskhook.a - generated by tools/stagegen.py: the core\'s side of the stage modules',
         '* the hooks: a stage module\'s routines, through HK (stgmod.a StgLoad)']
    w += [f'{h:<20}jmp       [HK.{h},u]' for h in H]
    w += ['', '* HkDef - each hook\'s default with no module\'s routine: 0 NoHook (carry clear), 1 NoHookC (carry set)',
          'HkDef']
    w += [f'                    fcb       {1 if h in CARRYSET else 0}          {h}' for h in H]
    w += ['', '* CoreTab - the core routines the stage modules call, as offsets (stgmod.a CvInit)', 'CoreTab']
    w += [f'                    fdb       {c}-CoreTab' for c in V]
    (SRC / 'tskhook.a').write_text('\n'.join(w) + '\n')
    for m, fs in MODULES.items():
        mine = {k for f in fs for k in P[f][0]}
        w = [f'* tskhk_{m}.d - generated by tools/stagegen.py: tsk{m}\'s hook table (offsets; 0 = none) and its',
             '* stubs for the core routines it calls', 'HookTab']
        w += [f'                    fdb       {h}-HookTab' if h.lower() in mine else f'                    fdb       0          {h}'
              for h in H]
        w += ['']
        w += [f'{c:<20}jmp       [CV.{c},u]' for c in V if m in cvs[c]]
        (SRC / f'tskhk_{m}.a').write_text('\n'.join(w) + '\n')
    print(f'stagegen: {len(H)} hooks, {len(V)} core routines for the stage modules')


def gen_core():
    core, P, _, _, _, _ = analyse()
    consts = {d[0]: f for f in core for d in P[f][0].values() if d[1] in ('equ', 'set')}   # all of them (data.a's too)
    sym = {}
    for l in open(F256 / 'tsk.map'):
        m = re.match(r'Symbol: (\S+) \(\S+\) = ([0-9A-F]+)', l)
        if m:
            sym[m.group(1).lower()] = int(m.group(2), 16)
    w = ['* tskcore.d - generated by tools/stagegen.py from tsk.map: the core\'s constants, for the stage modules']
    for c in sorted(consts, key=str.lower):
        w.append(f'{c:<20}equ       ${sym[c.lower()]:04X}')
    (SRC / 'tskcore.d').write_text('\n'.join(w) + '\n')
    print(f'stagegen: {len(consts)} core constants')


if __name__ == '__main__':
    {'vec': gen_vec, 'core': gen_core}[sys.argv[1]]()
