#!/usr/bin/env python3
"""Resize extension UI mockup to Chrome Web Store screenshot sizes (16:10)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

# Light gray matching typical extension popup / Material surrounds
CANVAS_RGB = (245, 247, 250)


def fit_on_canvas(src: Image.Image, canvas_w: int, canvas_h: int) -> Image.Image:
    if src.mode != "RGBA":
        src = src.convert("RGBA")
    sw, sh = src.size
    scale = min(canvas_w / sw, canvas_h / sh)
    nw = max(1, int(round(sw * scale)))
    nh = max(1, int(round(sh * scale)))
    resized = src.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (canvas_w, canvas_h), CANVAS_RGB)
    x = (canvas_w - nw) // 2
    y = (canvas_h - nh) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    src_path = root / "assets" / "store-mockup-source.png"
    if not src_path.exists():
        raise SystemExit(f"Missing source: {src_path}")

    src = Image.open(src_path)

    out_dir = root / "assets"
    out_dir.mkdir(parents=True, exist_ok=True)

    for w, h in ((1280, 800), (640, 400)):
        img = fit_on_canvas(src, w, h)
        png_path = out_dir / f"store-screenshot-{w}x{h}.png"
        img.save(png_path, "PNG", optimize=True)
        print("Wrote", png_path)

        jpg_path = out_dir / f"store-screenshot-{w}x{h}.jpg"
        img.save(jpg_path, "JPEG", quality=92, optimize=True, subsampling=1)
        print("Wrote", jpg_path)


if __name__ == "__main__":
    main()
