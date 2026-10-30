import { Easing, interpolate, spring } from "remotion";
import { theme } from "../theme";

/** 0 → 1 on the theme's no-overshoot spring, starting at `start`, settling in `duration` frames. */
export const rise = (frame: number, start: number, duration = 24) =>
  spring({
    frame: frame - start,
    fps: theme.timing.fps,
    config: theme.spring,
    durationInFrames: duration,
  });

/** Linear-in-time 0 → 1 between two frames, eased, clamped. */
export const ramp = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.33, 0, 0.2, 1),
  });

/** How visible the scene content is: hidden on the end card at both ends. */
export const sceneVisibility = (frame: number) => {
  const [a, b] = theme.timing.introOut;
  const [c, d] = theme.timing.outroIn;
  return Math.min(ramp(frame, a, b), 1 - ramp(frame, c, d));
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
