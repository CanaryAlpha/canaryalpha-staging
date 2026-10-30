/*
 * All shared styling for the clips: colours, type, spacing, motion, timing.
 * Change a value here and every clip follows.
 *
 * Colours are the website's Dark theme (demo/styles.css): black ground,
 * white ink, grey muted text and rules, green for "good". The site has no
 * accent or warning colour; `accent` is the site's white, and `warning` is
 * a red added for these clips. For the canary-yellow look, set
 * accent: "#F5C518".
 */
export const theme = {
  color: {
    ground: "#000000", // background (site --ground)
    surface: "#0d0d0d", // panels: 5% ink on ground (site's bento tile)
    surfaceRaised: "#1c1c1c", // raised panels: 11% ink on ground
    ink: "#ffffff", // main text (site --ink)
    muted: "#a3a3a3", // secondary text (site --muted)
    rule: "#4d4d4d", // lines, tracks, empty states (site --rule)
    faint: "#262626", // grid lines and quiet strokes
    accent: "#ffffff", // highlights, scan traces, bar fills
    success: "#4ade80", // checks, good deltas, positive verdict (site --success)
    warning: "#f87171", // red flags, suspicious flows
  },
  font: {
    family: '"Helvetica Neue", Helvetica, Arial, sans-serif', // site font
    numeric: "tabular-nums", // numbers don't jitter while they count
  },
  // Type sizes on the 1080 x 1080 stage (the 800px GIF shows them at 74%).
  size: {
    endTitle: 76,
    endTagline: 36,
    heading: 30, // small uppercase label at the top of each scene
    body: 32,
    label: 26,
    small: 22,
  },
  radius: 10,
  // Motion: a critically damped spring (no overshoot, nothing bounces).
  spring: { damping: 200, stiffness: 120, mass: 1 },
  // Timing shared by every clip, in frames at 30 fps.
  timing: {
    fps: 30,
    duration: 225, // 7.5 s
    introOut: [6, 18], // end card fades out (it is also the first frame)
    outroIn: [168, 180], // end card fades back in, then holds 1.5 s (45 frames)
  },
  logoHeight: 30, // logo in the corner of every frame
} as const;

export type Theme = typeof theme;
