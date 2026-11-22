#!/usr/bin/env python3
"""Convierte los GIF de art/boxeador/ en hojas de sprites para el juego.

Salida en src/assets/boxeador/:
  body.png     silueta del cuerpo en blanco con alfa (el juego la tiñe con el color
               del jugador)
  gloves.png   guantes rojos y efectos de impacto, con su color original
  manifest.js  tamaños, ancla de los pies, duraciones y cuadro de impacto

Limpieza: los GIF traen ruido de compresión (píxeles blancos dentro del cuerpo y en
los bordes). El cuerpo se reconstruye solo con los píxeles oscuros, cerrando huecos,
y los guantes solo con los píxeles rojos.

Uso: python3 tools/build_sprites.py   (requiere Pillow, NumPy y SciPy)
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageSequence
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "boxeador"
OUT = ROOT / "src" / "assets" / "boxeador"
SCALE = 0.6
COLUMNS = 4
CANVAS = (460, 420)  # ancho, alto de los GIF de acción

# El uppercut golpea hacia arriba: su impacto no es el cuadro de mayor alcance horizontal.
IMPACT_OVERRIDE = {"uppercut": 2}

# Orden de las filas en la hoja.
CLIPS = [
    "guardia_idle", "jab", "cross", "gancho", "uppercut", "bloqueo",
    "esquivar_atras", "esquivar_agachado", "desplazamiento",
    "recibir_golpe", "recibir_cross_prueba", "recibir_gancho",
]


def load(name):
    path = SRC / f"boxeador_{name}.gif"
    with Image.open(path) as im:
        frames = [np.array(f.convert("RGBA")) for f in ImageSequence.Iterator(im)]
    with Image.open(path) as im:
        durations = [f.info.get("duration", 160) for f in ImageSequence.Iterator(im)]
    return frames, durations


def split(rgba):
    """Devuelve (cuerpo, guantes) como máscaras booleanas."""
    r, g, b, a = (rgba[..., i].astype(int) for i in range(4))
    opaque = a > 0
    red = opaque & (r - np.maximum(g, b) > 28)
    dark = opaque & ~red & (np.maximum(np.maximum(r, g), b) < 110)
    # Rellena los huecos de ruido sin unir piernas ni brazos.
    body = ndi.binary_closing(dark, structure=np.ones((3, 3)), iterations=2)
    body = ndi.binary_fill_holes(body | red) & ~red | dark
    labels, count = ndi.label(body)
    if count:
        sizes = ndi.sum(body, labels, range(1, count + 1))
        for index, size in enumerate(sizes, 1):
            if size < 60:
                body[labels == index] = False
    return body, red


def on_canvas(frame, dx, dy):
    w, h = CANVAS
    out = np.zeros((h, w, 4), np.uint8)
    fh, fw = frame.shape[:2]
    top, bottom = max(0, dy), min(h, dy + fh)
    ww = min(fw, w - dx)
    out[top:bottom, dx:dx + ww] = frame[top - dy:bottom - dy, :ww]
    return out


def idle_offset(reference, idle_frame):
    """Desplazamiento que alinea la guardia del idle con la de los demás GIF."""
    ref_body, _ = split(reference)
    idle_body, _ = split(idle_frame)
    w, h = CANVAS
    ih, iw = idle_body.shape
    best = (-10**9, 0, 0)
    for dx in range(0, w - iw + 1):
        for dy in range(-12, 27):
            top, bottom = max(0, dy), min(h, dy + ih)
            ref = ref_body[top:bottom, dx:dx + iw]
            idle = idle_body[top - dy:bottom - dy, :iw]
            score = int((ref & idle).sum()) - int((ref ^ idle).sum())
            if score > best[0]:
                best = (score, dx, dy)
    return best[1], best[2], best[0], int(ref_body.sum())


def shrink(rgba_array):
    im = Image.fromarray(rgba_array, "RGBA").convert("RGBa")
    size = (round(im.width * SCALE), round(im.height * SCALE))
    return np.array(im.resize(size, Image.LANCZOS).convert("RGBA"))


def main():
    clips = {name: load(name) for name in CLIPS}
    jab0 = clips["jab"][0][0]
    dx, dy, score, total = idle_offset(jab0, clips["guardia_idle"][0][0])
    print(f"idle alineado en ({dx}, {dy}); coincidencia {score}/{total}")

    aligned, bodies, gloves, reach = {}, {}, {}, {}
    for name, (frames, _) in clips.items():
        if name == "guardia_idle":
            frames = [on_canvas(f, dx, dy) for f in frames]
        aligned[name] = frames
        pairs = [split(f) for f in frames]
        bodies[name] = [p[0] for p in pairs]
        gloves[name] = [p[1] for p in pairs]
        reach[name] = [
            int(np.where(g.any(axis=0))[0].max()) if g.any() else 0 for g in gloves[name]
        ]

    # Recorte común a todos los cuadros.
    every = [m for name in CLIPS for m in bodies[name] + gloves[name]]
    union = np.logical_or.reduce(every)
    ys, xs = np.where(union)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    crop_w, crop_h = x1 - x0, y1 - y0
    cell_w, cell_h = round(crop_w * SCALE), round(crop_h * SCALE)

    sheet_body = np.zeros((cell_h * len(CLIPS), cell_w * COLUMNS, 4), np.uint8)
    sheet_gloves = np.zeros_like(sheet_body)
    for row, name in enumerate(CLIPS):
        for col in range(COLUMNS):
            frame = aligned[name][col]
            b, g = bodies[name][col], gloves[name][col]
            body = np.zeros((*b.shape, 4), np.uint8)
            body[b] = (255, 255, 255, 255)
            glove = frame.copy()
            glove[~g] = 0
            glove[g, 3] = 255
            for target, layer in ((sheet_body, body), (sheet_gloves, glove)):
                cell = shrink(np.ascontiguousarray(layer[y0:y1, x0:x1]))
                target[row * cell_h:row * cell_h + cell.shape[0],
                       col * cell_w:col * cell_w + cell.shape[1]] = cell[:cell_h, :cell_w]

    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(sheet_body, "RGBA").save(OUT / "body.png", optimize=True)
    Image.fromarray(sheet_gloves, "RGBA").save(OUT / "gloves.png", optimize=True)

    # Ancla: pies del idle (cuadro 0) y altura de la figura, en píxeles de celda.
    idle_body = bodies["guardia_idle"][0]
    ys_i, xs_i = np.where(idle_body)
    ground = ys_i.max()
    feet = xs_i[ys_i > ground - 14].mean()
    manifest = {
        "cell": {"w": int(cell_w), "h": int(cell_h)},
        "anchor": {"x": round(float((feet - x0) * SCALE), 1), "y": round(float((ground - y0 + 1) * SCALE), 1)},
        "height": round(float((ground - ys_i.min() + 1) * SCALE), 1),
        "clips": {
            name: {
                "row": row,
                "durations": clips[name][1],
                "impact": IMPACT_OVERRIDE.get(name, int(np.argmax(reach[name]))),
            }
            for row, name in enumerate(CLIPS)
        },
    }
    (OUT / "manifest.js").write_text(
        "// Generado por tools/build_sprites.py; no editar a mano.\n"
        "export const BOXEADOR = " + json.dumps(manifest, indent=2) + ";\n",
        encoding="utf-8",
    )
    print("celda", cell_w, "x", cell_h, "| hoja", sheet_body.shape[1], "x", sheet_body.shape[0])
    print("ancla", manifest["anchor"], "altura", manifest["height"])
    print("impactos", {n: c["impact"] for n, c in manifest["clips"].items()})


if __name__ == "__main__":
    main()
