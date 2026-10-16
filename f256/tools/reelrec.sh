#!/bin/sh
# tools/reelrec.sh - record the showreel's raw footage in MAME (tools/tskreel.lua): reel/raw.avi, reel/frames.txt,
# and a snapshot every 15 frames in mame/snap to choose the windows from
set -e
HERE=$(cd "$(dirname "$0")/.." && pwd)
MAMEDIR=${MAMEDIR:-$HOME/projects/wild/mame}
ROMS=${ROMS:-$HOME/projects/wild/multiterm-pr/tools/mame-roms}
IMAGE=${IMAGE:-$HOME/projects/wild/multiterm-pr/images/multiterm-games-jr2.dsk}
WORK=$HERE/mame
mkdir -p "$WORK" "$HERE/reel"
rm -rf "$WORK/snap" "$HERE/reel/raw.avi"
cp "$IMAGE" "$WORK/tsk.dsk"
truncate -s 134217728 "$WORK/tsk.dsk"
make -C "$HERE" -s install DSK="$WORK/tsk.dsk" >/dev/null
cd "$MAMEDIR"
REELDIR="$HERE/reel" ./mame wbjr2 -rompath "$ROMS" -bios turbo -hard "$WORK/tsk.dsk" -skip_gameinfo -video none -sound none -nothrottle \
  -autoboot_script "$HERE/tools/tskreel.lua" -snapshot_directory "$WORK/snap" -aviwrite "$HERE/reel/raw.avi" 2>&1 | grep -v "NO GOOD DUMP\|^$" | tail -3 || true
ls -la "$HERE/reel"
