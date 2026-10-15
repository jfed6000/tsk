#!/usr/bin/env python3
"""midi2tsk.py - game/music/*.mid -> f256/assets/mus_<name>.bin for the 6809 sequencer (src/snd.a), and the
generated equates f256/src/tskmusic.d.

Any standard MIDI file works (type 0 or 1, any tempo map); a "loop" marker (meta FF 06) sets where a song
loops back to, an "end" marker where it ends (else the last event). Without a loop marker the song plays once.

The format, one song a file, at most 8K (one block):
    2 bytes   where to go on at the end: the offset (from the start of the file) of the record after the
              loop point, whose wait counts from the loop point ($FFFF = play once)
    records   wait (frames since the last record, 0-254), length n (1-254), n bytes of MIDI
              wait 255, n 0: wait 255 frames more
              wait w, n $FF: the end, w frames after the last record; loop or stop
Every record's bytes go out in one frame. Note-offs on the drum channel (9) are dropped: GM drums ignore them. Running status is used inside a record (its first event always has
its status byte), and note-offs become note-ons at velocity 0 so that it runs on. The loop record is an empty
one (n 0) at the loop point, so the record after it counts its wait from there.

    python3 f256/tools/midi2tsk.py
"""
import struct, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MUSIC = ROOT / 'game' / 'music'
ASSETS = ROOT / 'f256' / 'assets'
SRC = ROOT / 'f256' / 'src'
FPS = 60
ORDER = ['title', 'boothill', 'clear', 'over', 'boogie']     # the song numbers (MU.*); others follow alphabetically


def read_vlq(d, i):
    v = 0
    while True:
        b = d[i]
        i += 1
        v = (v << 7) | (b & 0x7F)
        if not b & 0x80:
            return v, i


def parse(path):
    """-> ([(tick, bytes)], [(tick, tempo)], {'loop': tick, 'end': tick}, ticks a beat)"""
    d = path.read_bytes()
    assert d[:4] == b'MThd'
    _, fmt, ntrk, tpb = struct.unpack('>IHHH', d[4:14])
    i, events, tempos, marks = 14, [], [], {}
    for _ in range(ntrk):
        assert d[i:i + 4] == b'MTrk'
        ln = struct.unpack('>I', d[i + 4:i + 8])[0]
        j, end, t, status = i + 8, i + 8 + ln, 0, 0
        while j < end:
            dt, j = read_vlq(d, j)
            t += dt
            b = d[j]
            if b == 0xFF:
                typ = d[j + 1]
                ml, k = read_vlq(d, j + 2)
                body = d[k:k + ml]
                if typ == 0x51:
                    tempos.append((t, int.from_bytes(body, 'big')))
                elif typ == 0x06 and body.lower() in (b'loop', b'end'):
                    marks[body.lower().decode()] = t
                j = k + ml
                continue
            if b in (0xF0, 0xF7):
                ml, k = read_vlq(d, j + 1)
                j = k + ml
                continue
            if b & 0x80:
                status = b
                j += 1
            hi = status & 0xF0
            n = 1 if hi in (0xC0, 0xD0) else 2
            data = d[j:j + n]
            j += n
            if (status & 0x0F) == 9 and (hi == 0x80 or (hi == 0x90 and data[1] == 0)):
                continue                           # GM drums ignore note-offs: they cost bytes and nothing else
            if hi == 0x80:                         # note-off -> note-on, velocity 0
                status2 = 0x90 | (status & 0x0F)
                data = bytes([data[0], 0])
                events.append((t, bytes([status2]) + data))
            else:
                events.append((t, bytes([status]) + data))
        i = end
    tempos.sort(key=lambda x: x[0])
    if not tempos or tempos[0][0] > 0:
        tempos.insert(0, (0, 500000))              # 120 bpm until the file says otherwise
    return events, tempos, marks, tpb


def to_frames(tick, tempos, tpb):
    secs, last_t, last_tempo = 0.0, 0, 500000
    for t, tempo in tempos:
        if t >= tick:
            break
        secs += (t - last_t) * last_tempo / tpb / 1e6
        last_t, last_tempo = t, tempo
    secs += (tick - last_t) * last_tempo / tpb / 1e6
    return int(round(secs * FPS))


def convert(path):
    events, tempos, marks, tpb = parse(path)
    fr = {}
    for t, b in events:
        f = to_frames(t, tempos, tpb)
        fr.setdefault(f, []).append(b)
    loop = to_frames(marks['loop'], tempos, tpb) if 'loop' in marks else None
    end = to_frames(marks['end'], tempos, tpb) if 'end' in marks else max(fr) + 1
    if loop is not None:
        fr.setdefault(loop, [])
    out, last, loop_ofs = bytearray(b'\xff\xff'), 0, 0xFFFF

    def wait(gap):
        while gap > 254:
            out.extend(b'\xff\x00')
            gap -= 255
        return gap
    for f in sorted(k for k in fr if k < end):
        if f == loop:                              # the loop point: an empty record of its own
            out.append(wait(f - last))
            out.append(0)
            loop_ofs = len(out)
            last = f
            if not fr[f]:
                continue
        msg, status = bytearray(), None
        for b in fr[f]:
            if b[0] == status:
                msg.extend(b[1:])
            else:
                msg.extend(b)
                status = b[0]
        while msg:                                 # a record holds up to 254 bytes
            chunk, msg = msg[:254], msg[254:]
            out.append(wait(f - last))
            out.append(len(chunk))
            out.extend(chunk)
            last = f
    out.append(wait(end - last))
    out.append(0xFF)
    if loop is not None:                           # just past the empty loop record: the next record's wait
        out[0:2] = struct.pack('>H', loop_ofs)        # counts from the loop point
    if len(out) > 8192:
        sys.exit(f'{path.name}: {len(out)} bytes, more than a block')
    return bytes(out), loop, end


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    mids = sorted(MUSIC.glob('*.mid'))
    names = [n for n in ORDER if (MUSIC / f'{n}.mid').exists()] + sorted(p.stem for p in mids if p.stem not in ORDER)
    L = ['* tskmusic.d: GENERATED by f256/tools/midi2tsk.py from game/music/*.mid. Do not edit.',
         '* MU.<song> = the song number (assets/mus_<song>.bin is loaded into music block MU.<song>)', '']
    for k, nm in enumerate(names):
        data, loop, end = convert(MUSIC / f'{nm}.mid')
        # the music window keeps the top block of the 64K, whose last 768 bytes are the system's (snd.a MusMap)
        if len(data) > 0x1D00:
            sys.exit(f'midi2tsk: {nm} is {len(data)} bytes; a song must fit in 7,424 (the top block, snd.a MusMap)')
        (ASSETS / f'mus_{nm}.bin').write_bytes(data)
        L.append(f'MU.{nm:<10} equ       {k}')
        print(f'{nm:9} {len(data):5} bytes  {end / FPS:5.1f} s  ' + (f'loops from {loop / FPS:.1f} s' if loop is not None else 'once'))
    L += ['', f'MU.N       equ       {len(names)}', '']
    (SRC / 'tskmusic.d').write_text('\n'.join(L))


if __name__ == '__main__':
    main()
