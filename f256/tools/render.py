#!/usr/bin/env python3
"""render.py - the music as audio: game/music/*.mid -> game/music/*.mp3, through fluidsynth (libfluidsynth by
ctypes) and a General MIDI soundfont. A preview of what the SAM2695 will play (its voices differ: it's a
GM synth too, not this soundfont), and the browser prototype's music.

    python3 f256/tools/render.py [name ...]      # all songs, or the ones named
    python3 f256/tools/render.py --mid x.mid --out x.mp3 [--loops 2]
"""
import argparse, ctypes, os, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MUSIC = ROOT / 'game' / 'music'
SF2 = os.environ.get('SF2', '/usr/share/sounds/sf2/default-GM.sf2')
FS = ctypes.CDLL('libfluidsynth.so.3')
FS.new_fluid_settings.restype = ctypes.c_void_p
FS.new_fluid_synth.restype = ctypes.c_void_p
FS.new_fluid_synth.argtypes = [ctypes.c_void_p]
FS.new_fluid_player.restype = ctypes.c_void_p
FS.new_fluid_player.argtypes = [ctypes.c_void_p]
FS.new_fluid_file_renderer.restype = ctypes.c_void_p
FS.new_fluid_file_renderer.argtypes = [ctypes.c_void_p]
FS.fluid_settings_setstr.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_char_p]
FS.fluid_settings_setnum.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_double]
FS.fluid_settings_setint.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int]
FS.fluid_synth_sfload.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int]
FS.fluid_player_add.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
FS.fluid_player_play.argtypes = [ctypes.c_void_p]
FS.fluid_player_set_loop.argtypes = [ctypes.c_void_p, ctypes.c_int]
FS.fluid_player_get_status.argtypes = [ctypes.c_void_p]
FS.fluid_file_renderer_process_block.argtypes = [ctypes.c_void_p]
for f in ('delete_fluid_file_renderer', 'delete_fluid_player', 'delete_fluid_synth', 'delete_fluid_settings'):
    getattr(FS, f).argtypes = [ctypes.c_void_p]


def render(mid, out, loops=1, tail=2.0):
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, 'out.wav')
        st = FS.new_fluid_settings()
        FS.fluid_settings_setstr(st, b'audio.file.name', wav.encode())
        FS.fluid_settings_setstr(st, b'player.timing-source', b'sample')
        FS.fluid_settings_setint(st, b'synth.lock-memory', 0)
        FS.fluid_settings_setnum(st, b'synth.gain', 0.5)
        FS.fluid_settings_setint(st, b'audio.period-size', 64)
        syn = FS.new_fluid_synth(st)
        if FS.fluid_synth_sfload(syn, SF2.encode(), 1) < 0:
            sys.exit('no soundfont: ' + SF2)
        pl = FS.new_fluid_player(syn)
        FS.fluid_player_add(pl, str(mid).encode())
        FS.fluid_player_set_loop(pl, loops)
        FS.fluid_player_play(pl)
        rd = FS.new_fluid_file_renderer(syn)
        while FS.fluid_player_get_status(pl) == 1:   # FLUID_PLAYER_PLAYING
            if FS.fluid_file_renderer_process_block(rd) != 0:
                break
        for _ in range(int(tail * 44100 / 64)):       # let the last notes ring
            FS.fluid_file_renderer_process_block(rd)
        FS.delete_fluid_file_renderer(rd)
        FS.delete_fluid_player(pl)
        FS.delete_fluid_synth(syn)
        FS.delete_fluid_settings(st)
        trim = 'areverse,silenceremove=start_periods=1:start_threshold=-62dB,areverse'     # the silence at the end off
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-af', trim, '-codec:a', 'libmp3lame', '-qscale:a', '4',
                        str(out)], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('names', nargs='*')
    ap.add_argument('--mid')
    ap.add_argument('--out')
    ap.add_argument('--loops', type=int, default=1)
    a = ap.parse_args()
    if a.mid:
        render(a.mid, a.out, a.loops)
        return
    names = a.names or [p.stem for p in sorted(MUSIC.glob('*.mid'))]
    for nm in names:
        render(MUSIC / f'{nm}.mid', MUSIC / f'{nm}.mp3', a.loops)
        print(nm, (MUSIC / f'{nm}.mp3').stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
