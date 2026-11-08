#!/usr/bin/env python3
"""Builds the globe demo's textures (globe-demo/textures/) from NASA imagery.

  python3 tools/globe-textures.py <downloads dir> [--out globe-demo/textures]

Needs Pillow and numpy (a venv is fine). The downloads dir holds the four
source images below, fetched by hand from NASA (eoimages.gsfc.nasa.gov was
unreachable in November 2026; NASA now serves the same files from
assets.science.nasa.gov):

  world.topo.bathy.200408.3x5400x2700.jpg
      Blue Marble: Next Generation with Topography and Bathymetry, August
      2004, 5400x2700. NASA Earth Observatory (Reto Stockli, NASA GSFC).
      https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/august/world.topo.bathy.200408.3x5400x2700.jpg
      (page: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/)
  gebco_08_rev_elev_5400x2700.jpg
      Topography (land elevation, sea level black), 5400x2700, from the
      GEBCO_08 grid, rendered by NASA Earth Observatory (Jesse Allen).
      https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/topography/gebco_08_rev_elev_5400x2700.jpg
      (page: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/topography-bathymetry-maps)
  cloud_combined_2048.jpg
      Blue Marble (2002) cloud cover, 2048x1024, NASA GSFC (Reto Stockli,
      Robert Simmon; MODIS).
      https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/bluemarble/images/cloud_combined_2048.jpg
  blackmarble-gibs-2048.jpg
      Black Marble 2016 night lights (Suomi NPP VIIRS), 2048x1024, rendered
      by NASA GIBS (layer VIIRS_Black_Marble):
      https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=VIIRS_Black_Marble&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH=2048&HEIGHT=1024&FORMAT=image/jpeg

Licence: NASA imagery is in the public domain (not copyrighted; NASA's media
usage guidelines ask for a credit, which the page gives). The elevation map
derives from the GEBCO_08 grid, which GEBCO publishes for free use with
the credit "Imagery reproduced from the GEBCO_08 Grid, www.gebco.net".

Outputs (all greyscale, lossy WebP, equirectangular, 2:1; the 1024 set is
for phones):
  earth-2048.webp, earth-1024.webp    land and ocean tones
  elev-2048.webp, elev-1024.webp      0 = ocean; 24..255 = land elevation
                                      (gamma 0.55 to lift low relief)
  clouds-2048.webp, clouds-1024.webp  cloud cover (white on black)
  night-1024.webp                     city lights (white on black)
  poster-1200.webp, poster-1200.png   a lit, shaded view of the globe with a
                                      transparent background: the poster
                                      while WebGL loads, and the still image
                                      when WebGL is unavailable
"""
import argparse, os, sys
import numpy as np
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None

SOURCES = {
    "day": "world.topo.bathy.200408.3x5400x2700.jpg",
    "elev": "gebco_08_rev_elev_5400x2700.jpg",
    "clouds": "cloud_combined_2048.jpg",
    "night": "blackmarble-gibs-2048.jpg",
}


def load(dirpath, name, mode):
    p = os.path.join(dirpath, SOURCES[name])
    if not os.path.isfile(p):
        sys.exit("globe-textures: missing %s (see the docstring for where it comes from)" % p)
    return Image.open(p).convert(mode)


def to_float(img):
    return np.asarray(img, dtype=np.float32) / 255.0


def to_image(arr):
    return Image.fromarray(np.clip(arr * 255.0 + 0.5, 0, 255).astype(np.uint8), "L")


def save_sizes(img, out, stem, sizes, quality):
    for w in sizes:
        im = img if img.width == w else img.resize((w, w // 2), Image.LANCZOS)
        path = os.path.join(out, "%s-%d.webp" % (stem, w))
        im.save(path, "WEBP", quality=quality, method=6)
        print("  %-18s %5d KB" % (os.path.basename(path), os.path.getsize(path) // 1024))


def build(downloads, out):
    os.makedirs(out, exist_ok=True)
    print("globe-textures: reading sources")
    day_rgb = to_float(load(downloads, "day", "RGB"))
    elev_raw = to_float(load(downloads, "elev", "L"))
    r, g, b = day_rgb[..., 0], day_rgb[..., 1], day_rgb[..., 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b

    # Ocean mask: blue-dominant and dark in the colour image (sea ice stays
    # land: it is near-white), and at sea level in the elevation map.
    blue = (b > r * 1.12) & (b > g * 1.02) & (lum < 0.5)
    ocean = blue & (elev_raw < 0.03)
    ocean_img = Image.fromarray((ocean * 255).astype(np.uint8), "L").filter(ImageFilter.MedianFilter(5))
    ocean_f = to_float(ocean_img)

    # Day texture: land gets most of the grey range; the ocean keeps its
    # bathymetry shading in a narrower band. The shader darkens oceans
    # further and adds the highlight.
    land_tone = np.clip((lum - 0.08) / 0.62, 0, 1) ** 0.9
    land_tone = 0.3 + 0.7 * land_tone
    sea_tone = 0.42 + 0.3 * np.clip((lum - 0.04) / 0.4, 0, 1)
    day = land_tone * (1 - ocean_f) + sea_tone * ocean_f
    print("  day texture")
    save_sizes(to_image(day), out, "earth", (2048, 1024), 82)

    # Elevation: 0 = ocean, 24..255 = land, with low relief lifted.
    e = np.clip(elev_raw, 0, 1) ** 0.55
    elev = (24.0 / 255.0 + (231.0 / 255.0) * e) * (1 - ocean_f)
    print("  elevation")
    save_sizes(to_image(elev), out, "elev", (2048, 1024), 85)

    # Clouds: lift the mid-tones a little.
    c = to_float(load(downloads, "clouds", "L"))
    c = np.clip((c - 0.06) / 0.9, 0, 1) ** 0.9
    print("  clouds")
    save_sizes(to_image(c), out, "clouds", (2048, 1024), 70)

    # Night lights: greyscale, noise floor cut, bright cores kept.
    n = to_float(load(downloads, "night", "L"))
    n = np.clip((n - 0.05) * 1.7, 0, 1) ** 0.8
    print("  night lights")
    save_sizes(to_image(n), out, "night", (1024,), 75)

    print("  poster")
    poster(day, elev, c, out)


def poster(day, elev, clouds, out, size=1200):
    """An orthographic, lit view matching the page's opening camera."""
    lon0, lat0 = np.radians(20.0), np.radians(18.0)
    s = size
    y, x = np.mgrid[0:s, 0:s]
    px = (x + 0.5) / s * 2 - 1
    py = 1 - (y + 0.5) / s * 2
    scale = 1.0 / 0.82          # planet radius in the frame, leaving room for the glow
    px, py = px * scale, py * scale
    rr = px * px + py * py
    inside = rr <= 1.0
    pz = np.sqrt(np.clip(1 - rr, 0, 1))
    # Camera frame -> world: rotate by lat0 about x, then lon0 about y.
    cx, sx = np.cos(lat0), np.sin(lat0)
    y1 = py * cx - pz * sx
    z1 = py * sx + pz * cx
    cy, sy = np.cos(lon0), np.sin(lon0)
    wx = px * cy + z1 * sy
    wz = -px * sy + z1 * cy
    wy = y1
    lon = np.arctan2(wx, wz)
    lat = np.arcsin(np.clip(wy, -1, 1))
    H, W = day.shape
    u = ((lon / (2 * np.pi) + 0.5) * W).astype(int) % W
    v = np.clip(((0.5 - lat / np.pi) * H).astype(int), 0, H - 1)
    d = day[v, u]
    e = elev[v, u]
    Hc, Wc = clouds.shape
    uc = ((lon / (2 * np.pi) + 0.5) * Wc).astype(int) % Wc
    vc = np.clip(((0.5 - lat / np.pi) * Hc).astype(int), 0, Hc - 1)
    cl = clouds[vc, uc]
    ocean = e < 0.04
    sun = np.array([0.62, 0.42, 0.66]); sun /= np.linalg.norm(sun)
    ndl = px * sun[0] + py * sun[1] + pz * sun[2]
    lit = np.clip((ndl + 0.12) / 0.47, 0, 1); lit = lit * lit * (3 - 2 * lit)
    diffuse = np.clip(ndl, 0, 1)
    land = d * (0.55 + 0.75 * diffuse)
    sea = d * 0.42 * (0.45 + 0.8 * diffuse)
    surf = np.where(ocean, sea, land)
    cloud_a = np.clip((cl - 0.12) / 0.73, 0, 1) * 0.92
    surf = surf * (1 - 0.45 * cloud_a) * (1 - cloud_a) + (0.55 + 0.45 * diffuse) * 0.95 * cloud_a
    col = 0.05 * (1 - lit) + surf * lit
    rim = (1 - pz) ** 3.5 * 0.35 * (0.3 + 0.7 * lit)
    col = np.clip(col + rim, 0, 1)
    # Glow outside the disc, fading with distance from the edge.
    rdist = np.sqrt(rr)
    glow = np.exp(-(rdist - 1) * 14.0) * (rdist > 1)
    nx, ny = px / np.maximum(rdist, 1e-6), py / np.maximum(rdist, 1e-6)
    glow_lit = np.clip((nx * sun[0] + ny * sun[1] + 0.35) / 0.8, 0, 1)
    glow *= 0.25 + 0.75 * glow_lit
    rgb = np.zeros((s, s, 4), dtype=np.float32)
    rgb[..., 0] = rgb[..., 1] = rgb[..., 2] = np.where(inside, col, 0.8)
    rgb[..., 3] = np.where(inside, 1.0, np.clip(glow, 0, 1))
    img = Image.fromarray(np.clip(rgb * 255 + 0.5, 0, 255).astype(np.uint8), "RGBA")
    p = os.path.join(out, "poster-1200.webp"); img.save(p, "WEBP", quality=82, method=6)
    print("  %-18s %5d KB" % (os.path.basename(p), os.path.getsize(p) // 1024))
    p = os.path.join(out, "poster-1200.png"); img.save(p, "PNG", optimize=True)
    print("  %-18s %5d KB" % (os.path.basename(p), os.path.getsize(p) // 1024))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("downloads")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "globe-demo", "textures"))
    a = ap.parse_args()
    build(a.downloads, a.out)


if __name__ == "__main__":
    main()
