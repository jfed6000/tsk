#!/usr/bin/env python3
"""compose.py - Texas Shitkickers' music, written as code, out as standard MIDI files.

    python3 f256/tools/compose.py          # writes game/music/*.mid

General MIDI throughout: the F256's SAM2695 is a GM synth, and so is the soundfont the previews are rendered
with (tools/render.py). Any of these .mid files can be replaced by one from a DAW: midi2tsk.py converts
whatever is in game/music/.

Channels (0-based): 0 lead guitar, 1 rhythm guitar, 2 bass, 3 harmonica / whistle, 4 piano, 9 drums.
Channels 13-15 are left free for the sound effects (snd.a), and the drum channel is shared with them.

Songs:
    title     "Shitkicker Shuffle": a fast, dirty Texas boogie in E for the title screen (loops)
    boogie    "Graveyard Boogie": a candidate: Bo Diddley toms into a one-chord E boogie with a slide (after
              Thorogood and ZZ Top, the user's steer) (loops)
    boothill  "Boot Hill": a slow minor blues at midnight, tremolo guitar and a lonely whistle (loops)
    clear     a stage-clear tag (once)
    over      game over: a dying blues turnaround (once)
"""
import os
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'game' / 'music'
TPB = 480                                       # ticks a beat

# General MIDI programs, 0-based
OVERDRIVE, DISTORTION, CLEAN_GTR, MUTED_GTR, ACOUSTIC_BASS, SLAP_BASS, FINGER_BASS = 29, 30, 27, 28, 32, 36, 33
HARMONICA, HONKYTONK, WHISTLE, CONTRABASS, TREMOLO_STR, STEEL_GTR, TIMPANI = 22, 3, 78, 43, 44, 25, 47
# GM drum notes (channel 9)
KICK, KICK2, SNARE, RIM, CLAP, HAT_C, HAT_O, HAT_P, CRASH, RIDE, TOM_LO, TOM_MID, TOM_HI, TAMB = \
    36, 35, 38, 37, 39, 42, 46, 44, 49, 51, 45, 47, 50, 54
FLOOR_TOM, CRASH2, SPLASH = 41, 57, 55

NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7,
        'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n(name):
    """'E2' -> 40 (MIDI note; C4 = 60)"""
    p, o = (name[:-1], name[-1]) if name[-2] != '-' else (name[:-2], name[-2:])
    return NOTE[p] + (int(o) + 1) * 12


class Song:
    """Events in ticks; swing applied to off-beat eighths."""

    def __init__(self, bpm, swing=0.0):
        self.bpm, self.swing, self.ev, self.loop = bpm, swing, [], 0

    def t(self, beat):
        """A beat position (float) -> ticks, with the off-beat eighth pushed late by the swing"""
        whole, frac = divmod(beat, 1.0)
        if abs(frac - 0.5) < 1e-6 and self.swing:
            frac = 0.5 + self.swing * (1 / 6)          # swing 1.0 = triplet feel (2/3 : 1/3)
        return max(0, int(round((whole + frac) * TPB)))     # (a bend just before beat 0 lands on 0)

    def note(self, ch, beat, pitch, length, vel=96):
        if isinstance(pitch, str):
            pitch = n(pitch)
        on, off = self.t(beat), self.t(beat + length) - 8
        self.ev.append((on, 1, bytes([0x90 | ch, pitch, vel])))
        self.ev.append((max(on + 1, off), 0, bytes([0x80 | ch, pitch, 0])))

    def chord(self, ch, beat, pitches, length, vel=96):
        for p in pitches:
            self.note(ch, beat, p, length, vel)

    def prog(self, ch, program, beat=0, vol=100, pan=64):
        tk = self.t(beat)
        self.ev.append((tk, 2, bytes([0xC0 | ch, program])))
        self.ev.append((tk, 2, bytes([0xB0 | ch, 7, vol])))
        self.ev.append((tk, 2, bytes([0xB0 | ch, 10, pan])))

    def cc(self, ch, beat, ctl, val):
        self.ev.append((self.t(beat), 2, bytes([0xB0 | ch, ctl, val])))

    def bend_range(self, ch, semis, beat=0):
        """RPN 0: the pitch-bend range, so a bend can slide a whole interval"""
        for ctl, val in ((101, 0), (100, 0), (6, semis), (38, 0), (101, 127), (100, 127)):
            self.cc(ch, beat, ctl, val)

    def bend(self, ch, beat, value):
        """value -1.0 .. 1.0 of the bend range"""
        v = max(0, min(16383, int(8192 + value * 8191)))
        self.ev.append((self.t(beat), 2, bytes([0xE0 | ch, v & 0x7F, v >> 7])))

    def slide(self, ch, beat, frm, to, length, vel, span=12, steps=4, slide_len=0.25):
        """A bottleneck slide: the note sounds at frm and bends to to over slide_len beats (span = the bend range)"""
        f, t_ = (n(frm) if isinstance(frm, str) else frm), (n(to) if isinstance(to, str) else to)
        self.bend(ch, beat - 0.01, 0)
        self.note(ch, beat, f, length, vel)
        for k in range(1, steps + 1):
            self.bend(ch, beat + slide_len * k / steps, (t_ - f) * k / steps / span)
        self.bend(ch, beat + length, 0)

    def drum(self, beat, note, vel=100):
        self.note(9, beat, note, 0.25, vel)

    def save(self, path, loop_beat=None, end_beat=None):
        """Type 0 SMF. The loop point is a marker meta event "loop" (midi2tsk reads it); the end is a
        marker "end" so the loop length is exact."""
        ev = sorted(self.ev, key=lambda e: (e[0], e[1]))
        tempo = int(60_000_000 / self.bpm)
        trk = bytearray()
        trk += b'\x00\xff\x51\x03' + tempo.to_bytes(3, 'big')
        metas = []
        if loop_beat is not None:
            metas.append((self.t(loop_beat), b'\xff\x06\x04loop'))
        if end_beat is not None:
            metas.append((self.t(end_beat), b'\xff\x06\x03end'))
        allev = [(t, 5, b) for t, _, b in ev] + [(t, 0 if b[3:7] == b'loop' else 9, b) for t, b in metas]
        allev.sort(key=lambda e: (e[0], e[1]))
        last = 0
        for t, _, b in allev:
            trk += vlq(t - last) + b
            last = t
        trk += b'\x00\xff\x2f\x00'
        data = b'MThd' + struct.pack('>IHHH', 6, 0, 1, TPB) + b'MTrk' + struct.pack('>I', len(trk)) + trk
        path.write_bytes(data)
        return len(ev)


def vlq(v):
    out = [v & 0x7F]
    v >>= 7
    while v:
        out.append(0x80 | (v & 0x7F))
        v >>= 7
    return bytes(reversed(out))


# ---------------------------------------------------------------------------------------------- the title
def title():
    """Shitkicker Shuffle (the title theme): E boogie, 168 bpm, hard swing. Intro hits, then the 12-bar twice: the riff,
    then the harmonica wails over it. Loops to the 12-bar."""
    s = Song(168, swing=1.0)
    s.prog(0, OVERDRIVE, vol=92, pan=40)          # the boogie riff
    s.prog(1, DISTORTION, vol=70, pan=88)         # stabs and the intro hits
    s.prog(2, ACOUSTIC_BASS, vol=110)             # upright, slapped
    s.prog(3, HARMONICA, vol=100, pan=70)
    s.prog(4, HONKYTONK, vol=72, pan=96)
    s.cc(9, 0, 7, 110)

    # intro: two bars of stop-time hits on E7, a snare roll into the riff
    for b in (0, 1.5, 3):
        s.chord(1, b, ['E2', 'B2', 'E3', 'G#3', 'D4'], 0.4, 120)
        s.drum(b, CRASH, 110)
        s.drum(b, KICK, 120)
        s.note(2, b, 'E1', 0.4, 120)
    for i in range(8):                            # bar 2: snare roll, getting louder
        s.drum(4 + i * 0.5, SNARE, 60 + i * 8)
    s.drum(7.5, TOM_HI, 110)
    s.drum(7.75, TOM_LO, 115)

    def boogie(bar0, root, n_bars, vel=104):
        """The left-hand boogie on guitar: root+5th, root+6th, root+b7th, root+6th, two to a beat"""
        r = n(root)
        shape = [7, 7, 9, 9, 10, 10, 9, 9]
        for k in range(n_bars):
            base = (bar0 + k) * 4
            for i, iv in enumerate(shape):
                s.chord(0, base + i * 0.5, [r, r + iv], 0.42, vel - (8 if i % 2 else 0))

    def walk(bar0, root, n_bars):
        """Slapped walking bass: 1 3 5 6 / b7 6 5 3"""
        r = n(root)
        steps = [0, 4, 7, 9, 10, 9, 7, 4]
        for k in range(n_bars):
            for i in range(4):
                p = r + steps[(k % 2) * 4 + i]
                s.note(2, (bar0 + k) * 4 + i, p, 0.8, 112 if i % 2 == 0 else 100)
                s.note(2, (bar0 + k) * 4 + i + 0.5, p + 12, 0.15, 48)     # the slap on the off-beat

    def shuffle_drums(bar0, n_bars, ride=False, fill_last=True):
        for k in range(n_bars):
            base = (bar0 + k) * 4
            for i in range(8):
                s.drum(base + i * 0.5, RIDE if ride else HAT_C, 86 if i % 2 == 0 else 64)
            s.drum(base, KICK, 118)
            s.drum(base + 2, KICK, 108)
            s.drum(base + 2.5, KICK, 80)
            s.drum(base + 1, SNARE, 112)
            s.drum(base + 3, SNARE, 116)
        if fill_last:                             # the turnaround fill: snare triplet into the toms
            base = (bar0 + n_bars - 1) * 4 + 2
            for i, (b, d) in enumerate([(0, SNARE), (1 / 3, SNARE), (2 / 3, SNARE), (1, TOM_HI), (4 / 3, TOM_MID), (5 / 3, TOM_LO)]):
                s.drum(base + b, d, 96 + i * 4)

    def twelve(bar0, solo):
        changes = [('E2', 4), ('A2', 2), ('E2', 2), ('B2', 1), ('A2', 1), ('E2', 1), ('B2', 1)]
        bar = bar0
        for root, nb in changes:
            boogie(bar, root, nb)
            walk(bar, root, nb)
            bar += nb
        shuffle_drums(bar0, 12, ride=solo)
        s.drum(bar0 * 4, CRASH, 112)
        if solo:
            s.drum((bar0 + 4) * 4, CRASH, 100)
            s.drum((bar0 + 8) * 4, CRASH, 100)
        # honky-tonk piano: off-beat chord stabs, the top end of the band
        bar = bar0
        for root, nb in changes:
            r = n(root) + 24
            for k in range(nb):
                for beat in (0.5, 1.5, 2.5, 3.5):
                    s.chord(4, (bar + k) * 4 + beat, [r + 4, r + 7, r + 10], 0.2, 70)
            bar += nb

    twelve(2, solo=False)
    # the stop-time break in bars 13-14 of the first chorus is left to the riff; the harmonica comes in on 14
    twelve(14, solo=True)
    lick = [  # the harmonica: (beat from bar 14, note, length, velocity) - E blues: E G A Bb B D
        (0, 'B4', 1.5, 110), (1.5, 'D5', 0.5, 100), (2, 'E5', 2, 115),
        (4, 'G5', 0.5, 100), (4.5, 'E5', 0.5, 95), (5, 'D5', 0.5, 95), (5.5, 'B4', 0.5, 95), (6, 'A4', 0.5, 100),
        (6.5, 'G4', 0.5, 95), (7, 'E4', 1, 105),
        (8, 'E4', 0.5, 90), (8.5, 'G4', 0.5, 95), (9, 'A4', 0.5, 100), (9.5, 'Bb4', 0.5, 105), (10, 'B4', 2, 115),
        (12, 'D5', 0.5, 100), (12.5, 'B4', 0.5, 95), (13, 'A4', 1, 100), (14, 'G4', 0.5, 95), (14.5, 'E4', 1.5, 100),
        # over the A
        (16, 'E5', 1, 115), (17, 'C#5', 0.5, 100), (17.5, 'A4', 0.5, 95), (18, 'E5', 1, 112), (19, 'G5', 1, 118),
        (20, 'A5', 2, 120), (22, 'G5', 0.5, 105), (22.5, 'E5', 1.5, 110),
        # back to E: the wail
        (24, 'B4', 0.5, 100), (24.5, 'D5', 0.5, 105), (25, 'E5', 0.5, 110), (25.5, 'G5', 0.5, 115),
        (26, 'A5', 0.5, 118), (26.5, 'Bb5', 0.5, 118), (27, 'B5', 3, 124),
        (30, 'A5', 0.5, 100), (30.5, 'G5', 0.5, 100), (31, 'E5', 1, 105),
        # the turnaround: B, A, E, B
        (32, 'F#5', 1, 110), (33, 'D#5', 1, 105), (34, 'B4', 2, 110),
        (36, 'A4', 0.5, 100), (36.5, 'C#5', 0.5, 105), (37, 'E5', 1, 110), (38, 'C#5', 1, 100),
        (40, 'B4', 0.5, 100), (40.5, 'G4', 0.5, 95), (41, 'E4', 2.5, 110),
        (44, 'D#4', 1, 100), (45, 'F#4', 1, 105), (46, 'B4', 2, 115),
    ]
    for b, p, length, v in lick:
        s.note(3, 14 * 4 + b, p, length * 0.92, v)
    return s, 2 * 4, 26 * 4                       # loop from bar 2 (after the intro), end after bar 25


# ---------------------------------------------------------------------------------------------- the title
def boogie():
    """Graveyard Boogie (a candidate title theme): the title theme, after the user's "George Thorogood ... Who Do You Love, One Bourbon One
    Scotch One Beer ... a little ZZ Top and blues". An original in that style: a Bo Diddley beat on the toms to
    open, then a crunchy one-chord boogie in E with a bottleneck slide over it, a break up to A, and back.
    150 bpm, straight eighths with a push."""
    s = Song(150, swing=0.35)
    s.prog(0, OVERDRIVE, vol=100, pan=44)          # the slide
    s.prog(1, DISTORTION, vol=84, pan=84)          # the boogie chug
    s.prog(2, FINGER_BASS, vol=112)
    s.cc(9, 0, 7, 112)
    s.bend_range(0, 12)

    bd = [0, 0.75, 1.5, 2.5, 3]                    # the Bo Diddley beat: shave-and-a-haircut, over a bar

    # intro, 4 bars: the toms and maracas carry the beat; the slide answers it
    for bar in range(4):
        base = bar * 4
        for i, b in enumerate(bd):
            s.drum(base + b, TOM_LO if i % 2 == 0 else TOM_MID, 112 if i == 0 else 96)
        for i in range(8):
            s.drum(base + i * 0.5, 70, 80 if i % 2 == 0 else 56)          # maracas
        s.drum(base, KICK, 110)
        if bar % 2 == 0:
            s.slide(0, base, 'D3', 'E3', 1.2, 118)
            s.chord(1, base + 0.75, ['E2', 'B2', 'E3'], 0.4, 100)
            s.chord(1, base + 1.5, ['E2', 'B2', 'E3'], 0.4, 104)
        else:
            s.slide(0, base + 1.5, 'A3', 'B3', 0.8, 112)
            s.note(0, base + 2.5, 'G3', 0.4, 104)
            s.note(0, base + 3, 'E3', 0.9, 110)
    s.drum(15, SNARE, 100); s.drum(15.5, SNARE, 110)

    def chug(bar0, root, n_bars, accents=True):
        """The one-chord boogie: palm-muted root and fifth on the eighths, the open octave pushed on the and of 2"""
        r = n(root)
        for k in range(n_bars):
            base = (bar0 + k) * 4
            for i in range(8):
                hit = [r, r + 7] if i not in (3,) else [r + 12, r + 7]
                s.chord(1, base + i * 0.5, hit, 0.32, (110 if i % 2 == 0 else 86) if accents else 80)
            s.note(2, base, r - 12, 0.9, 116)
            s.note(2, base + 1, r - 12, 0.4, 100)
            s.note(2, base + 1.5, r - 9, 0.4, 96)     # the walk up: root, b3, 3
            s.note(2, base + 2, r - 8, 0.9, 108)
            s.note(2, base + 3, r - 12, 0.9, 104)

    def beat(bar0, n_bars, crash=True):
        for k in range(n_bars):
            base = (bar0 + k) * 4
            for i in range(8):
                s.drum(base + i * 0.5, HAT_C if i % 2 else HAT_O if i == 7 else HAT_C, 90 if i % 2 == 0 else 70)
            s.drum(base, KICK, 120); s.drum(base + 1.5, KICK, 96); s.drum(base + 2, KICK, 116)
            s.drum(base + 1, SNARE, 118); s.drum(base + 3, SNARE, 122)
        if crash:
            s.drum(bar0 * 4, CRASH, 116)

    # A: 8 bars of E, the slide talking over it
    chug(4, 'E2', 8)
    beat(4, 8)
    licks = [  # (beat from bar 4, from, to, length, velocity): slides; plain notes have from == to
        (0, 'B3', 'D4', 1, 118), (1.5, 'E4', 'E4', 0.5, 110), (2, 'D4', 'E4', 1.5, 120),
        (8, 'G4', 'A4', 0.75, 116), (9, 'G4', 'G4', 0.5, 108), (9.5, 'E4', 'E4', 0.5, 104), (10, 'D4', 'E4', 2, 120),
        (16, 'B3', 'D4', 1, 118), (17.5, 'E4', 'E4', 0.5, 110), (18, 'G4', 'G4', 0.5, 112), (18.5, 'A4', 'B4', 1.5, 124),
        (24, 'E4', 'E4', 0.5, 108), (24.5, 'D4', 'D4', 0.5, 104), (25, 'B3', 'B3', 0.5, 100), (25.5, 'A3', 'B3', 0.5, 104),
        (26, 'G3', 'G3', 0.5, 100), (26.5, 'E3', 'E3', 1.5, 116),
    ]
    for b, f, t_, ln, v in licks:
        if f == t_:
            s.note(0, 16 + b, f, ln * 0.9, v)
        else:
            s.slide(0, 16 + b, f, t_, ln, v)
    # B: the break - up to A for 4, back to E, the B7 turnaround
    chug(12, 'A2', 2)
    chug(14, 'E2', 2)
    chug(16, 'B2', 1)
    chug(17, 'A2', 1)
    chug(18, 'E2', 2)
    beat(12, 8, crash=True)
    s.drum(64, CRASH, 110); s.drum(72, CRASH, 116)
    for b, f, t_, ln, v in [(0, 'A4', 'A4', 0.5, 110), (0.5, 'C5', 'C#5', 1.5, 122), (2, 'A4', 'A4', 1, 110),
                            (4, 'E5', 'E5', 0.5, 116), (4.5, 'D5', 'E5', 3, 124),
                            (8, 'B4', 'B4', 0.5, 108), (8.5, 'G4', 'A4', 1.5, 116), (10, 'E4', 'E4', 2, 110),
                            (16, 'D#4', 'F#4', 2, 120), (20, 'C#4', 'E4', 2, 118),
                            (24, 'B3', 'B3', 0.5, 104), (24.5, 'D4', 'E4', 3.5, 124)]:
        if f == t_:
            s.note(0, 48 + b, f, ln * 0.9, v)
        else:
            s.slide(0, 48 + b, f, t_, ln, v)
    # breakdown: 4 bars of just the Bo Diddley beat on the toms, the chug answering - then back to A
    for bar in range(20, 24):
        base = bar * 4
        for i, b in enumerate(bd):
            s.drum(base + b, TOM_LO if i % 2 == 0 else TOM_HI, 116 if i == 0 else 100)
            s.chord(1, base + b, ['E2', 'B2'], 0.3, 104)
        s.drum(base, KICK, 116)
        for i in range(8):
            s.drum(base + i * 0.5, 70, 70)
    s.slide(0, 22 * 4 + 2, 'G3', 'B3', 1.5, 120)
    s.drum(95, SNARE, 100); s.drum(95.25, SNARE, 106); s.drum(95.5, SNARE, 112); s.drum(95.75, SNARE, 120)
    return s, 4 * 4, 24 * 4                       # loop from bar 4 (after the intro), end after bar 23


# ---------------------------------------------------------------------------------------------- Boot Hill
def boothill():
    """Boot Hill at midnight: E minor, 76 bpm. Tremolo guitar picking the chords, a whistle that could be the
    wind, a heartbeat on the floor tom. Em - C - Am - B7, twice; the second time the whistle answers."""
    s = Song(76, swing=0.0)
    s.prog(0, CLEAN_GTR, vol=84, pan=40)
    s.prog(1, TREMOLO_STR, vol=60, pan=90)
    s.prog(2, ACOUSTIC_BASS, vol=100)
    s.prog(3, WHISTLE, vol=96, pan=64)
    s.cc(0, 0, 92, 70)                            # a little tremolo depth on the guitar
    s.cc(9, 0, 7, 96)

    chords = [['E3', 'G3', 'B3', 'E4'], ['C3', 'G3', 'C4', 'E4'], ['A2', 'E3', 'A3', 'C4'], ['B2', 'D#3', 'A3', 'B3']]
    roots = ['E2', 'C2', 'A1', 'B1']
    for rep in range(4):
        for k, (ch, rt) in enumerate(zip(chords, roots)):
            bar = rep * 4 + k
            base = bar * 4
            # tremolo picking: the chord tones as fast repeated sixteenths, a note to a beat
            for beat in range(4):
                tone = ch[[0, 1, 2, 3][beat]]
                for i in range(4):
                    s.note(0, base + beat + i * 0.25, tone, 0.22, 70 + (12 if i == 0 else 0))
            s.note(2, base, rt, 1.9, 104)
            s.note(2, base + 2, n(rt) + 7, 1.9, 92)
            if rep >= 1:
                s.chord(1, base, [n(x) + 12 for x in ch[1:]], 3.9, 54)
            s.drum(base, FLOOR_TOM, 92)           # the heartbeat
            s.drum(base + 0.75, FLOOR_TOM, 70)
            s.drum(base + 2, FLOOR_TOM, 88)
            s.drum(base + 2.75, FLOOR_TOM, 64)
            if rep >= 2:
                s.drum(base + 3, RIM, 60)
    whistle = [  # bars 4-7, then again higher in bars 12-15
        (0, 'B4', 3, 96), (3, 'E5', 1, 100), (4, 'G5', 2, 104), (6, 'E5', 2, 96),
        (8, 'C5', 1, 92), (9, 'E5', 1, 96), (10, 'A5', 3, 108), (13, 'G5', 1, 96),
        (14, 'F#5', 1, 96), (15, 'D#5', 1, 92), (16, 'B4', 4, 100),
    ]
    for start, shift in ((4 * 4, 0), (12 * 4, 12)):
        for b, p, length, v in whistle:
            s.note(3, start + b, n(p) + shift if shift else p, length * 0.95, v)
    s.drum(0, CRASH2, 50)
    return s, 0, 16 * 4


# ---------------------------------------------------------------------------------------------- jingles
def clear():
    """The stage won: a shout-out of a tag, E boogie hits up to an E9 that rings"""
    s = Song(168, swing=1.0)
    s.prog(0, OVERDRIVE, vol=96)
    s.prog(2, ACOUSTIC_BASS, vol=110)
    s.prog(3, HARMONICA, vol=100)
    for i, (b, r) in enumerate([(0, 'E2'), (0.5, 'G2'), (1, 'G#2'), (1.5, 'B2'), (2, 'C#3'), (2.5, 'D3'), (3, 'D#3')]):
        s.note(2, b, r, 0.45, 110)
        s.drum(b, SNARE if i % 2 else KICK, 100 + i * 3)
    s.chord(0, 4, ['E2', 'B2', 'E3', 'G#3', 'D4', 'F#4'], 3.5, 124)
    s.note(2, 4, 'E1', 3.5, 120)
    s.note(3, 4, 'E5', 3, 120)
    s.drum(4, CRASH, 124)
    s.drum(4, KICK, 124)
    return s, None, 8


def over():
    """Game over: the band falls apart - a slow descending turnaround, a last low E"""
    s = Song(90, swing=1.0)
    s.prog(0, OVERDRIVE, vol=90)
    s.prog(2, ACOUSTIC_BASS, vol=110)
    s.prog(3, HARMONICA, vol=100)
    for b, top in [(0, 'D4'), (1, 'C#4'), (2, 'C4'), (3, 'B3')]:
        s.chord(0, b, ['E3', top], 0.9, 100)
        s.note(3, b, n(top) + 12, 0.9, 100)
    s.note(2, 0, 'E2', 3.9, 100)
    s.chord(0, 4, ['E2', 'B2', 'E3', 'G3'], 4, 110)
    s.note(2, 4, 'E1', 4, 120)
    s.note(3, 4, 'E4', 4, 96)
    s.drum(4, CRASH, 100)
    s.drum(4, KICK, 110)
    return s, None, 8


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in (('title', title), ('boothill', boothill), ('clear', clear), ('over', over), ('boogie', boogie)):
        song, loop, end = fn()
        k = song.save(OUT / f'{name}.mid', loop, end)
        secs = end * 60 / song.bpm
        print(f'{name:9} {k:5} events  {secs:5.1f} s  {"loops" if loop is not None else "once"}')


if __name__ == '__main__':
    main()
