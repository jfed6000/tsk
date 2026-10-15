#!/usr/bin/env python3
"""midicap.py - the MIDI tsk sends, as a standard MIDI file: run the module on the host 6809 (hostrun.py) and
log every byte written to the SAM2695's FIFO ($FF31) with its frame, or read a log of "frame byte" lines (from
MAME's Lua tap, tools/tskmidi.lua). Then render it (render.py) to hear what the F256 plays.

    python3 f256/tools/midicap.py --args "" --passes 2400 --out /tmp/title_cap.mid
    python3 f256/tools/midicap.py --log mame/midi.log --out /tmp/mame_cap.mid
"""
import argparse, importlib.util, os, struct, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def to_smf(frames, out):
    """frames: [(frame, byte)] -> a type 0 SMF at 60 frames a second (tempo 1 s a beat, 60 ticks a beat)"""
    trk, last, i = bytearray(b'\x00\xff\x51\x03\x0f\x42\x40'), 0, 0
    # regroup the stream into messages (running status as the synth would read it)
    status, msg, msgs = None, [], []
    for f, b in frames:
        if b & 0x80:
            status, msg = b, [b]
        else:
            if not msg and status is not None:
                msg = [status]
            msg.append(b)
        need = 2 if (status or 0) & 0xF0 in (0xC0, 0xD0) else 3
        if msg and len(msg) == need:
            msgs.append((f, bytes(msg)))
            msg = []
    for f, m in msgs:
        dt = f - last
        last = f
        v = [dt & 0x7F]
        dt >>= 7
        while dt:
            v.append(0x80 | (dt & 0x7F))
            dt >>= 7
        trk += bytes(reversed(v)) + m
    trk += b'\x00\xff\x2f\x00'
    open(out, 'wb').write(b'MThd' + struct.pack('>IHHH', 6, 0, 1, 60) + b'MTrk' + struct.pack('>I', len(trk)) + trk)
    return len(msgs)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--args', default='')
    ap.add_argument('--passes', type=int, default=2400)
    ap.add_argument('--log')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    if a.log:
        cap = [tuple(int(x) for x in l.split()) for l in open(a.log) if l.strip()]
    else:
        sys.argv = ['hostrun.py', '--args', a.args or ' ', '--passes', str(a.passes), '--watch', '']
        spec = importlib.util.spec_from_file_location('hr', os.path.join(HERE, 'hostrun.py'))
        hr = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(hr)
        cap = []
        wr0 = hr.Host.wr

        def wr(self, addr, v):
            if addr == 0xFF31:
                cap.append((self.npass, v))
            return wr0(self, addr, v)
        hr.Host.wr = wr
        hr.main()
    n = to_smf(cap, a.out)
    print(f'{len(cap)} bytes, {n} messages -> {a.out}')


if __name__ == '__main__':
    main()
