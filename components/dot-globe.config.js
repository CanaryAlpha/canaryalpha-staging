/*
 * Dot globe settings (components/dot-globe.js): the homepage hero's globe.
 * Every value here is a default; the design panel (?design=1,
 * components/design-panels.js) can change them live and copy them out, and
 * copied settings are made permanent by editing this file.
 *
 *   devices     placement for each screen size, chosen by window width:
 *               desktop 1100px and wider, tablet 600-1099px, phone under
 *               600px (the same breakpoints as the hero's layout). Each has:
 *     visible     false hides the globe on that screen size
 *     size        diameter as a % of the hero's width, never more than
 *     maxSize     px; on desktop also never taller than the hero's area
 *     x, offsetX  "left" | "center" | "right", then a nudge in px
 *     y, offsetY  "top" | "middle" | "bottom", then a nudge in px
 *     layer       "behind" (the text sits over it) or "beside": on desktop kept to the side of the headline
 *                 (left or right only); on tablet and phone its own row
 *                 between the headline and the buttons
 *   dots        sample points on the sphere (only those on land are drawn)
 *               for a globe 720px across; other sizes scale it by area so
 *               the dots are as far apart on every screen size
 *   dotsPhone   the most a phone draws, for speed
 *   dotSize     px; dotColor/dotOpacity per theme
 *   autoRotate, speed (degrees a second), direction (1 east, -1 west),
 *   startLon    the longitude facing the reader at load (10 = Europe/Africa,
 *               -75 = the Americas, 110 = Asia), tilt (degrees, + = north up)
 *   textDim     how strongly dots show under the headline, the subheading
 *               and the buttons (0 none, 1 no dimming), so the text stays
 *               readable over the globe: 0.2 keeps the secondary text above
 *               WCAG AA (4.5:1) in light and dark
 *
 * Values chosen with the design panel on 2026-11-16.
 * The globe has a fixed size: it doesn't zoom. Colours: monochrome dots
 * on a transparent canvas, with no glow, ring or box behind the globe
 * (the glow setting was removed on 2026-11-17).
 */
window.CA_DOT_GLOBE_DEFAULTS = {
  // Chosen with the design panel and the device simulator (2026-11-17).
  devices: {
    desktop: { visible: true, size: 50, maxSize: 1000, x: "center", offsetX: 0, y: "middle", offsetY: 0, layer: "beside" },
    tablet: { visible: true, size: 75, maxSize: 1000, x: "center", offsetX: 0, y: "middle", offsetY: 0, layer: "beside" },
    phone: { visible: true, size: 100, maxSize: 340, x: "center", offsetX: 0, y: "middle", offsetY: 0, layer: "beside" }
  },

  dots: 40000,
  dotsPhone: 15000,
  dotSize: 2.5,
  dotColor: { light: "#111111", dark: "#f2f2f2" },
  dotOpacity: { light: 0.75, dark: 0.8 },

  autoRotate: true,
  speed: 12.5,
  direction: 1,
  startLon: -74,
  tilt: 0,

  textDim: 0.2
};
