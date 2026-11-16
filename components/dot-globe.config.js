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
 *   offsetX/Y   nudge in px
 *   dots        number of sample points on the sphere (only those on land are
 *               drawn); phones use dotsPhone
 *   dotSize     px; dotColor/dotOpacity per theme
 *   autoRotate, speed (degrees a second), direction (1 east, -1 west),
 *   startLon    the longitude facing the reader at load (10 = Europe/Africa,
 *               -75 = the Americas, 110 = Asia), tilt (degrees, + = north up)
 *   zoom        on/off, default, min and max (1 = the set size)
 *   arcs        on/off, count, speed (trips a second), color, thickness (px)
 *   markers     on/off, labelSize (px), cities: [name, latitude, longitude]
 *   glow        on/off, strength (0-1)
 *
 * Colours: monochrome dots; #FFEF00 (Canary Yellow) only for arcs and markers.
 */
window.CA_DOT_GLOBE_DEFAULTS = {
  placement: "right",
  layer: "behind",
  size: 0.92,
  offsetX: 0,
  offsetY: 0,

  dots: 14000,
  dotsPhone: 6000,
  dotSize: 1.6,
  dotColor: { light: "#111111", dark: "#f2f2f2" },
  dotOpacity: { light: 0.75, dark: 0.8 },

  autoRotate: true,
  speed: 6,
  direction: 1,
  startLon: 10,
  tilt: 18,

  zoom: true,
  zoomDefault: 1,
  zoomMin: 0.7,
  zoomMax: 2.4,

  arcs: true,
  arcCount: 7,
  arcSpeed: 0.28,
  arcColor: "#FFEF00",
  arcThickness: 2.2,

  markers: true,
  labelSize: 11,
  cities: [
    ["New York", 40.71, -74.01],
    ["London", 51.51, -0.13],
    ["Zurich", 47.37, 8.54],
    ["Dubai", 25.2, 55.27],
    ["Singapore", 1.35, 103.82],
    ["Hong Kong", 22.32, 114.17],
    ["Tokyo", 35.68, 139.69]
  ],

  glow: true,
  glowStrength: 0.35
};
