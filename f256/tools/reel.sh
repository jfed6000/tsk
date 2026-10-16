#!/bin/sh
# tools/reel.sh - cut the showreel out of tools/reelrec.sh's raw footage: the title, then a few seconds of each stage,
# then the end card (reel/card0-2.png, built in steps: the night sky, then a huge F256, then a huge 6809; drawn by
# tools/reelcard.js in the browser game's font), over the Shitkicker Shuffle (game/music/title.mp3), scaled 4x with
# sharp pixels -> reel/tsk-reel.mp4.
# Each window is "start-frame length-in-frames" in MAME's frames (59.94 a second; reel/frames.txt says where each run starts).
set -e
HERE=$(cd "$(dirname "$0")/.." && pwd)
RAW=$HERE/reel/raw.avi
SONG=$HERE/../game/music/title.mp3
OUT=${OUT:-$HERE/reel/tsk-reel.mp4}
WINDOWS="1290 330
2680 230
4640 230
6620 230
7860 230
10120 230
12060 230
13230 240"
CARD="0.4 0.9 4.5"
args=""; filt=""; n=0
echo "$WINDOWS" | { while read a len; do
  ss=$(echo "scale=4; $a/59.94" | bc); t=$(echo "scale=4; $len/59.94" | bc)
  args="$args -ss $ss -t $t -i $RAW"
  filt="$filt[$n:v]setpts=PTS-STARTPTS,fps=60000/1001,scale=1280:960:flags=neighbor,setsar=1,format=yuv420p[v$n];"
  n=$((n+1))
done
k=0; for d in $CARD; do
  args="$args -loop 1 -framerate 60000/1001 -t $d -i $HERE/reel/card$k.png"
  filt="$filt[$n:v]setsar=1,format=yuv420p[v$n];"
  n=$((n+1)); k=$((k+1))
done
cat=""; i=0; while [ $i -lt $n ]; do cat="$cat[v$i]"; i=$((i+1)); done
total=$(echo "$WINDOWS" | awk -v c="$CARD" '{s+=$2} END {split(c,a," "); for (i in a) t+=a[i]; printf "%.3f", s/59.94+t}')
fade=$(echo "$total - 1.5" | bc)
ffmpeg -y -v error $args -i "$SONG" -filter_complex \
  "${filt}${cat}concat=n=$n:v=1:a=0,fade=t=in:d=0.5[v];[$n:a]apad,atrim=0:$total,afade=t=out:st=$fade:d=1.5[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$OUT"
}
# and a 640x480 copy for Discord and the like
ffmpeg -y -v error -i "$OUT" -vf "scale=640:480:flags=neighbor" -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${OUT%.mp4}-discord.mp4"
ls -la "$OUT" "${OUT%.mp4}-discord.mp4"
