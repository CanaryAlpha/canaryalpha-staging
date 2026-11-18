"""Local helper for tools/og-image/card.html: serves the repo root on
localhost:8792 and saves the PNG the page posts to /save?name=<file>.png
into og/. Optimises it with Pillow (palette PNG) when that is smaller.

Run from anywhere:  python3 tools/og-image/serve.py
"""
import http.server, io, pathlib, re, urllib.parse
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "og"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def do_POST(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        name = (q.get("name") or [""])[0]
        if not self.path.startswith("/save") or not re.fullmatch(r"[a-z0-9-]+\.png", name):
            self.send_error(400, "bad request"); return
        data = self.rfile.read(int(self.headers["Content-Length"]))
        img = Image.open(io.BytesIO(data)).convert("RGB")
        if img.size != (1200, 630):
            self.send_error(400, "expected 1200x630"); return
        full = io.BytesIO(); img.save(full, "PNG", optimize=True)
        pal = io.BytesIO()
        img.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(pal, "PNG", optimize=True)
        best = min((full, pal), key=lambda b: b.tell())
        OUT.mkdir(exist_ok=True)
        (OUT / name).write_bytes(best.getvalue())
        msg = "og/%s %d bytes (%s)" % (name, best.tell(), "palette" if best is pal else "rgb")
        self.send_response(200); self.end_headers(); self.wfile.write(msg.encode())


if __name__ == "__main__":
    http.server.ThreadingHTTPServer(("127.0.0.1", 8792), Handler).serve_forever()
