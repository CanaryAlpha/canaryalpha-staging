"""
Builds the "Canary α Research" logo as outlined SVG paths (no font needed),
plus the favicon and PNG exports.

Sources:
  fonts/Inter[opsz,wght].ttf   "Canary" and "Research" (SIL Open Font License;
                               not committed, download it from
                               https://github.com/rsms/inter to rebuild)
  reference/alpha.png          the α, traced exactly from this picture

The α is scaled so its ink spans the round capital "C" (same overshoot top
and bottom: its top meets the cap height and it sits on the baseline), and
the ink gap either side of it equals the gap a word space leaves between
"Canary" and "Research".

Note: the site's menu bar and footer no longer use these outlines; they set
"Canary" and "Research" as live text in Satoshi (components/site-header.js,
--font-logo in demo/styles.css) around the traced α. The PNG exports here
are still the Inter version.

Run:  python3 brand/build_logo.py export   writes the files listed in export()
      python3 brand/build_logo.py header   prints the menu-bar <svg> markup
Needs fontTools and Pillow; PNGs are rendered with macOS `sips`.
"""
import io, re, sys, math, pathlib, subprocess, tempfile
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

ROOT = pathlib.Path(__file__).resolve().parent
INTER = ROOT / "fonts" / "Inter[opsz,wght].ttf"
ALPHA_IMAGE = ROOT / "reference" / "alpha.png"
TEXT_WGHT = 400   # the site name's weight
OPSZ = 14         # Inter's text optical size (the logo is mostly seen small)
NAME = "Canary Alpha Research"


def num(v):
    return str(round(v))   # whole font units: 1 unit is far below a pixel


def text_font():
    """Inter Regular, cut down to the logo's letters."""
    from fontTools import subset
    f = TTFont(INTER)
    opts = subset.Options(); opts.layout_features = ["kern"]
    sub = subset.Subsetter(opts); sub.populate(text="CanaryResearch "); sub.subset(f)
    f = instantiateVariableFont(f, {"wght": TEXT_WGHT, "opsz": OPSZ})
    buf = io.BytesIO(); f.save(buf); buf.seek(0)
    return TTFont(buf)


def glyph_of(font, ch):
    return font.getBestCmap()[ord(ch)]


def bounds(font, gname):
    gs = font.getGlyphSet(); p = BoundsPen(gs); gs[gname].draw(p); return p.bounds


def kern_pairs(font):
    """Pair kerning from GPOS (PairPos formats 1 and 2), in font units."""
    out = {}
    if "GPOS" not in font: return out
    gpos = font["GPOS"].table
    feat = [fr.Feature.LookupListIndex for fr in gpos.FeatureList.FeatureRecord if fr.FeatureTag == "kern"]
    for li in sorted({i for l in feat for i in l}):
        lk = gpos.LookupList.Lookup[li]
        for st in lk.SubTable:
            if lk.LookupType == 9: st = st.ExtSubTable
            if getattr(st, "LookupType", 2) != 2: continue
            cov = st.Coverage.glyphs
            if st.Format == 1:
                for g1, ps in zip(cov, st.PairSet):
                    for r in ps.PairValueRecord:
                        out.setdefault((g1, r.SecondGlyph), getattr(r.Value1, "XAdvance", 0) or 0)
            else:
                c1 = st.ClassDef1.classDefs; c2 = st.ClassDef2.classDefs
                for g1 in cov:
                    row = st.Class1Record[c1.get(g1, 0)].Class2Record
                    for g2, k2 in c2.items():
                        v = getattr(row[k2].Value1, "XAdvance", 0) or 0
                        if v: out.setdefault((g1, g2), v)
    return out


def word(font, text, x0, kerns):
    """Returns (svg path d, x after the word) for text starting at x0."""
    gs = font.getGlyphSet(); hmtx = font["hmtx"]; d = []; x = x0; prev = None
    for ch in text:
        g = glyph_of(font, ch)
        if prev: x += kerns.get((prev, g), 0)
        pen = SVGPathPen(gs, ntos=num)
        gs[g].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))
        d.append(pen.getCommands()); x += hmtx[g][0]; prev = g
    return " ".join(d), x


def rdp(pts, eps):
    """Drops points that stay within eps of the line through their neighbours."""
    if len(pts) < 3: return pts
    (x0, y0), (x1, y1) = pts[0], pts[-1]
    L = math.hypot(x1 - x0, y1 - y0) or 1
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs((x1 - x0) * (y0 - pts[i][1]) - (x0 - pts[i][0]) * (y1 - y0)) / L
        if d > dmax: dmax, idx = d, i
    if dmax <= eps: return [pts[0], pts[-1]]
    return rdp(pts[:idx + 1], eps)[:-1] + rdp(pts[idx:], eps)


def trace_image(path, level=0.5):
    """Outline loops of the dark shape in a picture, traced with marching
    squares at sub-pixel precision (anti-aliased edges are interpolated).
    Loops run with the ink on the right, so holes wind the other way.
    Returns loops of (x, y) in pixels, y down."""
    from PIL import Image
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    g = bg.convert("L"); W, H = g.size; px = g.load()
    v = [[0.0] * (W + 2) for _ in range(H + 2)]       # darkness, padded with blank
    for y in range(H):
        for x in range(W): v[y + 1][x + 1] = 1 - px[x, y] / 255
    def ip(a, b, pa, pb):                            # point on an edge at the level
        t = (level - a) / (b - a); return (pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t)
    SEGS = {1: ["lt"], 2: ["tr"], 3: ["lr"], 4: ["rb"], 6: ["tb"], 7: ["lb"], 8: ["bl"],
            9: ["bt"], 11: ["br"], 12: ["rl"], 13: ["rt"], 14: ["tl"]}
    nxt = {}; pts = {}
    for y in range(H + 1):
        for x in range(W + 1):
            a, b, c, d = v[y][x], v[y][x + 1], v[y + 1][x + 1], v[y + 1][x]   # tl tr br bl
            k = (a > level) | (b > level) << 1 | (c > level) << 2 | (d > level) << 3
            if k in (0, 15): continue
            E = {"t": ((x, y, "h"), lambda: ip(a, b, (x, y), (x + 1, y))),
                 "r": ((x + 1, y, "v"), lambda: ip(b, c, (x + 1, y), (x + 1, y + 1))),
                 "b": ((x, y + 1, "h"), lambda: ip(d, c, (x, y + 1), (x + 1, y + 1))),
                 "l": ((x, y, "v"), lambda: ip(a, d, (x, y), (x, y + 1)))}
            segs = SEGS.get(k)
            if k == 5: segs = ["lb", "rt"] if (a + b + c + d) / 4 > level else ["lt", "rb"]
            if k == 10: segs = ["tl", "br"] if (a + b + c + d) / 4 > level else ["tr", "bl"]
            for sg in segs:
                (k0, f0), (k1, f1) = E[sg[0]], E[sg[1]]
                pts.setdefault(k0, f0()); pts.setdefault(k1, f1()); nxt[k0] = k1
    loops = []
    while nxt:
        start, cur = next(iter(nxt.items())); loop = [pts[start]]; nxt.pop(start)
        while cur != start and cur in nxt:
            loop.append(pts[cur]); cur = nxt.pop(cur)
        if len(loop) > 8: loops.append([(x - 1, y - 1) for x, y in loop])   # skip specks
    return loops


def build():
    """The logo's outlines in Inter units, y down, baseline at y=0."""
    reg = text_font()
    kerns = kern_pairs(reg)
    cb = bounds(reg, glyph_of(reg, "C"))              # round cap: overshoots
    space = reg["hmtx"]["space"][0]

    canary, x = word(reg, "Canary", 0, kerns)
    # Even spacing: the ink gap either side of the α equals the ink gap a
    # normal word space leaves between "Canary" and "Research".
    y_g, r_g, h_g = glyph_of(reg, "y"), glyph_of(reg, "R"), glyph_of(reg, "h")
    rsb_y = reg["hmtx"][y_g][0] - bounds(reg, y_g)[2]
    lsb_r = bounds(reg, r_g)[0]
    gap = rsb_y + space + lsb_r
    ink = x - rsb_y + gap                             # where the α's ink starts

    loops = trace_image(ALPHA_IMAGE)
    pts = [p for lp in loops for p in lp]
    x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts)
    yt, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
    s = (cb[3] - cb[1]) / (y1 - yt)                   # ink spans the C's ink
    subs = []
    for lp in loops:
        q = rdp([((px - x0) * s + ink, -(cb[1] + (y1 - py) * s)) for px, py in lp], 2)
        subs.append("M" + " L".join(num(px) + " " + num(py) for px, py in q) + "Z")
    alpha_end = ink + (x1 - x0) * s

    research, x = word(reg, "Research", alpha_end + gap - lsb_r, kerns)
    post = reg["post"]
    return {
        "words": canary + " " + research, "alpha": " ".join(subs),
        "left": cb[0], "right": x - reg["hmtx"][h_g][0] + bounds(reg, h_g)[2],
        "top": -cb[3], "bottom": -bounds(reg, y_g)[1],          # C overshoot to y descender
        "cap": reg["OS/2"].sCapHeight,
        "alpha_box": (ink, -cb[3], alpha_end, -cb[1]),
        "underline": (-post.underlinePosition, post.underlineThickness),
    }


def logo_svg(v, fill="currentColor", attrs=""):
    w, h = v["right"] - v["left"], v["bottom"] - v["top"]
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s %s %s %s"%s>'
            '<path fill="%s" d="%s %s"/></svg>'
            % (num(v["left"]), num(v["top"]), num(w), num(h), attrs, fill, v["words"], v["alpha"]))


def favicon_svg(v, dark_mode=True):
    """The α alone, centred in a square; black, or white in dark mode."""
    ax0, ay0, ax1, ay1 = v["alpha_box"]
    side = max(ax1 - ax0, ay1 - ay0) * 1.08
    cx, cy = (ax0 + ax1) / 2, (ay0 + ay1) / 2
    style = ('<style>path{fill:#000}@media (prefers-color-scheme:dark){path{fill:#fff}}</style>'
             if dark_mode else "")
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s %s %s %s">%s<path d="%s"/></svg>'
            % (num(cx - side / 2), num(cy - side / 2), num(side), num(side), style, v["alpha"]))


def header_svg(v):
    """Menu-bar markup: the logo plus a hidden underline at Inter's own
    underline position, shown on hover like the text link it replaces."""
    pos, thick = v["underline"]
    rect = '<rect class="site-header__logo-underline" x="%s" y="%s" width="%s" height="%s"/>' % (
        num(v["left"]), num(pos - thick / 2), num(v["right"] - v["left"]), num(thick))
    svg = logo_svg(v, attrs=' class="site-header__logo" aria-hidden="true" focusable="false"')
    return svg.replace(' xmlns="http://www.w3.org/2000/svg"', "").replace("</svg>", rect + "</svg>")


def png(svg, path, width):
    """Renders an SVG to a transparent PNG with macOS sips."""
    m = re.search(r'viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"', svg)
    w, h = float(m.group(3)), float(m.group(4))
    sized = svg.replace("<svg ", '<svg width="%d" height="%d" ' % (width, round(width * h / w)), 1)
    with tempfile.NamedTemporaryFile("w", suffix=".svg", delete=False) as t:
        t.write(sized)
    subprocess.run(["sips", "-s", "format", "png", t.name, "--out", str(path)],
                   check=True, capture_output=True)


def export():
    v = build()
    label = ' role="img" aria-label="%s"' % NAME
    (ROOT / "logo.svg").write_text(logo_svg(v, attrs=label) + "\n")
    (ROOT / "logo-dark.svg").write_text(logo_svg(v, fill="#fff", attrs=label) + "\n")
    (ROOT / "favicon.svg").write_text(favicon_svg(v) + "\n")
    for width in (512, 1024):
        png(logo_svg(v, fill="#000"), ROOT / ("logo-%d.png" % width), width)
        png(logo_svg(v, fill="#fff"), ROOT / ("logo-dark-%d.png" % width), width)
        png(favicon_svg(v, dark_mode=False), ROOT / ("favicon-%d.png" % width), width)
    return v


if __name__ == "__main__":
    if sys.argv[1:] == ["header"]:
        print(header_svg(build()))
    else:
        v = export()
        print("height/cap = %.4f, width/height = %.4f" % (
            (v["bottom"] - v["top"]) / v["cap"], (v["right"] - v["left"]) / (v["bottom"] - v["top"])))
