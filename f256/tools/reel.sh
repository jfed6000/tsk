#!/bin/sh
# tools/reel.sh - cut the showreel out of tools/reelrec.sh's raw footage: the title, then a few seconds of each stage,
# over the Shitkicker Shuffle (game/music/title.mp3), scaled 4x with sharp pixels -> reel/tsk-reel.mp4.
# Each window is "start-frame length-in-frames" in MAME's frames (59.94 a second; reel/frames.txt says where each run starts).
set -e
HERE=$(cd "$(dirname "$0")/.." && pwd)
RAW=$HERE/reel/raw.avi
SONG=$HERE/../game/music/title.mp3
OUT=${OUT:-$HERE/reel/tsk-reel.mp4}
WINDOWS="1290 390
2680 270
4640 270
6620 270
7860 270
10080 270
12060 270
13230 300"
args=""; filt=""; n=0
echo "$WINDOWS" | { while read a len; do
  ss=$(echo "scale=4; $a/59.94" | bc); t=$(echo "scale=4; $len/59.94" | bc)
  args="$args -ss $ss -t $t -i $RAW"
  filt="$filt[$n:v]setpts=PTS-STARTPTS,fps=60000/1001[v$n];"
  n=$((n+1))
done
cat=""; i=0; while [ $i -lt $n ]; do cat="$cat[v$i]"; i=$((i+1)); done
total=$(echo "$WINDOWS" | awk '{s+=$2} END {printf "%.3f", s/59.94}')
fade=$(echo "$total - 1.5" | bc)
ffmpeg -y -v error $args -i "$SONG" -filter_complex \
  "${filt}${cat}concat=n=$n:v=1:a=0,scale=1280:960:flags=neighbor,fade=t=in:d=0.5,fade=t=out:st=$fade:d=1.5[v];[$n:a]atrim=0:$total,afade=t=out:st=$fade:d=1.5[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$OUT"
}
ls -la "$OUT"
