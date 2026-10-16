#!/usr/bin/env python3
"""bankchk.py ARGS PASSES - run tsk on the host 6809 and check every frame BuildChar draws: it must be shared or the
loaded stage's. A frame from another stage's bank points at cells that aren't loaded: noise on the K2 (MAME clears
memory, so it hides it). 2026-10-16: High Noon's rattlers, the RT group not in HN's bank.

    python3 tools/bankchk.py nbg 6000
"""
import importlib.util,sys,collections,bisect,re
args,passes=sys.argv[1],sys.argv[2]
sys.argv=['hostrun.py','--args',args,'--passes',passes,'--watch','']
spec=importlib.util.spec_from_file_location('hr','tools/hostrun.py'); hr=importlib.util.module_from_spec(spec); spec.loader.exec_module(hr)
D={}
for l in open('src/tskassets.d'):
    m=re.match(r'^(\S+)\s+equ\s+(\$?[0-9A-Fa-f]+)',l)
    if m: v=m.group(2); D[m.group(1)]=int(v[1:],16) if v.startswith('$') else int(v)
src=open('tools/export.py').read()
banks=eval(re.search(r"banks = (\{[^}]*\})",src).group(1))
groups=sorted((v,k[:-6]) for k,v in D.items() if k.endswith('.First'))
starts=[g[0] for g in groups]
def bankof(f):
    i=bisect.bisect_right(starts,f)-1; p=groups[i][1]
    if p=='RT': return p,{'gt','cd','th','mi','hn'}
    return p,({banks[p]} if p in banks else None)
KEY=['bh','ms','gt','cd','th','mi','hn','en']
BC=None
for l in open('tsk.map'):
    if l.startswith('Symbol: BuildChar '): BC=int(l.split('=')[1],16)+hr.MODBASE
bad=collections.Counter(); first={}
os_=hr.Host.step
def step(self):
    if self.pc==BC:
        f=(self.a<<8)|self.b; p,b=bankof(f)
        st=KEY[self.mem[self.sym['stgn']]] if 'stgn' in self.sym else '?'
        if b is not None and st not in b:
            bad[(f,p)]+=1; first.setdefault((f,p),(self.npass,st))
    os_(self)
hr.Host.step=step
try: hr.main()
except BaseException as e: print('EXC',e)
print('bankchk:', 'clean' if not bad else {k:(v,first[k]) for k,v in bad.items()})
