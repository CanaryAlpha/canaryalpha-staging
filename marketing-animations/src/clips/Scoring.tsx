import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { scoring } from "../content";
import { theme } from "../theme";
import { ramp, rise } from "../components/anim";
import { Frame } from "../components/Frame";

const LEFT = 64;
const WIDTH = 952;
const ROW_TOP = 180;
const ROW_H = 96;
// Frames: rows appear, then bars fill one after another, then the verdict.
const T = { rowsIn: 20, rowStagger: 4, fillStart: 34, fillStagger: 14, fillDur: 22 };

export const Scoring: React.FC = () => {
  const frame = useCurrentFrame();
  const cats = scoring.categories;
  const max = cats.reduce((s, c) => s + c.weight, 0);
  const maxWeight = Math.max(...cats.map((c) => c.weight));
  const fills = cats.map((_, i) => rise(frame, T.fillStart + i * T.fillStagger, T.fillDur));
  const total = cats.reduce((s, c, i) => s + c.score * fills[i], 0);
  const verdictAt = T.fillStart + (cats.length - 1) * T.fillStagger + T.fillDur + 6;
  const stamp = ramp(frame, verdictAt, verdictAt + 8);
  const tone = theme.color[scoring.verdictTone];

  return (
    <Frame title={scoring.title} tagline={scoring.tagline} heading={scoring.heading}>
      {cats.map((c, i) => {
        const shown = rise(frame, T.rowsIn + i * T.rowStagger, 18);
        const track = (c.weight / maxWeight) * WIDTH;
        const pts = c.score * fills[i];
        return (
          <div
            key={c.name}
            style={{
              position: "absolute",
              left: LEFT,
              top: ROW_TOP + i * ROW_H,
              width: WIDTH,
              opacity: shown,
              transform: `translateY(${(1 - shown) * 10}px)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", fontSize: theme.size.body }}>
              <span>{c.name}</span>
              <span style={{ marginLeft: 16, fontSize: theme.size.small, color: theme.color.muted }}>
                weight {c.weight}
              </span>
              <span style={{ marginLeft: "auto" }}>
                {Math.round(pts)}
                <span style={{ color: theme.color.muted }}> / {c.weight}</span>
              </span>
            </div>
            <div
              style={{
                marginTop: 14,
                width: track,
                height: 10,
                borderRadius: 5,
                background: theme.color.faint,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(c.score / c.weight) * 100 * fills[i]}%`,
                  height: "100%",
                  borderRadius: 5,
                  background: theme.color.accent,
                }}
              />
            </div>
          </div>
        );
      })}

      {/* Running total and verdict */}
      <div
        style={{
          position: "absolute",
          left: LEFT,
          right: LEFT,
          top: 790,
          paddingTop: 36,
          borderTop: `1px solid ${theme.color.rule}`,
          display: "flex",
          alignItems: "flex-end",
          opacity: rise(frame, T.rowsIn + 10, 18),
        }}
      >
        <div>
          <div style={{ fontSize: theme.size.small, letterSpacing: "0.12em", textTransform: "uppercase", color: theme.color.muted }}>
            Total score
          </div>
          <div style={{ marginTop: 8, fontSize: 112, lineHeight: 1, letterSpacing: "-0.02em" }}>
            {Math.round(total)}
            <span style={{ fontSize: 56, color: theme.color.muted }}> / {max}</span>
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            marginBottom: 8,
            padding: "18px 30px",
            border: `2px solid ${tone}`,
            borderRadius: theme.radius,
            color: tone,
            fontSize: 40,
            letterSpacing: "0.1em",
            opacity: stamp,
            transform: `scale(${interpolate(stamp, [0, 1], [1.12, 1])})`,
            transformOrigin: "right bottom",
          }}
        >
          {scoring.verdict}
        </div>
      </div>
    </Frame>
  );
};
