import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { sceneVisibility } from "./anim";
import { EndCard } from "./EndCard";

export const STAGE = 1080;

/**
 * Every clip draws on a 1080 x 1080 stage. Square videos show it as is; the
 * vertical 1080 x 1920 version centres it, leaving the top and bottom bands
 * clear for the app's own captions and buttons.
 *
 * The logo stays in the corner throughout; the scene (children) fades in
 * after the opening end card and out before the closing one.
 */
export const Frame: React.FC<{
  title: string;
  tagline: string;
  heading: string;
  children: React.ReactNode;
}> = ({ title, tagline, heading, children }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const stageTop = (height - STAGE) / 2;
  const visible = sceneVisibility(frame);
  return (
    <AbsoluteFill
      style={{
        background: theme.color.ground,
        fontFamily: theme.font.family,
        fontVariantNumeric: theme.font.numeric,
        color: theme.color.ink,
      }}
    >
      {/* Vertical only: the logo, then the feature title (during the scene) in
          the top band, below the area social apps cover with their own buttons. */}
      {vertical && (
        <Img
          src={staticFile("logo.svg")}
          style={{ position: "absolute", left: 64, top: stageTop - 180, height: theme.logoHeight }}
        />
      )}
      {vertical && (
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            bottom: height - stageTop + 24,
            fontSize: theme.size.endTitle * 0.74,
            lineHeight: 1.1,
            letterSpacing: "-0.015em",
            opacity: visible,
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: stageTop,
          width: STAGE,
          height: STAGE,
          overflow: "hidden",
        }}
      >
        {!vertical && (
          <Img
            src={staticFile("logo.svg")}
            style={{ position: "absolute", left: 64, top: 64, height: theme.logoHeight }}
          />
        )}
        <div
          style={{
            position: "absolute",
            right: 64,
            top: 64,
            height: theme.logoHeight,
            display: "flex",
            alignItems: "center",
            fontSize: theme.size.small,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: theme.color.muted,
            opacity: visible,
          }}
        >
          {heading}
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: visible }}>{children}</div>
        <EndCard title={title} tagline={tagline} />
      </div>
    </AbsoluteFill>
  );
};
