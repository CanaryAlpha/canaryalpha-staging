#!/usr/bin/env bash
# Renders every clip into out/:
#   <file>-1080x1080.mp4   square, 30 fps
#   <file>-1080x1920.mp4   vertical, 30 fps
#   <file>-800x800.gif     website cards, 15 fps, palette-optimised
# Pass clip ids to render only some, e.g.  bash scripts/render-all.sh Scoring Revisit
set -euo pipefail
cd "$(dirname "$0")/.."

CLIPS=("${@:-Scoring Forensics Screening Revisit}")
# Clip id -> output file prefix (matches `file` in src/content.ts).
prefix() {
  case "$1" in
    Scoring) echo "01-scoring-framework" ;;
    Forensics) echo "02-onchain-forensics" ;;
    Screening) echo "03-scam-screening" ;;
    Revisit) echo "04-built-to-revisit" ;;
  esac
}

# Remotion's own ffmpeg (in node_modules; nothing installed globally). Called
# directly: `npx remotion ffmpeg` mangles filter arguments that contain "=".
FFMPEG="$(ls node_modules/@remotion/compositor-*/ffmpeg | head -1)"
export DYLD_LIBRARY_PATH="$(dirname "$FFMPEG")${DYLD_LIBRARY_PATH:+:$DYLD_LIBRARY_PATH}"
export LD_LIBRARY_PATH="$(dirname "$FFMPEG")${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

mkdir -p out/frames
for clip in ${CLIPS[@]}; do
  name="$(prefix "$clip")"
  echo "== $clip -> $name"

  npx remotion render "$clip-Square" "out/$name-1080x1080.mp4" --codec=h264 --crf=16 --log=error
  npx remotion render "$clip-Vertical" "out/$name-1080x1920.mp4" --codec=h264 --crf=16 --log=error

  # GIF: lossless PNG frames -> 15 fps, 800px -> one shared palette -> GIF.
  frames="out/frames/$clip"
  rm -rf "$frames"
  npx remotion render "$clip-Square" "$frames" --sequence --image-format=png \
    --image-sequence-pattern='f-[frame].[ext]' --log=error
  # 15 fps = every other frame (this ffmpeg build has no fps filter). The
  # even frames include the first and last, so the GIF still loops cleanly.
  for f in "$frames"/f-*.png; do
    n="${f##*/f-}"; n="${n%.png}"
    if (( 10#$n % 2 )); then rm "$f"; fi
  done
  filters="scale=800:800:flags=lanczos"
  "$FFMPEG" -v error -y -framerate 15 -pattern_type glob -i "$frames/f-*.png" \
    -vf "$filters,palettegen=max_colors=96:stats_mode=full" "out/$name.palette.png"
  "$FFMPEG" -v error -y -framerate 15 -pattern_type glob -i "$frames/f-*.png" -i "out/$name.palette.png" \
    -lavfi "$filters [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \
    -loop 0 "out/$name-800x800.gif"
  rm -rf "$frames" "out/$name.palette.png"
done

ls -lh out/*.mp4 out/*.gif
