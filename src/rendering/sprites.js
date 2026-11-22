// Dibujo de luchadores con hojas de sprites (cuerpo + guantes en capas).
//
// Cada estilo con sprites aporta una hoja `body` (silueta blanca con alfa, que se
// tiñe con el color del jugador) y una hoja `gloves` (guantes y efectos con su
// color original). Las hojas se cargan al primer dibujo; hasta entonces, o fuera
// del navegador (pruebas), no se dibuja nada y no falla nada.

export function createSpriteSheets({ manifest, bodyUrl, glovesUrl }) {
  let images = null;
  const tints = new Map();

  function load() {
    if (images || typeof Image === "undefined") return images;
    const make = (url) => {
      const image = new Image();
      image.src = url;
      return image;
    };
    images = { body: make(bodyUrl), gloves: make(glovesUrl) };
    return images;
  }
  const ready = () => {
    const sheets = load();
    return !!(sheets && sheets.body.complete && sheets.body.naturalWidth && sheets.gloves.complete && sheets.gloves.naturalWidth);
  };

  // Hoja teñida de un solo color, guardada en caché (la cantidad de colores es pequeña).
  function tinted(layer, color) {
    const key = layer + "|" + color;
    if (tints.has(key)) return tints.get(key);
    if (typeof document === "undefined" || typeof document.createElement !== "function") return null;
    const source = images[layer];
    const canvas = document.createElement("canvas");
    canvas.width = source.naturalWidth;
    canvas.height = source.naturalHeight;
    const g = canvas.getContext("2d");
    g.drawImage(source, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = color;
    g.fillRect(0, 0, canvas.width, canvas.height);
    if (tints.size > 24) tints.clear();
    tints.set(key, canvas);
    return canvas;
  }

  // Dibuja un cuadro de la hoja con los pies en (x, y). `tint` reemplaza el color
  // del cuerpo (y de los guantes si `flat`, para destellos de impacto).
  function draw(g, { row, column, x, y, scale, face, tint, flat }) {
    if (!ready()) return false;
    const { w, h } = manifest.cell;
    const sx = column * w,
      sy = row * h;
    const body = tint ? tinted("body", tint) : images.body;
    const gloves = flat ? tinted("gloves", flat) : images.gloves;
    if (!body || !gloves) return false;
    g.save();
    g.translate(x, y);
    g.scale(face * scale, scale);
    g.drawImage(body, sx, sy, w, h, -manifest.anchor.x, -manifest.anchor.y, w, h);
    g.drawImage(gloves, sx, sy, w, h, -manifest.anchor.x, -manifest.anchor.y, w, h);
    g.restore();
    return true;
  }

  return { ready, draw };
}
