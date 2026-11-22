// Dibujo de luchadores con atlas de sprites (cuerpo + guantes en capas).
//
// Cada estilo con sprites aporta un atlas `body` (siluetas blancas con alfa, que se
// tiñen con el color del jugador) y un atlas `gloves` (guantes y efectos con su
// color original). Cada cuadro se recorta a su contenido y se coloca respecto a un
// origen común: el centro de los pies sobre el suelo. Los atlas se cargan al primer
// dibujo; hasta entonces, o fuera del navegador (pruebas), no se dibuja nada.

export function createSpriteSheets({ bodyUrl, glovesUrl }) {
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

  // Atlas teñido de un solo color, guardado en caché (la cantidad de colores es pequeña).
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

  // Dibuja un cuadro con los pies en (x, y). `tint` reemplaza el color del cuerpo
  // y `flat`, si se indica, el de los guantes (destellos de impacto).
  function draw(g, { frame, x, y, scale, face, tint, flat }) {
    if (!ready()) return false;
    const body = tint ? tinted("body", tint) : images.body;
    const gloves = flat ? tinted("gloves", flat) : images.gloves;
    if (!body || !gloves) return false;
    g.save();
    g.translate(x, y);
    g.scale(face * scale, scale);
    g.drawImage(body, frame.x, frame.y, frame.w, frame.h, frame.ox, frame.oy, frame.w, frame.h);
    g.drawImage(gloves, frame.x, frame.y, frame.w, frame.h, frame.ox, frame.oy, frame.w, frame.h);
    g.restore();
    return true;
  }

  return { ready, draw };
}
