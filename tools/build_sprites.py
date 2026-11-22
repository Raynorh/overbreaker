#!/usr/bin/env python3
"""Convierte los GIF de art/boxeador/ en atlas de sprites para el juego.

Salida en src/assets/boxeador/:
  body.png     siluetas del cuerpo en blanco con alfa (el juego las tiñe con el
               color del jugador)
  gloves.png   guantes rojos y efectos de impacto, con su color original
  manifest.js  posición de cada cuadro en el atlas, desplazamiento respecto a los
               pies, y centros de cabeza y torso (para colocar los impactos)

Cada cuadro se recorta a su contenido y se coloca respecto a un origen común: el
centro de los pies en la postura de guardia, sobre el suelo. Así todos los
movimientos encajan entre sí sin importar el tamaño del lienzo del GIF.

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
SCALE = 0.5
ATLAS_WIDTH = 2048

CLIPS = [
    "guardia_idle", "jab", "cross", "gancho", "uppercut", "bloqueo",
    "esquivar_atras", "esquivar_agachado", "desplazamiento",
    "recibir_golpe", "recibir_cross_prueba", "recibir_gancho", "recibir_golpe_uppercut",
    "bloquea_esquiva_golpe", "esquiva_esquiva_golpe",
    "activa_adrenalina", "pose_de_cansancio", "saludo_inicio_combate",
    "celebracion_victoria", "caer_derrotado_nocaut", "levantarse_despues_de_caer",
]

# Cuadro que muestra la postura de guardia (de él se toma el origen de los pies).
GUARD_FRAME = {
    "levantarse_despues_de_caer": 3,
    "celebracion_victoria": 3,
    "pose_de_cansancio": 3,
    "saludo_inicio_combate": 3,
}


# Cuadro donde la figura está de pie para medir su altura (por defecto, el de guardia).
SIZE_FRAME = {"celebracion_victoria": 0}


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
    body = ndi.binary_closing(dark, structure=np.ones((3, 3)), iterations=2)
    body = ndi.binary_fill_holes(body | red) & ~red | dark
    labels, count = ndi.label(body)
    if count:
        sizes = ndi.sum(body, labels, range(1, count + 1))
        for index, size in enumerate(sizes, 1):
            if size < 60:
                body[labels == index] = False
    return body, red


def head_of(body):
    """Centro y diámetro de la cabeza: lo más grueso del cuerpo (los miembros son finos)."""
    dist = ndi.distance_transform_edt(body)
    peak = dist.max()
    core = dist >= peak * 0.6
    labels, count = ndi.label(core)
    if not count:
        return None
    sizes = ndi.sum(core, labels, range(1, count + 1))
    ys, xs = np.where(labels == (int(np.argmax(sizes)) + 1))
    return float(xs.mean()), float(ys.mean()), float(peak * 2)


def height_of(body):
    ys, _ = np.where(body)
    return int(ys.max() - ys.min() + 1)


def feet_of(body):
    """Suelo (fila inferior) y centro horizontal de los pies."""
    ys, xs = np.where(body)
    ground = ys.max()
    return float(xs[ys > ground - 14].mean()), int(ground)


def shrink(rgba, k):
    im = Image.fromarray(rgba, "RGBA").convert("RGBa")
    size = (max(1, round(im.width * k)), max(1, round(im.height * k)))
    return np.array(im.resize(size, Image.LANCZOS).convert("RGBA"))


def main():
    # Referencia de tamaño: la altura de la figura de pie en el idle. Algunos GIF
    # nuevos están dibujados más grandes y se normalizan por la altura de pie.
    reference = height_of(split(load("guardia_idle")[0][0])[0])
    prepared = {}
    for name in CLIPS:
        frames, durations = load(name)
        parts = [split(f) for f in frames]
        guard = GUARD_FRAME.get(name, 0)
        size = height_of(parts[SIZE_FRAME.get(name, guard)][0])
        fix = reference / size if abs(size / reference - 1) > 0.06 else 1.0
        ax, ground = feet_of(parts[guard][0])
        prepared[name] = dict(frames=frames, parts=parts, durations=durations, fix=fix, ax=ax, ground=ground)
        print(f"{name:30s} altura={size:4d} escala={fix:.3f} pies=({ax:.0f},{ground})")

    # Recorta cada cuadro a su contenido, referido al origen común (pies sobre el suelo).
    items = []
    for name in CLIPS:
        p = prepared[name]
        k = SCALE * p["fix"]
        for index, frame in enumerate(p["frames"]):
            body, glove = p["parts"][index]
            union = body | glove
            ys, xs = np.where(union)
            x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
            body_rgba = np.zeros((*body.shape, 4), np.uint8)
            body_rgba[body] = (255, 255, 255, 255)
            glove_rgba = frame.copy()
            glove_rgba[~glove] = 0
            glove_rgba[glove, 3] = 255
            head = head_of(body)
            hx, hy, hd = head if head else ((x0 + x1) / 2, y0 + 28, 56.0)
            band = body.copy()
            band[: int(hy + hd * 0.9)] = False
            band[int(hy + hd * 2.3):] = False
            if band.any():
                by, bx = np.where(band)
                tx, ty = float(bx.mean()), float(by.mean())
            else:
                tx, ty = hx, hy
            rel = lambda x, y: [round((x - p["ax"]) * k, 1), round((y - p["ground"]) * k, 1)]
            items.append(dict(
                clip=name, index=index,
                body=shrink(np.ascontiguousarray(body_rgba[y0:y1, x0:x1]), k),
                gloves=shrink(np.ascontiguousarray(glove_rgba[y0:y1, x0:x1]), k),
                ox=round((x0 - p["ax"]) * k, 1), oy=round((y0 - p["ground"]) * k, 1),
                head=rel(hx, hy), torso=rel(tx, ty),
                reach=int(np.where(glove.any(axis=0))[0].max()) if glove.any() else 0,
            ))

    # Empaquetado en estantes (de más alto a más bajo) dentro de un atlas estrecho.
    pad = 2
    order = sorted(range(len(items)), key=lambda i: -items[i]["body"].shape[0])
    x = y = shelf = 0
    for i in order:
        h, w = items[i]["body"].shape[:2]
        if x + w + pad > ATLAS_WIDTH:
            x, y, shelf = 0, y + shelf + pad, 0
        items[i]["x"], items[i]["y"] = x, y
        x += w + pad
        shelf = max(shelf, h)
    atlas_h = y + shelf + pad
    body_atlas = np.zeros((atlas_h, ATLAS_WIDTH, 4), np.uint8)
    glove_atlas = np.zeros_like(body_atlas)
    for item in items:
        h, w = item["body"].shape[:2]
        body_atlas[item["y"]:item["y"] + h, item["x"]:item["x"] + w] = item["body"]
        glove_atlas[item["y"]:item["y"] + h, item["x"]:item["x"] + w] = item["gloves"]

    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(body_atlas, "RGBA").save(OUT / "body.png", optimize=True)
    Image.fromarray(glove_atlas, "RGBA").save(OUT / "gloves.png", optimize=True)

    manifest = {
        "atlas": {"w": ATLAS_WIDTH, "h": int(atlas_h)},
        "height": round(float(feet_height(prepared)) * SCALE, 1),
        "clips": {},
    }
    for name in CLIPS:
        frames = [i for i in items if i["clip"] == name]
        reach = [f["reach"] for f in frames]
        manifest["clips"][name] = {
            "durations": prepared[name]["durations"],
            "reach": int(np.argmax(reach)),
            "frames": [
                {"x": f["x"], "y": f["y"], "w": f["body"].shape[1], "h": f["body"].shape[0],
                 "ox": f["ox"], "oy": f["oy"], "head": f["head"], "torso": f["torso"]}
                for f in frames
            ],
        }
    (OUT / "manifest.js").write_text(
        "// Generado por tools/build_sprites.py; no editar a mano.\n"
        "export const BOXEADOR = " + json.dumps(manifest, indent=2) + ";\n",
        encoding="utf-8",
    )
    print("atlas", ATLAS_WIDTH, "x", atlas_h, "| altura de la figura", manifest["height"])


def feet_height(prepared):
    """Altura de la figura de guardia (cabeza a pies) en píxeles originales."""
    body = prepared["guardia_idle"]["parts"][0][0]
    ys, _ = np.where(body)
    return ys.max() - ys.min() + 1


if __name__ == "__main__":
    main()
