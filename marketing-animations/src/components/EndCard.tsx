import React from "react";
import { useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { sceneVisibility } from "./anim";

/**
 * Feature title + one-line tagline. Fully visible on the first frame and
 * through the last 1.5 s, so each clip loops on an identical frame.
 */
export const EndCard: React.FC<{ title: string; tagline: string }> = ({ title, tagline }) => {
  const frame = useCurrentFrame();
  const shown = 1 - sceneVisibility(frame);
  const drift = (1 - shown) * 12; // settles upward into place
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 64px",
        opacity: shown,
        transform: `translateY(${drift}px)`,
      }}
    >
      <div style={{ width: 64, height: 2, background: theme.color.accent, marginBottom: 40 }} />
      <div
        style={{
          fontSize: theme.size.endTitle,
          lineHeight: 1.08,
          letterSpacing: "-0.015em",
          color: theme.color.ink,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 28,
          fontSize: theme.size.endTagline,
          lineHeight: 1.35,
          color: theme.color.muted,
          maxWidth: 820,
        }}
      >
        {tagline}
      </div>
    </div>
  );
};
