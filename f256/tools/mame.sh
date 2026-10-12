#!/bin/sh
# Run tskview in the Wildbits MAME (wbjr2, Longview map) headless and take snapshots.
#   tools/mame.sh [seconds]      snapshots go to f256/mame/snap/wbjr2/
# Uses a COPY of the new-map Jr2 image (MAME writes into it), padded to a size MAME's SD card accepts.
# The Lua script types "chd /dd/TSK" and "tskview", then presses keys and takes snapshots on a timeline.
set -e
HERE=$(cd "$(dirname "$0")/.." && pwd)
MAMEDIR=${MAMEDIR:-$HOME/projects/wild/mame}
ROMS=${ROMS:-$HOME/projects/wild/multiterm-pr/tools/mame-roms}
IMAGE=${IMAGE:-$HOME/projects/wild/multiterm-pr/images/multiterm-games-jr2.dsk}
WORK=$HERE/mame
mkdir -p "$WORK"
rm -rf "$WORK/snap"
cp "$IMAGE" "$WORK/tsk.dsk"
truncate -s 134217728 "$WORK/tsk.dsk"
make -C "$HERE" -s install DSK="$WORK/tsk.dsk" >/dev/null
cd "$MAMEDIR"
./mame wbjr2 -rompath "$ROMS" -bios turbo -hard "$WORK/tsk.dsk" -skip_gameinfo -video none -sound none -nothrottle \
  -autoboot_script "$HERE/tools/tskview.lua" -snapshot_directory "$WORK/snap" 2>&1 | grep -v "NO GOOD DUMP\|^$" | tail -5 || true
ls "$WORK/snap/wbjr2/" 2>/dev/null
