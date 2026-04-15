from PIL import Image, ImageDraw
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / "icons"
OUT_DIR.mkdir(exist_ok=True)

YELLOW_TOP = (255, 248, 160, 255)
YELLOW_BOT = (253, 232, 115, 255)
BORDER = (184, 148, 16, 255)
FOLD = (220, 190, 40, 255)
LINE = (80, 65, 10, 255)
SHADOW = (0, 0, 0, 60)


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    pad = max(1, size // 16)
    x0, y0 = pad, pad
    x1, y1 = size - pad, size - pad

    fold = max(2, size // 4)

    if size >= 6:
        shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow)
        sd.rectangle([x0 + 1, y0 + 2, x1 + 1, y1 + 2], fill=SHADOW)
        img = Image.alpha_composite(img, shadow)
        d = ImageDraw.Draw(img)

    for y in range(y0, y1 + 1):
        t = (y - y0) / max(1, y1 - y0)
        r = int(YELLOW_TOP[0] * (1 - t) + YELLOW_BOT[0] * t)
        g = int(YELLOW_TOP[1] * (1 - t) + YELLOW_BOT[1] * t)
        b = int(YELLOW_TOP[2] * (1 - t) + YELLOW_BOT[2] * t)
        d.line([(x0, y), (x1, y)], fill=(r, g, b, 255))

    d.rectangle([x0, y0, x1, y1], outline=BORDER, width=max(1, size // 32))

    d.polygon(
        [(x1 - fold, y1), (x1, y1 - fold), (x1, y1)],
        fill=FOLD,
        outline=BORDER,
    )
    d.line([(x1 - fold, y1), (x1, y1 - fold)], fill=BORDER, width=max(1, size // 48))

    if size >= 32:
        line_w = max(1, size // 24)
        gap = max(3, size // 6)
        lx0 = x0 + max(2, size // 8)
        lx1 = x1 - fold - max(2, size // 10)
        ly = y0 + gap
        while ly < y1 - fold - gap // 2:
            d.line([(lx0, ly), (lx1, ly)], fill=LINE, width=line_w)
            ly += gap

    return img


for s in (16, 32, 48, 128):
    img = draw_icon(s)
    img.save(OUT_DIR / f"icon-{s}.png", "PNG")
    print(f"wrote icons/icon-{s}.png")
