#!/usr/bin/env python3
"""dlcheck.py - run tsk on the host 6809 (hostrun.py) and check the display list every pass: no entry but the
hero's own (entry 0) may show a hero frame, and no frame may be past the end of the table. A frame number clobbered
on its way to Ent shows up as a stray hero (2026-10-15: skeleton bullets drawn as hero frame 1).

    python3 tools/dlcheck.py ARGS PASSES        e.g. python3 tools/dlcheck.py hb 9000
"""
import importlib.util,sys,collections
args, passes = sys.argv[1], sys.argv[2]
sys.argv=['hostrun.py','--args',args,'--passes',passes,'--watch','']
spec=importlib.util.spec_from_file_location('hr','tools/hostrun.py'); hr=importlib.util.module_from_spec(spec); spec.loader.exec_module(hr)
NFR = int(next(l for l in open("src/tskassets.d") if l.startswith("FRM.N ")).split()[2])
HRN = 2 * int(next(l for l in open("src/tskassets.d") if l.startswith("HR.Mir ")).split()[2])
bad=collections.Counter(); first={}
o0=hr.Host.os9
def os9(self,fn):
    if fn==0x0A:
        m=self.mem; S=self.sym; n=m[S['dln']]; base=S['dl']
        for i in range(n):
            e=base+i*10; ctl=m[e]; frm=m[e+1]<<8|m[e+2]
            if not ctl: continue
            if (i > (1 if m[S['hmount']] else 0) and frm < HRN) or frm >= NFR:   # (in the saddle: the steer's entry 0, his 1)
                k=(i,frm,m[S['phase']],m[S['hst']]); bad[(frm,)]+=1
                first.setdefault(frm,(self.npass,i,m[S['phase']],m[S['stgn']]))
    return o0(self,fn)
hr.Host.os9=os9
try: hr.main()
except BaseException as e: print('EXC',e)
print('dlcheck: ' + ('clean' if not bad else f'BAD frames {dict(bad)}, first seen (pass, entry, phase, stage) {first}'))
sys.exit(1 if bad else 0)
