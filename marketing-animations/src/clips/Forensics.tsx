import React from "react";
import { useCurrentFrame } from "remotion";
import { forensics } from "../content";
import { theme } from "../theme";
import { ramp, rise } from "../components/anim";
import { Frame, STAGE } from "../components/Frame";

type Node = (typeof forensics.nodes)[number];
// Frames: nodes, then edges draw, then particles flow; the scanner traces the
// suspicious path and the callout appears.
const T = { nodes: 18, nodeStagger: 5, edges: 44, edgeStagger: 3, edgeDur: 20, flow: 58, scan: [96, 132], callout: 130 };
const PARTICLES = 3; // per edge
const SPEED = 5; // px per frame

const byId = Object.fromEntries(forensics.nodes.map((n) => [n.id, n])) as Record<string, Node>;

// Edge endpoints stop at each node's rim.
const ends = (a: Node, b: Node) => {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  return { x1: a.x + ux * a.r, y1: a.y + uy * a.r, x2: b.x - ux * b.r, y2: b.y - uy * b.r, len: len - a.r - b.r };
};

export const Forensics: React.FC = () => {
  const frame = useCurrentFrame();
  const path = forensics.suspiciousPath.map((id) => byId[id]);
  const segs = path.slice(1).map((n, i) => ends(path[i], n));
  const pathLen = segs.reduce((s, e) => s + e.len, 0);
  const scanned = ramp(frame, T.scan[0], T.scan[1]) * pathLen;
  const onPath = (from: string, to: string) =>
    forensics.suspiciousPath.some((id, i) => id === from && forensics.suspiciousPath[i + 1] === to);
  const flowIn = ramp(frame, T.flow, T.flow + 12);

  // Scanner head position along the path.
  let head = { x: segs[0].x1, y: segs[0].y1 };
  let left = scanned;
  for (const e of segs) {
    const t = Math.min(1, left / e.len);
    head = { x: e.x1 + (e.x2 - e.x1) * t, y: e.y1 + (e.y2 - e.y1) * t };
    left -= e.len;
    if (left <= 0) break;
  }
  const callout = rise(frame, T.callout, 18);
  const last = segs[segs.length - 1];
  const anchor = { x: (last.x1 + last.x2) / 2, y: (last.y1 + last.y2) / 2 };

  return (
    <Frame title={forensics.title} tagline={forensics.tagline} heading={forensics.heading}>
      <svg width={STAGE} height={STAGE} style={{ position: "absolute", inset: 0 }}>
        {/* Edges */}
        {forensics.edges.map((ed, i) => {
          const e = ends(byId[ed.from], byId[ed.to]);
          const drawn = rise(frame, T.edges + i * T.edgeStagger, T.edgeDur);
          return (
            <line key={i} x1={e.x1} y1={e.y1} x2={e.x1 + (e.x2 - e.x1) * drawn} y2={e.y1 + (e.y2 - e.y1) * drawn}
              stroke={theme.color.rule} strokeWidth={2} />
          );
        })}

        {/* Particles flowing toward the exchanges */}
        {forensics.edges.map((ed, i) => {
          const e = ends(byId[ed.from], byId[ed.to]);
          const hot = onPath(ed.from, ed.to) && frame >= T.scan[0];
          return Array.from({ length: PARTICLES }, (_, k) => {
            const t = (((frame - T.flow) * SPEED) / e.len + k / PARTICLES + i * 0.13) % 1;
            if (frame < T.flow) return null;
            const fadeEnds = Math.min(1, t / 0.1, (1 - t) / 0.1);
            return (
              <circle key={`${i}-${k}`} cx={e.x1 + (e.x2 - e.x1) * t} cy={e.y1 + (e.y2 - e.y1) * t}
                r={hot ? 5 : 4} fill={hot ? theme.color.warning : theme.color.ink} opacity={0.85 * flowIn * fadeEnds} />
            );
          });
        })}

        {/* Scanner trace along the suspicious path */}
        {frame >= T.scan[0] && (
          <>
            <polyline
              points={segs.map((e) => `${e.x1},${e.y1} ${e.x2},${e.y2}`).join(" ")}
              fill="none" stroke={theme.color.warning} strokeWidth={4} strokeLinecap="round"
              strokeDasharray={`${scanned} ${pathLen + 999}`} />
            <circle cx={head.x} cy={head.y} r={12} fill={theme.color.warning} opacity={0.25 * (1 - ramp(frame, T.scan[1], T.scan[1] + 10))} />
          </>
        )}

        {/* Nodes */}
        {forensics.nodes.map((n, i) => {
          const s = rise(frame, T.nodes + i * T.nodeStagger, 18);
          const flagged = forensics.suspiciousPath.includes(n.id) && frame >= T.scan[0] &&
            scanned >= segs.slice(0, Math.max(0, forensics.suspiciousPath.indexOf(n.id))).reduce((a, e) => a + e.len, 0);
          const stroke = flagged ? theme.color.warning : n.kind === "wallet" ? theme.color.rule : theme.color.muted;
          const common = { opacity: s, transform: `translate(${n.x}px, ${n.y}px) scale(${0.85 + 0.15 * s})` };
          return (
            <g key={n.id} style={common}>
              {n.kind === "exchange" ? (
                <rect x={-n.r} y={-n.r} width={n.r * 2} height={n.r * 2} rx={8}
                  fill={theme.color.surfaceRaised} stroke={stroke} strokeWidth={2} />
              ) : (
                <circle r={n.r} fill={n.kind === "source" ? theme.color.surfaceRaised : theme.color.ground}
                  stroke={n.kind === "source" ? theme.color.ink : stroke} strokeWidth={n.kind === "source" ? 2 : 3} />
              )}
              {n.kind === "source" && flagged && <circle r={n.r + 8} fill="none" stroke={theme.color.warning} strokeWidth={2} />}
              {n.label && (
                <text y={n.r + 38} textAnchor="middle" fontSize={theme.size.label}
                  fill={flagged ? theme.color.ink : theme.color.muted} fontFamily={theme.font.family}>
                  {n.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Leader line from the callout to the flagged hop */}
        <line x1={anchor.x} y1={anchor.y + 6} x2={anchor.x} y2={820} stroke={theme.color.warning}
          strokeWidth={2} strokeDasharray="4 6" opacity={callout} />
      </svg>

      {/* Annotation callout */}
      <div
        style={{
          position: "absolute",
          left: anchor.x - 380,
          top: 820,
          width: 520,
          padding: "22px 28px",
          borderRadius: theme.radius,
          background: theme.color.surfaceRaised,
          borderLeft: `4px solid ${theme.color.warning}`,
          opacity: callout,
          transform: `translateY(${(1 - callout) * 12}px)`,
        }}
      >
        <div style={{ fontSize: theme.size.label, color: theme.color.muted }}>{forensics.callout.title}</div>
        <div style={{ marginTop: 6, fontSize: 44, letterSpacing: "-0.01em" }}>{forensics.callout.value}</div>
        <div style={{ marginTop: 6, fontSize: theme.size.small, color: theme.color.muted }}>{forensics.callout.note}</div>
      </div>
    </Frame>
  );
};
