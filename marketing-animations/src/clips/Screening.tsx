import React from "react";
import { useCurrentFrame } from "remotion";
import { screening } from "../content";
import { theme } from "../theme";
import { ramp, rise } from "../components/anim";
import { Frame } from "../components/Frame";

const LEFT = 64;
const WIDTH = 952;
const ROW_TOP = 150;
const ROW_H = 70;
// Frames: rows appear, then resolve one by one; the chart builds alongside.
const T = { rows: 16, rowStagger: 4, resolve: 30, resolveStagger: 15, chart: 44, line: [58, 140], bars: 62, barStagger: 6 };
const CHART = { top: 618, height: 398, pad: 32 };

const Check: React.FC = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={theme.color.ground} strokeWidth={3.2}
    strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
const Flag: React.FC = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={theme.color.ground} strokeWidth={2.6}
    strokeLinecap="round" strokeLinejoin="round"><path d="M7 21V3.5" /><path d="M7 4.5L19 9L7 13.5Z" fill={theme.color.ground} /></svg>
);

export const Screening: React.FC = () => {
  const frame = useCurrentFrame();
  const { chart } = screening;
  const pulse = 0.5 + 0.5 * Math.sin((frame / 30) * Math.PI * 1.6); // ~0.8 Hz, subtle

  // Chart geometry
  const plotL = LEFT + CHART.pad, plotW = WIDTH - CHART.pad * 2;
  const priceTop = CHART.top + 124, priceH = 110;
  const barsTop = priceTop + priceH + 52, barsH = 78;
  const n = chart.price.length;
  const barW = (plotW / n) * 0.62;
  // Bar centres (and the price points above them) stay inside the plot.
  const px = (i: number) => plotL + barW / 2 + ((plotW - barW) * i) / (n - 1);
  const linePath = chart.price.map((v, i) => `${i ? "L" : "M"}${px(i)},${priceTop + priceH * (1 - v)}`).join(" ");
  const drawn = ramp(frame, T.line[0], T.line[1]);
  const tip = Math.min(n - 1, drawn * (n - 1));
  const tipI = Math.floor(tip), tipF = tip - tipI;
  const tipV = chart.price[tipI] + ((chart.price[Math.min(n - 1, tipI + 1)] ?? 0) - chart.price[tipI]) * tipF;
  const sellFlagAt = T.resolve + (screening.items.length - 1) * T.resolveStagger;
  const insight = rise(frame, sellFlagAt + 8, 18);

  return (
    <Frame title={screening.title} tagline={screening.tagline} heading={screening.heading}>
      {screening.items.map((item, i) => {
        const shown = rise(frame, T.rows + i * T.rowStagger, 16);
        const done = rise(frame, T.resolve + i * T.resolveStagger, 12);
        const flag = item.status === "flag";
        const tone = flag ? theme.color.warning : theme.color.success;
        return (
          <div key={item.label} style={{
            position: "absolute", left: LEFT, top: ROW_TOP + i * ROW_H, width: WIDTH, height: ROW_H,
            display: "flex", alignItems: "center", borderBottom: `1px solid ${theme.color.faint}`,
            opacity: shown, transform: `translateY(${(1 - shown) * 8}px)`,
          }}>
            <div style={{ position: "relative", width: 40, height: 40, flex: "none" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${theme.color.rule}`, opacity: 1 - done }} />
              {flag && done > 0.99 && (
                <div style={{ position: "absolute", inset: -7, borderRadius: "50%", border: `2px solid ${tone}`, opacity: 0.15 + 0.35 * pulse }} />
              )}
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%", background: tone,
                display: "grid", placeItems: "center", opacity: done, transform: `scale(${0.6 + 0.4 * done})`,
              }}>
                {flag ? <Flag /> : <Check />}
              </div>
            </div>
            <div style={{ marginLeft: 24, fontSize: theme.size.body, color: done > 0.5 ? theme.color.ink : theme.color.muted }}>
              {item.label}
            </div>
            <div style={{ marginLeft: "auto", fontSize: theme.size.label, color: tone, opacity: done }}>
              {flag ? "Flagged" : "Clear"}
            </div>
          </div>
        );
      })}

      {/* Split mini-chart: price rising while sell volume grows underneath */}
      <div style={{
        position: "absolute", left: LEFT, top: CHART.top, width: WIDTH, height: CHART.height,
        borderRadius: theme.radius, background: theme.color.surface, border: `1px solid ${theme.color.faint}`,
        opacity: rise(frame, T.chart, 18),
      }}>
        <div style={{ position: "absolute", left: CHART.pad, top: 26, display: "flex", alignItems: "center", fontSize: theme.size.label }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: theme.color.warning, marginRight: 14, opacity: 0.4 + 0.6 * insight }} />
          {chart.title}
        </div>
        <div style={{ position: "absolute", right: CHART.pad, top: 28, fontSize: theme.size.small, color: theme.color.warning, opacity: insight }}>
          Price up, sells up
        </div>
      </div>
      <svg width={1080} height={1080} style={{ position: "absolute", inset: 0, opacity: rise(frame, T.chart, 18) }}>
        <text x={plotL} y={priceTop - 14} fontSize={theme.size.small} fill={theme.color.muted} fontFamily={theme.font.family}>{chart.priceLabel} ▲</text>
        <line x1={plotL} x2={plotL + plotW} y1={priceTop + priceH} y2={priceTop + priceH} stroke={theme.color.faint} strokeWidth={1} />
        <clipPath id="price-reveal"><rect x={plotL - 8} y={priceTop - 20} width={8 + barW / 2 + drawn * (plotW - barW)} height={priceH + 40} /></clipPath>
        <path d={linePath} fill="none" stroke={theme.color.accent} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round"
          clipPath="url(#price-reveal)" />
        {drawn > 0 && <circle cx={px(tip)} cy={priceTop + priceH * (1 - tipV)} r={7} fill={theme.color.accent} />}

        <text x={plotL} y={barsTop - 14} fontSize={theme.size.small} fill={theme.color.muted} fontFamily={theme.font.family}>{chart.volumeLabel} ▲</text>
        {chart.sellVolume.map((v, i) => {
          const g = rise(frame, T.bars + i * T.barStagger, 16);
          const h = barsH * v * g;
          return <rect key={i} x={px(i) - barW / 2} y={barsTop + barsH - h} width={barW} height={h} rx={3}
            fill={theme.color.warning} opacity={0.45 + 0.55 * (i / (n - 1))} />;
        })}
        <line x1={plotL} x2={plotL + plotW} y1={barsTop + barsH} y2={barsTop + barsH} stroke={theme.color.faint} strokeWidth={1} />
      </svg>
    </Frame>
  );
};
