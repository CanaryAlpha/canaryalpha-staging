# Canary Alpha Research — explainer clips

Four 7.5-second looping clips built with [Remotion](https://www.remotion.dev)
(React + TypeScript). Each starts and ends on its title card, so the first and
last frames match and the clip loops cleanly.

| Clip | Title | Tagline |
|------|-------|---------|
| 01 | 80-point scoring framework | Six weighted categories. One clear verdict. |
| 02 | On-chain forensics | See what insiders do, not what they say. |
| 03 | Scam screening | Six red flags, caught early. |
| 04 | Built to revisit | Quarterly updates. Your thesis stays current. |

Renders go to `out/` (not committed; rebuild them with `npm run render`, below):

- `NN-name-1080x1080.mp4` — square, 30 fps (social feeds)
- `NN-name-1080x1920.mp4` — vertical, 30 fps (Reels, Shorts, TikTok)
- `NN-name-800x800.gif` — 15 fps, under 3 MB (website feature cards)

## Setup

Needs Node 18 or later. Everything installs into this folder (nothing
global); the first render also downloads Remotion's headless browser here.

```bash
cd marketing-animations
npm install
```

## Preview in Remotion Studio

```bash
npm run studio
```

It opens in the browser. Each clip has a `Square` and a `Vertical`
composition (left sidebar); scrub the timeline to check any frame. Edits to
the files below update the preview live.

## Change text, numbers or colours

- **Words and numbers:** `src/content.ts`. Titles, taglines, the six scoring
  categories (name, weight, score), the verdict, the wallet graph (nodes,
  positions, edges, the flagged path and callout), the checklist items and
  which are flagged, the chart data, the Q2/Q3 metrics and "What changed"
  lines. Totals, bar lengths and counters are computed from these values.
- **Colours, font, type sizes, motion, timing:** `src/theme.ts`, used by every
  clip. Colours are the website's Dark theme; for the canary-yellow version,
  set `accent: "#F5C518"`.
- **Logo:** `public/logo.svg` (a copy of `brand/logo-dark.svg`).

After editing, re-render (below). To check a single frame quickly:

```bash
npx remotion still Scoring-Square out/stills/check.png --frame=160
```

## Render

All clips, all formats:

```bash
npm run render
```

Only some clips (ids: `Scoring`, `Forensics`, `Screening`, `Revisit`):

```bash
bash scripts/render-all.sh Scoring Revisit
```

What the script runs for each clip, e.g. Scoring:

```bash
npx remotion render Scoring-Square out/01-scoring-framework-1080x1080.mp4 --codec=h264 --crf=16
npx remotion render Scoring-Vertical out/01-scoring-framework-1080x1920.mp4 --codec=h264 --crf=16
npx remotion render Scoring-Square out/frames/Scoring --sequence --image-format=png --image-sequence-pattern='f-[frame].[ext]'
```

The GIF is then made from those PNG frames with Remotion's bundled ffmpeg
(`node_modules/@remotion/compositor-*/ffmpeg`): odd frames are dropped for
15 fps, frames are scaled to 800px, `palettegen` builds one palette for the
whole clip and `paletteuse` applies it. Preview stills for every clip:
`npm run stills` (writes `out/stills/`).
