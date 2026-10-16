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
    deadman   "Dead Man's Hand": Ghost Town and Doc Gila's saloon - a minor-key saloon boogie on a honky-tonk
              piano, a wailing harmonica, the slide from the boogie in the break (loops)
    stampede  "Stampede!": the Cattle Drive and Jackrabbit Jack - a galloping train beat in A, a fiddle up front, the
              harmonica answering, a stop-time breakdown with whip cracks (loops)
    heist     "Iron Horse": the Train Heist and Sting - the train whistle, then a ZZ Top-ish shuffle boogie in D on the
              overdrive over a chugging train beat, the harmonica wailing, a stop-time tunnel, a slide ride-out (loops)
    laststand "Last Stand": the Mission and Bullrush - the mission bell and a lone trumpet's Deguello (no quarter) over
              tremolo strings, then a galloping D minor drive down the Andalusian cadence, the trumpets on top, a
              war-drum break with the call again (loops)
    standoff  "Standoff": High Noon's duel - a pocket watch's chime on a music box, the town clock ticking, tremolo
              strings and a lone whistle, waiting for the draw (loops)
    showdown  "Showdown": the fight with Diamondback - the watch's tune on two trumpets over a galloping E minor drive,
              the overdrive and the bass, timpani, a stop-time break with the clock ticking again (loops)
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
TRUMPET, TUBULAR_BELLS, NYLON_GTR = 56, 14, 24
MUSIC_BOX, WOODBLOCK = 10, 76                   # (76: the GM drum kit's high wood block)
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


# ---------------------------------------------------------------------------------------------- Ghost Town
def deadman():
    """Dead Man's Hand: Ghost Town, and Doc Gila's Last Chance saloon. A minor blues boogie in A, 132 bpm, hard
    swing: the saloon's honky-tonk piano rolling a minor boogie in the left hand and playing the tune in the right,
    upright bass, a rim-shot backbeat on the ride; the harmonica wails the second chorus; the break brings in the
    slide guitar from the Graveyard Boogie over stop-time saloon stomps. (Aces and eights: the hand Wild Bill held.)"""
    s = Song(132, swing=0.6)
    s.prog(4, HONKYTONK, vol=104, pan=56)          # the saloon piano
    s.prog(2, ACOUSTIC_BASS, vol=110)
    s.prog(3, HARMONICA, vol=96, pan=80)
    s.prog(0, OVERDRIVE, vol=92, pan=40)           # the slide, in the break
    s.cc(9, 0, 7, 104)
    s.bend_range(0, 12)

    CH = {'A': 'A2', 'D': 'D3', 'E': 'E2'}         # the minor boogie's roots (left hand)

    def lh(bar, chord):
        """The left hand: a minor boogie - root, 5th, 6th, b7th and back, two to a beat; the bass doubles the root"""
        r = n(CH[chord]); base = bar * 4
        figure = [0, 7, 9, 10, 12, 10, 9, 7] if chord != 'E' else [0, 7, 9, 10, 12, 10, 9, 7]
        for i, iv in enumerate(figure):
            s.note(4, base + i * 0.5, r + iv, 0.4, 92 if i % 2 == 0 else 74)
        s.note(2, base, r - 12, 0.9, 112); s.note(2, base + 2, r - 12 + 7, 0.9, 100)

    def kit(bar, fill=False):
        base = bar * 4
        for i in range(4):
            s.drum(base + i, RIDE, 84); s.drum(base + i + 0.5, RIDE, 60)
        s.drum(base, KICK, 104); s.drum(base + 2, KICK, 96)
        s.drum(base + 1, RIM, 100); s.drum(base + 3, RIM, 104)
        if fill:
            for k, b in enumerate((3, 3.25, 3.5, 3.75)):
                s.drum(base + b, SNARE, 90 + k * 8)

    blues = ['A', 'A', 'A', 'A', 'D', 'D', 'A', 'A', 'E', 'D', 'A', 'E']   # the 12-bar, minor (Am, Dm, E7)

    # intro, 2 bars: the piano alone, a tremolo on the high A, then the boogie starts
    for k in range(6):
        s.note(4, k * 0.25, 'A5' if k % 2 == 0 else 'C6', 0.22, 90)
    s.chord(4, 1.5, ['E4', 'G4', 'C5', 'E5'], 2.4, 100)
    lh(1, 'A')
    s.drum(7, SNARE, 96); s.drum(7.5, SNARE, 110)

    # A: the 12-bar with the piano's tune (bars 2-13)
    tune = [  # (beat within the chorus, note, length)
        (0, 'E5', 0.5), (0.5, 'C5', 0.5), (1, 'A4', 1), (2.5, 'C5', 0.5), (3, 'D5', 0.5), (3.5, 'D#5', 0.5),
        (4, 'E5', 1.5), (6, 'G5', 0.5), (6.5, 'E5', 0.5), (7, 'C5', 1),
        (8, 'A4', 0.5), (8.5, 'C5', 0.5), (9, 'E5', 0.5), (9.5, 'A5', 1.5), (12, 'G5', 1), (13, 'E5', 1), (14, 'C5', 2),
        (16, 'F5', 0.5), (16.5, 'D5', 0.5), (17, 'A4', 1), (18.5, 'F5', 0.5), (19, 'A5', 1),
        (20, 'G#5', 0.5), (20.5, 'F5', 0.5), (21, 'D5', 1), (22, 'B4', 1),
        (24, 'C5', 0.5), (24.5, 'E5', 0.5), (25, 'A5', 2), (27.5, 'G5', 0.5),
        (28, 'E5', 0.5), (28.5, 'C5', 0.5), (29, 'A4', 2),
        (32, 'B4', 0.5), (32.5, 'D5', 0.5), (33, 'E5', 0.5), (33.5, 'G#5', 1.5),
        (36, 'A5', 0.5), (36.5, 'F5', 0.5), (37, 'D5', 1), (38, 'F5', 1),
        (40, 'E5', 0.5), (40.5, 'C5', 0.5), (41, 'A4', 1), (42, 'C5', 0.5), (42.5, 'A4', 1.5),
        (44, 'G#4', 0.5), (44.5, 'B4', 0.5), (45, 'D5', 0.5), (45.5, 'E5', 2.5),
    ]
    for b, nt, ln in tune:
        s.note(4, 8 + b, nt, ln * 0.92, 104)
        s.note(4, 8 + b, n(nt) - 12, ln * 0.92, 70)            # doubled an octave down, quieter
    for k, c in enumerate(blues):
        lh(2 + k, c); kit(2 + k, fill=(k == 11))

    # B: the second chorus - the harmonica wails it, the piano comps (bars 14-25)
    harp = [
        (0, 'A4', 'C5', 1.5), (2, 'A4', 'A4', 0.5), (2.5, 'G4', 'G4', 0.5), (3, 'E4', 'E4', 1),
        (4, 'C5', 'C5', 0.5), (4.5, 'D5', 'D5', 0.5), (5, 'E5', 'E5', 3),
        (8, 'G5', 'G5', 0.5), (8.5, 'E5', 'E5', 0.5), (9, 'D5', 'D5', 0.5), (9.5, 'C5', 'C5', 0.5), (10, 'A4', 'A4', 2),
        (16, 'D5', 'D5', 1), (17, 'F5', 'F5', 1), (18, 'A5', 'A5', 2), (20, 'G#5', 'G#5', 0.5), (20.5, 'F5', 'F5', 0.5), (21, 'D5', 'D5', 3),
        (24, 'E5', 'E5', 0.5), (24.5, 'C5', 'C5', 0.5), (25, 'A4', 'A4', 3),
        (32, 'B4', 'B4', 0.5), (32.5, 'D5', 'D5', 0.5), (33, 'E5', 'E5', 3), (36, 'D5', 'D5', 1), (37, 'C5', 'C5', 1), (38, 'A4', 'A4', 2),
        (40, 'E5', 'E5', 1), (41, 'C5', 'C5', 1), (42, 'A4', 'A4', 2), (44, 'B4', 'B4', 1), (45, 'G#4', 'G#4', 3),
    ]
    for b, f, t_, ln in harp:
        s.note(3, 56 + b, f, ln * 0.9, 110)
    for k, c in enumerate(blues):
        bar = 14 + k
        lh(bar, c); kit(bar, fill=(k == 11))
        r = n({'A': 'A4', 'D': 'D4', 'E': 'E4'}[c])            # right-hand comping: minor stabs on the off-beats
        third = 3 if c != 'E' else 4
        for b in (0.5, 2.5):
            s.chord(4, bar * 4 + b, [r, r + third, r + 7], 0.3, 86)

    # the break, 4 bars: stop-time saloon stomps, the slide over them (bars 26-29)
    for k in range(4):
        base = (26 + k) * 4
        s.chord(4, base, ['A2', 'E3', 'A3', 'C4', 'E4'], 0.6, 112); s.note(2, base, 'A1', 0.6, 118)
        s.drum(base, KICK, 120); s.drum(base, CRASH if k == 0 else SPLASH, 104)
        s.drum(base + 1.5, KICK, 110); s.drum(base + 1.5, SNARE, 112)
    for b, f, t_, ln, v in [(0.5, 'G3', 'A3', 1.2, 118), (2, 'C4', 'C4', 0.5, 110), (2.5, 'D4', 'E4', 1.4, 120),
                            (4.5, 'G4', 'A4', 2.5, 122), (8.5, 'E4', 'E4', 0.5, 108), (9, 'D4', 'D4', 0.5, 106),
                            (9.5, 'C4', 'C4', 0.5, 104), (10, 'G3', 'A3', 2, 118), (12.5, 'D#4', 'E4', 3, 124)]:
        if f == t_:
            s.note(0, 104 + b, f, ln * 0.9, v)
        else:
            s.slide(0, 104 + b, f, t_, ln, v)
    s.drum(119, SNARE, 100); s.drum(119.25, SNARE, 106); s.drum(119.5, SNARE, 112); s.drum(119.75, SNARE, 120)
    return s, 2 * 4, 30 * 4                       # loop from bar 2 (after the intro), end after bar 29


# ---------------------------------------------------------------------------------------------- the Cattle Drive
FIDDLE, STEEL_STR = 110, 25
def stampede():
    """Stampede!: the Cattle Drive and Jackrabbit Jack. A galloping country train beat in A, 168 bpm, straight: the
    acoustic guitar's boom-chicka, the bass galloping root and fifth with pickups, the snare's train beat on the
    eighths; a fiddle tune up front, the harmonica answering it the second time; a stop-time breakdown with whip
    cracks (a slap) before it loops."""
    s = Song(168)
    s.prog(0, FIDDLE, vol=100, pan=46)
    s.prog(1, STEEL_STR, vol=86, pan=86)          # the boom-chicka
    s.prog(2, FINGER_BASS, vol=110)
    s.prog(3, HARMONICA, vol=96, pan=74)
    s.cc(9, 0, 7, 106)
    ROOT = {'A': 'A2', 'D': 'D3', 'E': 'E2'}

    def gallop(bar, ch):
        """Boom-chicka: the bass on 1 and 3 (root, fifth) with a pickup, the guitar's chord on the off-beats"""
        r = n(ROOT[ch]); base = bar * 4
        s.note(2, base, r - 12, 0.9, 112); s.note(2, base + 1.5, r - 12 + 4, 0.4, 92)
        s.note(2, base + 2, r - 12 + 7, 0.9, 106); s.note(2, base + 3.5, r - 12 + 5, 0.4, 92)
        maj = [r + 12, r + 16, r + 19]
        for b in (1, 3):
            s.chord(1, base + b, maj, 0.35, 92)
        for b in (0.5, 1.5, 2.5, 3.5):
            s.chord(1, base + b, maj[1:], 0.2, 70)
        s.drum(base, KICK, 110); s.drum(base + 2, KICK, 104)
        for i in range(8):
            s.drum(base + i * 0.5, SNARE if i % 2 else RIM, 76 if i % 2 else 60)       # the train beat
        s.drum(base + 1, SNARE, 106); s.drum(base + 3, SNARE, 110)

    form = ['A', 'A', 'D', 'A', 'E', 'D', 'A', 'E'] * 2           # two times 8 bars
    tune = [  # (beat in 8 bars, note, length): a fiddle hoedown
        (0, 'E5', 0.5), (0.5, 'C#5', 0.5), (1, 'A4', 0.5), (1.5, 'C#5', 0.5), (2, 'E5', 1), (3, 'F#5', 0.5), (3.5, 'E5', 0.5),
        (4, 'C#5', 1), (5, 'A4', 1), (6, 'B4', 0.5), (6.5, 'C#5', 0.5), (7, 'A4', 1),
        (8, 'D5', 0.5), (8.5, 'F#5', 0.5), (9, 'A5', 1), (10, 'F#5', 0.5), (10.5, 'D5', 0.5), (11, 'E5', 1),
        (12, 'C#5', 0.5), (12.5, 'E5', 0.5), (13, 'A5', 1.5), (14.5, 'G#5', 0.5), (15, 'A5', 1),
        (16, 'B5', 0.5), (16.5, 'A5', 0.5), (17, 'G#5', 0.5), (17.5, 'E5', 0.5), (18, 'B4', 1), (19, 'E5', 1),
        (20, 'F#5', 0.5), (20.5, 'E5', 0.5), (21, 'D5', 0.5), (21.5, 'B4', 0.5), (22, 'A4', 1), (23, 'D5', 1),
        (24, 'C#5', 0.5), (24.5, 'E5', 0.5), (25, 'A5', 1), (26, 'E5', 0.5), (26.5, 'C#5', 0.5), (27, 'A4', 1),
        (28, 'B4', 0.5), (28.5, 'C#5', 0.5), (29, 'D5', 0.5), (29.5, 'D#5', 0.5), (30, 'E5', 2),
    ]
    for k, ch in enumerate(form):
        gallop(k, ch)
    for half in range(2):
        for b, nt, ln in tune:
            beat = half * 32 + b
            if half == 0 or b % 4 >= 2:                  # the fiddle; the second time the harmonica takes the answers
                s.note(0, beat, nt, ln * 0.9, 108)
            else:
                s.note(3, beat, n(nt) - 12, ln * 0.9, 104)
    s.drum(0, CRASH, 110); s.drum(32, CRASH, 110)
    # the breakdown, 4 bars: stop-time hits, the whip, the fiddle sawing (bars 16-19)
    for k in range(4):
        base = (16 + k) * 4
        s.chord(1, base, ['A2', 'E3', 'A3', 'C#4', 'E4'], 0.5, 112); s.note(2, base, 'A1', 0.5, 118)
        s.drum(base, KICK, 120); s.drum(base, CRASH if k % 2 == 0 else SPLASH, 100)
        s.drum(base + 2.5, 28, 120)                    # the whip crack (GM slap)
        for i in range(4):
            s.note(0, base + 1 + i * 0.25, 'A5' if i % 2 == 0 else 'E5', 0.22, 100)
    s.drum(79, SNARE, 100); s.drum(79.25, SNARE, 106); s.drum(79.5, SNARE, 112); s.drum(79.75, SNARE, 120)
    return s, 0, 20 * 4                             # loops from the top, ends after bar 19


# ---------------------------------------------------------------------------------------------- the Train Heist
def heist():
    """Iron Horse: the Train Heist and Sting. D, 150 bpm, a shuffle. The whistle (a harmonica chord, bent down) over
    the train pulling out (bars 0-1, the first time only); a 12-bar boogie in D - the overdrive's boogie riff, the
    bass doubling it, the snare chugging every eighth - the harmonica wailing over the second half (bars 2-13); the
    tunnel: stop-time hits in the dark and a snare roll building, the whistle again (14-17); a slide guitar riding
    out over the riff, a turnaround, and back to bar 2 (18-25)."""
    s = Song(150, swing=0.62)
    s.prog(0, OVERDRIVE, vol=96, pan=44)          # the riff, and the slide later
    s.prog(1, DISTORTION, vol=74, pan=88)         # the stop-time hits, the ride-out's chords
    s.prog(2, FINGER_BASS, vol=112)
    s.prog(3, HARMONICA, vol=104, pan=70)
    s.bend_range(3, 2); s.bend_range(0, 12)
    s.cc(9, 0, 7, 104)
    R = {'D': n('D3'), 'G': n('G2'), 'A': n('A2')}    # the riff's roots

    def train(bar, accent=True, kick=True):
        """The train beat: the snare on every eighth, a ghost between, the backbeat on 2 and 4, the kick on 1 and 3"""
        base = bar * 4
        for i in range(8):
            s.drum(base + i * 0.5, SNARE, 64 if i % 2 == 0 else 50)
        if accent:
            s.drum(base + 1, SNARE, 112); s.drum(base + 3, SNARE, 116)
        if kick:
            s.drum(base, KICK, 112); s.drum(base + 2, KICK, 104); s.drum(base + 2.5, KICK, 80)
        s.drum(base, HAT_P, 60); s.drum(base + 2, HAT_P, 60)

    def riff(bar, ch, vel=96):
        """The boogie: the root under 5th, 6th, flat 7th, 6th - a pair of shuffle eighths each beat; the bass doubles it"""
        r = R[ch]; base = bar * 4
        for b, top in enumerate((7, 9, 10, 9)):
            for e in (0, 0.5):
                s.chord(0, base + b + e, [r, r + top], 0.42, vel - (8 if e else 0))
            s.note(2, base + b, r - 12, 0.45, 112); s.note(2, base + b + 0.5, r - 12 + top, 0.4, 96)

    def whistle(beat, length=1.6):
        """The train's whistle: a harmonica chord that sags as it fades"""
        s.bend(3, beat - 0.01, 0)
        s.chord(3, beat, ['A4', 'D5', 'F#5'], length, 110)
        for k in range(1, 5):
            s.bend(3, beat + length * (0.4 + 0.15 * k), -0.12 * k)
        s.bend(3, beat + length + 0.05, 0)

    # the whistle, and the train pulling out (the first time only)
    whistle(0, 1.5); whistle(2, 1.8)
    for i in range(16):
        s.drum(i * 0.5, SNARE, 40 + i * 4)
    s.drum(6, KICK, 100); s.drum(7, KICK, 104); s.drum(7.5, SNARE, 110)
    # the 12-bar boogie (bars 2-13), the harmonica over its second half
    form = ['D', 'D', 'D', 'D', 'G', 'G', 'D', 'D', 'A', 'G', 'D', 'A']
    for k, ch in enumerate(form):
        riff(2 + k, ch); train(2 + k)
    s.drum(8, CRASH, 110)
    harp = [  # (beat from bar 6, note, length, bend at the start: semitones below, sliding up)
        (0, 'A4', 1.5, 1), (1.5, 'C5', 0.5, 0), (2, 'D5', 1, 0), (3, 'C5', 0.5, 0), (3.5, 'A4', 0.5, 0),
        (4, 'G4', 2, 1), (6, 'F4', 0.5, 0), (6.5, 'D4', 1.5, 0),
        (8, 'D5', 0.5, 0), (8.5, 'D5', 0.5, 0), (9, 'C5', 0.5, 0), (9.5, 'A4', 0.5, 0), (10, 'C5', 2, 1),
        (12, 'A4', 1, 0), (13, 'G4', 0.5, 0), (13.5, 'F4', 0.5, 0), (14, 'D4', 2, 0),
        (16, 'E5', 2, 2), (18, 'D5', 1, 0), (19, 'C5', 1, 0),
        (20, 'D5', 0.5, 0), (20.5, 'C5', 0.5, 0), (21, 'A4', 0.5, 0), (21.5, 'G4', 0.5, 0), (22, 'A4', 2, 1),
        (24, 'F5', 0.5, 0), (24.5, 'E5', 0.5, 0), (25, 'D5', 1, 0), (26, 'A4', 1, 1), (27, 'C5', 1, 0),
        (28, 'D5', 1.5, 0), (29.5, 'A4', 0.5, 0), (30, 'C#5', 2, 1),
    ]
    for b, nt, ln, bnd in harp:
        beat = 24 + b
        if bnd:
            s.bend(3, beat - 0.01, -bnd / 2); s.note(3, beat, nt, ln * 0.92, 108)
            for k in range(1, 4):
                s.bend(3, beat + 0.08 * k, -bnd / 2 * (1 - k / 3))
        else:
            s.note(3, beat, nt, ln * 0.92, 104)
    # the tunnel (bars 14-17): stop-time in the dark, a snare roll building, the whistle at the end
    for k in range(4):
        base = (14 + k) * 4
        s.chord(1, base, ['D3', 'A3', 'D4', 'F#4'], 0.5, 112); s.note(2, base, 'D2', 0.5, 118)
        s.drum(base, KICK, 122); s.drum(base, CRASH if k % 2 == 0 else SPLASH, 96)
        for i in range(16 if k == 3 else 8):
            st = 0.25 if k == 3 else 0.5
            s.drum(base + 1 + i * st * (3 / 4 if k == 3 else 3 / 4), SNARE, 44 + k * 14 + i * 2)
    whistle(16 * 4 + 2, 1.8)
    # the ride-out (bars 18-25): the riff with a slide on top, the chords on the distortion, a turnaround
    out = ['D', 'D', 'G', 'D', 'A', 'G', 'D', 'A']
    for k, ch in enumerate(out):
        bar = 18 + k
        riff(bar, ch, 84); train(bar)
        s.chord(1, bar * 4 + 1, [R[ch] + 12, R[ch] + 19, R[ch] + 24], 0.3, 86); s.chord(1, bar * 4 + 3, [R[ch] + 12, R[ch] + 19, R[ch] + 24], 0.3, 86)
    s.drum(72, CRASH, 112)
    slide = [  # (beat from bar 18, from, to, length)
        (0, 'A4', 'D5', 2), (2.5, 'C5', 'C5', 0.5), (3, 'A4', 'A4', 1),
        (4, 'F5', 'F#5', 1.5), (5.5, 'D5', 'D5', 0.5), (6, 'A4', 'A4', 2),
        (8, 'C5', 'D5', 1), (9, 'B4', 'B4', 1), (10, 'G4', 'G4', 2),
        (12, 'A4', 'D5', 3),
        (16, 'E5', 'E5', 1), (17, 'D5', 'D5', 0.5), (17.5, 'C5', 'C5', 0.5), (18, 'A4', 'A4', 2),
        (20, 'D5', 'G5', 2), (22, 'F5', 'F5', 0.5), (22.5, 'D5', 'D5', 1.5),
        (24, 'A5', 'A5', 1), (25, 'F#5', 'F#5', 0.5), (25.5, 'D5', 'D5', 0.5), (26, 'C5', 'D5', 2),
        (28, 'A4', 'A4', 0.5), (28.5, 'C#5', 'C#5', 0.5), (29, 'E5', 'E5', 0.5), (29.5, 'G5', 'G5', 0.5), (30, 'A5', 'A5', 2),
    ]
    for b, frm, to, ln in slide:
        beat = 72 + b
        if frm != to:
            s.slide(0, beat, frm, to, ln * 0.92, 112, span=12, steps=4, slide_len=0.3)
        else:
            s.note(0, beat, frm, ln * 0.92, 108)
    s.drum(103, SNARE, 104); s.drum(103.25, SNARE, 110); s.drum(103.5, SNARE, 116); s.drum(103.75, SNARE, 122)
    return s, 2 * 4, 26 * 4                         # loops back to bar 2 (the whistle once), ends after bar 25


# ---------------------------------------------------------------------------------------------- the Mission
def laststand():
    """Last Stand: the Mission and Bullrush. D minor, 138 bpm, straight. The bell tolling and a lone trumpet's
    Deguello - the no-quarter call - over tremolo strings (bars 0-3, the first time only); the drive: a galloping
    overdrive down the Andalusian cadence (Dm C Bb A), the bass, a nylon guitar's strums, the trumpet's tune and the
    second time a second trumpet a third under it (bars 4-19); the break: stop-time hits, the war drums rolling, the
    bell, and the call again up high (20-27); back to bar 4."""
    s = Song(138)
    s.prog(0, TRUMPET, vol=104, pan=60)
    s.prog(1, OVERDRIVE, vol=80, pan=40)          # the gallop
    s.prog(2, FINGER_BASS, vol=112)
    s.prog(3, TREMOLO_STR, vol=84, pan=76)        # the strings under the call
    s.prog(4, NYLON_GTR, vol=92, pan=92)          # the strums
    s.prog(5, TRUMPET, vol=88, pan=72)            # the second trumpet
    s.prog(6, TUBULAR_BELLS, vol=100, pan=54)     # the mission bell
    s.cc(9, 0, 7, 104)
    CH = {'Dm': ('D', ['D3', 'F3', 'A3', 'D4']), 'C': ('C', ['C3', 'E3', 'G3', 'C4']),
          'Bb': ('A#', ['A#2', 'D3', 'F3', 'A#3']), 'A': ('A', ['A2', 'C#3', 'E3', 'A3'])}

    def bell(beat):
        s.note(6, beat, 'D5', 3.5, 112); s.note(6, beat, 'D4', 3.5, 70)

    def call(b0, notes, ch=0, vel=104, octave=0):
        """A melody: (beat from b0, note, length)"""
        for b, nt, ln in notes:
            s.note(ch, b0 + b, n(nt) + 12 * octave, ln * 0.94, vel)

    DEGUELLO = [(0, 'A4', 2), (2, 'D5', 1), (3, 'E5', 1), (4, 'F5', 3), (7, 'E5', 1),
                (8, 'D5', 1), (9, 'C#5', 1), (10, 'D5', 2), (12, 'A4', 4),
                (16, 'A#4', 2), (18, 'A4', 1), (19, 'G4', 1), (20, 'A4', 2), (22, 'F4', 1), (23, 'E4', 1), (24, 'D4', 6)]
    # the call (bars 0-3, the first time): the bell, the strings swelling, the trumpet alone
    bell(0); bell(8)
    s.chord(3, 0, ['D3', 'A3', 'D4', 'F4'], 7.8, 70); s.chord(3, 8, ['A#2', 'F3', 'A#3', 'D4'], 3.8, 74); s.chord(3, 12, ['A2', 'E3', 'A3', 'C#4'], 3.8, 80)
    call(0, [(b, nt, ln) for b, nt, ln in DEGUELLO if b < 16])
    s.drum(14, TOM_LO, 70); s.drum(14.5, TOM_LO, 80); s.drum(15, FLOOR_TOM, 92); s.drum(15.5, FLOOR_TOM, 104); s.drum(15.75, FLOOR_TOM, 110)

    def gallop(bar, chord, vel=88):
        """The drive: root-and-fifth gallops on the overdrive, the bass on the root, the nylon strummed, the beat"""
        root, tones = CH[chord]; base = bar * 4; r = n(root + ('1' if root == 'A#' else '2'))
        for b in range(4):
            for e, ln in ((0, 0.45), (0.5, 0.22), (0.75, 0.22)):
                s.chord(1, base + b + e, [r + 12, r + 19], ln, vel - (10 if e else 0))
            s.note(2, base + b, r, 0.45, 110); s.note(2, base + b + 0.5, r + (12 if b % 2 else 0), 0.4, 92)
        for b, v in ((0, 96), (2.5, 86)):                                  # the strums, the strings rolled a little
            for k, t_ in enumerate(tones[1:]):
                s.note(4, base + b + k * 0.03, t_, 0.4, v - k * 4)
        s.drum(base, KICK, 112); s.drum(base + 0.75, KICK, 84); s.drum(base + 2, KICK, 108); s.drum(base + 2.75, KICK, 84)
        s.drum(base + 1, SNARE, 110); s.drum(base + 3, SNARE, 114)
        for i in range(8):
            s.drum(base + i * 0.5, HAT_C, 72 if i % 2 == 0 else 54)

    TUNE1 = [(0, 'D5', 1.5), (1.5, 'F5', 0.5), (2, 'A5', 1), (3, 'G5', 0.5), (3.5, 'F5', 0.5),
             (4, 'E5', 1.5), (5.5, 'G5', 0.5), (6, 'E5', 1), (7, 'C5', 1),
             (8, 'D5', 1.5), (9.5, 'F5', 0.5), (10, 'D5', 1), (11, 'A#4', 1),
             (12, 'C#5', 2), (14, 'E5', 1), (15, 'A4', 1)]
    TUNE2 = [(0, 'A5', 2), (2, 'G5', 0.5), (2.5, 'F5', 0.5), (3, 'E5', 1),
             (4, 'G5', 2), (6, 'F5', 0.5), (6.5, 'E5', 0.5), (7, 'D5', 1),
             (8, 'F5', 1), (9, 'E5', 0.5), (9.5, 'D5', 0.5), (10, 'C5', 1), (11, 'A#4', 1),
             (12, 'A4', 3)]
    THIRD = {'D5': 'A#4', 'F5': 'D5', 'A5': 'F5', 'G5': 'E5', 'E5': 'C#5', 'C5': 'A4', 'A#4': 'G4', 'C#5': 'A4', 'A4': 'F4'}   # a third under, in the key
    cad = ['Dm', 'C', 'Bb', 'A']
    for k in range(16):                              # the drive (bars 4-19): four times down the cadence
        gallop(4 + k, cad[k % 4])
    for cyc, tune in enumerate((TUNE1, TUNE2, TUNE1, TUNE2)):
        b0 = (4 + cyc * 4) * 4
        call(b0, tune)
        if cyc >= 2:
            call(b0, [(b, THIRD.get(nt, nt), ln) for b, nt, ln in tune], ch=5, vel=90)
        s.drum(b0, CRASH, 110)
    s.note(0, 19 * 4 + 3, 'A5', 0.9, 116)            # the rip up at the end of the drive
    # the break (bars 20-27): the hits, the war drums rolling up, the bell, the call an octave up
    hits = ['Dm', 'Dm', 'Bb', 'A', 'Dm', 'Dm', 'Bb', 'A']
    for k, chd in enumerate(hits):
        base = (20 + k) * 4; root, tones = CH[chd]
        s.chord(1, base, [n(t_) + 12 for t_ in tones[:3]], 0.6, 112); s.chord(4, base, tones, 0.6, 104)
        s.note(2, base, n(tones[0]) - 12, 0.6, 118)
        s.drum(base, KICK, 120); s.drum(base, CRASH if k % 4 == 0 else SPLASH, 100)
        for i in range(8):                            # the war drums, louder bar by bar
            s.drum(base + 1 + i * 0.375, TOM_LO if i % 2 else FLOOR_TOM, 56 + k * 7 + i * 2)
    bell(80); bell(96)
    s.chord(3, 80, ['D3', 'A3', 'D4', 'F4'], 15.8, 86); s.chord(3, 96, ['A#2', 'F3', 'A#3', 'D4'], 7.8, 90); s.chord(3, 104, ['A2', 'E3', 'A3', 'C#4'], 7.8, 96)
    call(80, [(b, nt, ln) for b, nt, ln in DEGUELLO if b < 24], vel=110)
    call(80, [(b, THIRD.get(nt, nt), ln) for b, nt, ln in DEGUELLO if b < 24], ch=5, vel=92)
    for i, v in enumerate(range(90, 126, 4)):        # the fill back into the drive
        s.drum(108 + 3 + i * (1 / 9), SNARE, v)
    return s, 4 * 4, 28 * 4                          # loops back to bar 4 (the call once), ends after bar 27


# ---------------------------------------------------------------------------------------------- High Noon
WATCH = [(0, 'A4', 1), (1, 'C5', 1), (2, 'E5', 1), (3, 'A5', 1), (4, 'G5', 1.5), (5.5, 'E5', 0.5), (6, 'C5', 1), (7, 'B4', 1),
         (8, 'A4', 1), (9, 'C5', 1), (10, 'E5', 1), (11, 'G5', 1), (12, 'F5', 2), (14, 'E5', 2)]   # the pocket watch's tune


def standoff():
    """Standoff: High Noon's duel. A minor, 96 bpm, four bars that loop while they stare each other down: the watch's
    chime on a music box, the clock ticking on a woodblock (and the tock on the low one), the strings trembling on A and
    E, a lone whistle up high, a timpani roll creeping in on the last bar."""
    s = Song(96)
    s.prog(0, MUSIC_BOX, vol=110, pan=60)
    s.prog(1, TREMOLO_STR, vol=78, pan=76)
    s.prog(3, WHISTLE, vol=86, pan=50)
    s.prog(4, TIMPANI, vol=96)
    s.cc(9, 0, 7, 96)
    for b, nt, ln in WATCH:
        s.note(0, b, nt, ln * 0.9, 100)
    s.chord(1, 0, ['A2', 'E3', 'A3'], 7.9, 64); s.chord(1, 8, ['F2', 'C3', 'A3'], 3.9, 66); s.chord(1, 12, ['E2', 'B2', 'G#3'], 3.9, 70)
    for b in range(16):                              # tick, tock
        s.drum(b, WOODBLOCK if b % 2 == 0 else 77, 84 if b % 2 == 0 else 70)
    for b, nt, ln in ((2, 'E6', 4), (8, 'D6', 2), (10, 'C6', 2), (12, 'B5', 3.5)):
        s.note(3, b, nt, ln * 0.95, 80)
    for i in range(8):                               # the timpani creeping in
        s.note(4, 12 + i * 0.5, 'E2', 0.45, 50 + i * 8)
    return s, 0, 16


def showdown():
    """Showdown: the fight with Diamondback. E minor, 156 bpm, straight. A galloping overdrive and bass on E, C, D, B (the
    watch's tune on two trumpets over it), timpani on the downbeats (bars 0-15); a stop-time break - the hits, the clock
    ticking again on the woodblock, the whistle (16-19); back to bar 0."""
    s = Song(156)
    s.prog(0, TRUMPET, vol=104, pan=58)
    s.prog(1, OVERDRIVE, vol=84, pan=40)
    s.prog(2, FINGER_BASS, vol=112)
    s.prog(3, WHISTLE, vol=90, pan=74)
    s.prog(4, TIMPANI, vol=100)
    s.prog(5, TRUMPET, vol=86, pan=78)
    s.cc(9, 0, 7, 104)
    ROOT = {'E': n('E2'), 'C': n('C2'), 'D': n('D2'), 'B': n('B1')}
    prog_ = ['E', 'E', 'C', 'D', 'E', 'E', 'C', 'B']

    def gallop(bar, ch, vel=88):
        r = ROOT[ch]; base = bar * 4
        for b in range(4):
            for e, ln in ((0, 0.45), (0.5, 0.22), (0.75, 0.22)):
                s.chord(1, base + b + e, [r + 12, r + 19], ln, vel - (10 if e else 0))
            s.note(2, base + b, r, 0.45, 112); s.note(2, base + b + 0.5, r + 12, 0.4, 90)
        s.drum(base, KICK, 116); s.drum(base + 0.75, KICK, 86); s.drum(base + 2, KICK, 110); s.drum(base + 2.75, KICK, 86)
        s.drum(base + 1, SNARE, 112); s.drum(base + 3, SNARE, 116)
        for i in range(8):
            s.drum(base + i * 0.5, HAT_C, 70 if i % 2 == 0 else 52)
        s.note(4, base, r + 12, 0.9, 100)
    for k in range(16):
        gallop(k, prog_[k % 8])
    up = {'A4': 'B4', 'C5': 'E5', 'E5': 'G5', 'A5': 'B5', 'G5': 'A5', 'B4': 'D#5', 'F5': 'F#5'}   # the watch's tune, lifted into E minor
    THIRD = {'B4': 'G4', 'E5': 'B4', 'G5': 'E5', 'B5': 'G5', 'A5': 'F#5', 'D#5': 'B4', 'F#5': 'D5'}
    tune = [(b, up.get(nt, nt), ln) for b, nt, ln in WATCH]
    for half in range(2):
        b0 = half * 32
        for b, nt, ln in tune:
            s.note(0, b0 + b * 2, nt, ln * 2 * 0.92, 108)             # the tune at half speed over the gallop
            if half:
                s.note(5, b0 + b * 2, THIRD.get(nt, nt), ln * 2 * 0.92, 88)
        s.drum(b0, CRASH, 112)
    for k, (ch, chord) in enumerate((('E', ['E3', 'B3', 'E4', 'G4']), ('C', ['C3', 'G3', 'C4', 'E4']), ('D', ['D3', 'A3', 'D4', 'F#4']), ('B', ['B2', 'F#3', 'B3', 'D#4']))):
        base = (16 + k) * 4                          # the break: hits, the clock ticking, the whistle
        s.chord(1, base, chord, 0.6, 112); s.note(2, base, ROOT[ch], 0.6, 118); s.drum(base, KICK, 122); s.drum(base, CRASH if k % 2 == 0 else SPLASH, 100)
        s.note(4, base, ROOT[ch] + 12, 1.5, 116)
        for i in range(1, 4):
            s.drum(base + i, WOODBLOCK, 80 + i * 6)
    for b, nt, ln in ((64, 'B5', 4), (68, 'A5', 2), (70, 'G5', 2), (72, 'F#5', 4), (76, 'D#5', 3)):
        s.note(3, b, nt, ln * 0.95, 96)
    for i, v in enumerate(range(90, 126, 4)):
        s.drum(76 + 3 + i * (1 / 9), SNARE, v)
    return s, 0, 20 * 4


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
    for name, fn in (('title', title), ('boothill', boothill), ('clear', clear), ('over', over), ('boogie', boogie),
                     ('deadman', deadman), ('stampede', stampede), ('heist', heist), ('laststand', laststand), ('standoff', standoff), ('showdown', showdown)):
        song, loop, end = fn()
        k = song.save(OUT / f'{name}.mid', loop, end)
        secs = end * 60 / song.bpm
        print(f'{name:9} {k:5} events  {secs:5.1f} s  {"loops" if loop is not None else "once"}')


if __name__ == '__main__':
    main()
