import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { revisit } from "../content";
import { theme } from "../theme";
import { lerp, ramp, rise } from "../components/anim";
import { Frame } from "../components/Frame";

const CARD = { w: 460, h: 500, top: 140 };
// Q2 starts centred and ends on the left; Q3 ends on the right, side by side.
const X = { centre: (1080 - CARD.w) / 2, left: 64, right: 1016 - CARD.w, offstage: 1120 };
// Frames: Q2 card shows, slides left and dims as Q3 slides in; deltas
// highlight, then the "What changed" summary.
const T = { q2In: 16, swap: [50, 84] as const, q3: [56, 88] as const, deltas: 94, deltaStagger: 8, changed: 120, changedStagger: 7 };

const tint = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const Card: React.FC<{ label: string; side: "before" | "after"; frame: number }> = ({ label, side, frame }) => (
  <div style={{
    width: CARD.w, height: CARD.h, boxSizing: "border-box", padding: "34px 36px",
    borderRadius: theme.radius + 4, background: theme.color.surfaceRaised, border: `1px solid ${theme.color.rule}`,
  }}>
    <div style={{ fontSize: theme.size.small, letterSpacing: "0.12em", textTransform: "uppercase", color: theme.color.muted }}>{label}</div>
    <div style={{ marginTop: 10, fontSize: 38, letterSpacing: "-0.01em" }}>{revisit.asset}</div>
    <div style={{ marginTop: 26 }}>
      {revisit.metrics.map((m, i) => {
        const changed = side === "after" && m.delta !== "";
        const hl = changed ? rise(frame, T.deltas + i * T.deltaStagger, 14) : 0;
        return (
          <div key={m.name} style={{
            display: "flex", alignItems: "center", height: 76, margin: "0 -14px", padding: "0 14px",
            borderTop: `1px solid ${theme.color.faint}`, borderRadius: 6, background: tint(theme.color.success, 0.09 * hl),
          }}>
            <span style={{ fontSize: theme.size.label, color: theme.color.muted }}>{m.name}</span>
            <span style={{ marginLeft: "auto", textAlign: "right" }}>
              <span style={{ display: "block", fontSize: 30 }}>{side === "after" ? m.after : m.before}</span>
              {changed && (
                // Expands in as it appears, so the value stays centred in its row until then.
                <span style={{ display: "block", overflow: "hidden", maxHeight: 30 * hl, marginTop: 2 * hl, fontSize: theme.size.small, color: theme.color.success, opacity: hl }}>
                  {m.delta}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

export const Revisit: React.FC = () => {
  const frame = useCurrentFrame();
  const q2Shown = rise(frame, T.q2In, 18);
  const swap = ramp(frame, T.swap[0], T.swap[1]);
  const q3 = ramp(frame, T.q3[0], T.q3[1]);
  const quarters = revisit.timeline;
  const from = quarters.indexOf(revisit.previous.quarter);
  const to = quarters.indexOf(revisit.current.quarter);
  const markerPos = lerp(from, to, ramp(frame, T.q3[0], T.q3[1]));
  const lineL = 64, lineW = 952, tlTop = 960;
  const qx = (i: number) => lineL + 40 + ((lineW - 80) * i) / (quarters.length - 1);

  return (
    <Frame title={revisit.title} tagline={revisit.tagline} heading={revisit.heading}>
      {/* Q2: centred, then slides left and dims behind Q3 */}
      <div style={{
        position: "absolute", top: CARD.top, left: lerp(X.centre, X.left, swap),
        opacity: q2Shown * interpolate(swap, [0, 1], [1, 0.4]),
      }}>
        <Card label={revisit.previous.label} side="before" frame={frame} />
      </div>
      {/* Q3: slides in from the right */}
      <div style={{
        position: "absolute", top: CARD.top, left: lerp(X.offstage, X.right, q3), opacity: q3,
      }}>
        <Card label={revisit.current.label} side="after" frame={frame} />
      </div>

      {/* What changed */}
      <div style={{ position: "absolute", left: 64, top: 680, width: 952 }}>
        <div style={{
          fontSize: theme.size.small, letterSpacing: "0.12em", textTransform: "uppercase", color: theme.color.muted,
          opacity: rise(frame, T.changed, 14),
        }}>What changed</div>
        {revisit.whatChanged.map((line, i) => {
          const s = rise(frame, T.changed + 6 + i * T.changedStagger, 16);
          return (
            <div key={line} style={{
              marginTop: i ? 12 : 18, display: "flex", alignItems: "baseline", fontSize: theme.size.body,
              opacity: s, transform: `translateY(${(1 - s) * 8}px)`,
            }}>
              <span style={{ width: 34, flex: "none", color: theme.color.success }}>+</span>{line}
            </div>
          );
        })}
      </div>

      {/* Quarter timeline */}
      <svg width={1080} height={1080} style={{ position: "absolute", inset: 0, opacity: rise(frame, T.q2In + 4, 18) }}>
        <line x1={qx(0)} x2={qx(quarters.length - 1)} y1={tlTop} y2={tlTop} stroke={theme.color.rule} strokeWidth={2} />
        <line x1={qx(0)} x2={qx(0) + (qx(1) - qx(0)) * markerPos} y1={tlTop} y2={tlTop} stroke={theme.color.ink} strokeWidth={2} />
        {quarters.map((q, i) => {
          const reached = i <= markerPos + 0.001;
          return (
            <g key={q}>
              <circle cx={qx(i)} cy={tlTop} r={7} fill={reached ? theme.color.ink : theme.color.ground}
                stroke={reached ? theme.color.ink : theme.color.rule} strokeWidth={2} />
              <text x={qx(i)} y={tlTop + 44} textAnchor="middle" fontSize={theme.size.label}
                fill={Math.abs(i - markerPos) < 0.5 ? theme.color.ink : theme.color.muted} fontFamily={theme.font.family}>{q}</text>
            </g>
          );
        })}
        <circle cx={qx(0) + (qx(1) - qx(0)) * markerPos} cy={tlTop} r={14} fill="none" stroke={theme.color.ink} strokeWidth={2} />
      </svg>
    </Frame>
  );
};
