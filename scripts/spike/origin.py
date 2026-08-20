#!/usr/bin/env python3
"""scripts/spike/origin.py — controlled local origin for the Phase 0 spikes.

Serves the corpus on 127.0.0.1 with everything the later plans need, so that
neither wave-2 plan has to modify this file:

  * explicit Content-Encoding per path (identity, gzip, br, zstd) from a
    pre-compressed sidecar, generated on demand and cached
  * strong ETag + Last-Modified with configurable Cache-Control
  * real 304 handling for If-None-Match and If-Modified-Since
  * synthetic responses: configurable status code and body size

Per-path behaviour comes from an optional sidecar JSON (--headers), so plans
00-02 and 00-03 drive it with DATA rather than code changes.

    python3 scripts/spike/origin.py --dir corpus --port 8081 [--headers h.json]

Sidecar shape:
    {"/monaco-0.52.2.js": {"content_encoding": "gzip",
                           "cache_control": "public, max-age=3600",
                           "status": 200}}

Synthetic endpoints (always available, no sidecar needed):
    /_synth?bytes=1048576&status=200&encoding=gzip
    /_status/503
"""
from __future__ import annotations

import argparse
import email.utils
import gzip
import hashlib
import http.server
import json
import os
import shutil
import socketserver
import subprocess
import sys
import threading
import urllib.parse

try:
    import brotli  # optional
except ImportError:
    brotli = None
try:
    import zstandard  # optional
except ImportError:
    zstandard = None

ARGS = None
HEADERS: dict = {}
_CACHE: dict = {}
_LOCK = threading.Lock()


def compress(raw: bytes, encoding: str) -> bytes | None:
    if encoding in (None, "", "identity"):
        return raw
    if encoding == "gzip":
        return gzip.compress(raw)
    if encoding == "br":
        return brotli.compress(raw) if brotli else None
    if encoding == "zstd":
        if zstandard:
            return zstandard.ZstdCompressor().compress(raw)
        # Fall back to the system zstd binary rather than adding a Python
        # dependency. The Phase 0 install set went through a package-legitimacy
        # checkpoint; quietly appending to it here would bypass that gate.
        return _zstd_cli(raw)
    return None


def _zstd_cli(raw: bytes) -> bytes | None:
    exe = shutil.which("zstd")
    if not exe:
        return None
    try:
        r = subprocess.run([exe, "-q", "-c", "-"], input=raw,
                           capture_output=True, timeout=120)
        return r.stdout if r.returncode == 0 and r.stdout else None
    except Exception:
        return None


def body_for(path: str, encoding: str):
    """Return (bytes, etag, mtime) for a corpus path under `encoding`."""
    key = (path, encoding or "identity")
    with _LOCK:
        if key in _CACHE:
            return _CACHE[key]
    full = os.path.join(ARGS.dir, path.lstrip("/"))
    if not os.path.isfile(full):
        return None
    with open(full, "rb") as fh:
        raw = fh.read()
    payload = compress(raw, encoding)
    if payload is None:
        return None
    # ETag is over the IDENTITY bytes, so the same resource keeps one identity
    # across encodings — which is what makes a conditional request meaningful.
    etag = '"%s"' % hashlib.sha256(raw).hexdigest()[:32]
    mtime = os.path.getmtime(full)
    val = (payload, etag, mtime, len(raw))
    with _LOCK:
        _CACHE[key] = val
    return val


class Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "DefMinerSpikeOrigin/1.0"

    def log_message(self, fmt, *a):  # keep the run output readable
        if ARGS.verbose:
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % a))

    # ---- helpers ---------------------------------------------------------
    def _send(self, status, body: bytes, extra: dict, head_only=False):
        self.send_response(status)
        for k, v in extra.items():
            if v is not None:
                self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if not head_only and body:
            self.wfile.write(body)

    def _not_modified(self, etag, last_mod, cache_control):
        self.send_response(304)
        self.send_header("ETag", etag)
        self.send_header("Last-Modified", last_mod)
        if cache_control:
            self.send_header("Cache-Control", cache_control)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _synthetic(self, qs, head_only):
        n = int(qs.get("bytes", ["1024"])[0])
        status = int(qs.get("status", ["200"])[0])
        enc = qs.get("encoding", ["identity"])[0]
        # Deterministic, non-repeating-ish filler so a content hash of a
        # synthetic body is still a meaningful distinct value.
        seed = b"/*synthetic*/var x=1;function f(a){return a+1;}"
        raw = (seed * (n // len(seed) + 1))[:n]
        payload = compress(raw, enc)
        if payload is None:
            self._send(415, b"encoding unavailable", {"Content-Type": "text/plain"}, head_only)
            return
        self._send(status, payload, {
            "Content-Type": "application/javascript",
            "Content-Encoding": None if enc in ("identity", "") else enc,
            "Cache-Control": qs.get("cache_control", ["no-store"])[0],
            "X-Raw-Length": str(len(raw)),
        }, head_only)

    def _handle(self, head_only=False):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path)
        qs = urllib.parse.parse_qs(parsed.query)

        if path == "/_synth":
            return self._synthetic(qs, head_only)
        if path.startswith("/_status/"):
            code = int(path.rsplit("/", 1)[1])
            return self._send(code, b"synthetic status", {"Content-Type": "text/plain"}, head_only)
        if path == "/_health":
            return self._send(200, b'{"ok":true}', {"Content-Type": "application/json"}, head_only)

        cfg = HEADERS.get(path, {})
        # Query string overrides the sidecar, so a single pinned corpus file can
        # be requested under several encodings within one run.
        enc = qs.get("encoding", [cfg.get("content_encoding", "identity")])[0]
        cache_control = qs.get("cache_control", [cfg.get("cache_control", "public, max-age=600")])[0]
        status = int(qs.get("status", [cfg.get("status", 200)])[0])

        got = body_for(path, enc)
        if got is None:
            return self._send(404, b"not found", {"Content-Type": "text/plain"}, head_only)
        payload, etag, mtime, raw_len = got
        last_mod = email.utils.formatdate(mtime, usegmt=True)

        # Conditional handling — a REAL 304, which is what SPIKE-11 needs.
        inm = self.headers.get("If-None-Match")
        ims = self.headers.get("If-Modified-Since")
        if inm and etag in [t.strip() for t in inm.split(",")]:
            return self._not_modified(etag, last_mod, cache_control)
        if ims:
            try:
                if email.utils.parsedate_to_datetime(ims).timestamp() >= int(mtime):
                    return self._not_modified(etag, last_mod, cache_control)
            except (TypeError, ValueError):
                pass

        self._send(status, payload, {
            "Content-Type": cfg.get("content_type", "application/javascript"),
            "Content-Encoding": None if enc in ("identity", "") else enc,
            "ETag": etag,
            "Last-Modified": last_mod,
            "Cache-Control": cache_control,
            # Lets SPIKE-08 compare Body.length against the true raw length
            # without having to decompress on the client side.
            "X-Raw-Length": str(raw_len),
        }, head_only)

    def do_GET(self):
        self._handle(head_only=False)

    def do_HEAD(self):
        self._handle(head_only=True)


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    global ARGS, HEADERS
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="corpus")
    ap.add_argument("--port", type=int, default=8081)
    ap.add_argument("--headers", default=None, help="sidecar JSON of per-path behaviour")
    ap.add_argument("--verbose", action="store_true")
    ARGS = ap.parse_args()
    if ARGS.headers and os.path.isfile(ARGS.headers):
        HEADERS = json.load(open(ARGS.headers))
    # 127.0.0.1 only. Never 0.0.0.0.
    with Server(("127.0.0.1", ARGS.port), Handler) as httpd:
        print("origin: 127.0.0.1:%d dir=%s brotli=%s zstd=%s"
              % (ARGS.port, ARGS.dir, bool(brotli),
                 "module" if zstandard else ("cli" if shutil.which("zstd") else False)),
              flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
