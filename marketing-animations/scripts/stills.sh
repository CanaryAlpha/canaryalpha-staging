#!/usr/bin/env bash
# Preview stills for every clip: the midpoint (frame 112) and the finished
# scene just before the end card (frame 160). Output: out/stills/
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/stills
for clip in Scoring Forensics Screening Revisit; do
  for f in 112 160; do
    npx remotion still "$clip-Square" "out/stills/$clip-square-f$f.png" --frame="$f" --log=error
  done
  npx remotion still "$clip-Vertical" "out/stills/$clip-vertical-f112.png" --frame=112 --log=error
done
