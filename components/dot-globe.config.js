/*
 * Dot globe settings (components/dot-globe.js): the homepage hero's globe.
 * Every value here is a default; the design panel (?design=1,
 * components/design-panels.js) can change them live and copy them out, and
 * copied settings are made permanent by editing this file.
 *
 *   placement   where the globe sits in the hero: "left" | "center" | "right"
 *   layer       "behind" (the text sits over it) or "beside" (kept to the
 *               side of the headline on desktop)
 *   size        globe diameter as a share of the hero's free height (0.3-1.4)
 *   offsetX/Y   nudge in px, desktop (1100px+) only; below that the globe
 *               stays centred in its own row
 *   dots        number of sample points on the sphere (only those on land are
 *               drawn); phones use dotsPhone
 *   dotSize     px; dotColor/dotOpacity per theme
 *   autoRotate, speed (degrees a second), direction (1 east, -1 west),
 *   startLon    the longitude facing the reader at load (10 = Europe/Africa,
 *               -75 = the Americas, 110 = Asia), tilt (degrees, + = north up)
 *   glow        on/off, strength (0-1)
 *
 * Values chosen with the design panel on 2026-11-16.
 * The globe has a fixed size: it doesn't zoom. Colours: monochrome dots.
 */
window.CA_DOT_GLOBE_DEFAULTS = {
  placement: "center",
  layer: "behind",
  size: 0.85,
  offsetX: 381,
  offsetY: 0,

  dots: 40000,
  dotsPhone: 15000,
  dotSize: 3,
  dotColor: { light: "#111111", dark: "#f2f2f2" },
  dotOpacity: { light: 0.75, dark: 0.8 },

  autoRotate: true,
  speed: 12.5,
  direction: 1,
  startLon: -74,
  tilt: 0,

  glow: true,
  glowStrength: 0.5
};
