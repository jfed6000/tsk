#!/bin/sh
# install.sh DISK.dsk - put Texas Shitkickers on a NitrOS-9 disk image with ToolShed's os9 tool:
# tsk to CMDS, the TSK folder to /TSK, the execute bits set
set -e
DSK=${1:?usage: sh install.sh /path/to/disk.dsk}
cd "$(dirname "$0")"
os9 del "$DSK",CMDS/tsk 2>/dev/null || true
os9 copy -r CMDS/tsk "$DSK",CMDS/tsk
os9 attr -e -pe "$DSK",CMDS/tsk
os9 makdir "$DSK",TSK 2>/dev/null || true
for f in TSK/*; do
  n=$(basename "$f")
  os9 del "$DSK",TSK/"$n" 2>/dev/null || true
  os9 copy -r "$f" "$DSK",TSK/"$n"
done
for m in tskms tskgt tskcd tskth tskmi tskhn tsken; do os9 attr -e -pe "$DSK",TSK/$m; done
echo "Installed. On the F256:  chd /dd/TSK  then  tsk"
