// Bundled assets are cached separately. User overrides are always applied last.
const BUNDLE_KEY = "bundle:v1";
export async function bootstrapAudio(app) {
  app.au();
  if (!app.AC) return;
  let saved = {};
  try {
    saved = await app.idbAll();
  } catch (error) {
    console.warn("Persistencia de audio no disponible", error);
  }
  try {
    let buffer = saved[BUNDLE_KEY];
    if (!buffer) {
      const response = await fetch("./sonidos.zip");
      if (!response.ok) throw new Error("No se pudo cargar sonidos.zip");
      const size = Number(response.headers.get("content-length"));
      if (size > 32 * 1024 ** 2) throw new Error("Paquete demasiado grande");
      buffer = await response.arrayBuffer();
      await app.loadVoices([new File([buffer], "sonidos.zip")], false);
      try {
        await app.idbPut(BUNDLE_KEY, buffer);
      } catch (error) {
        console.warn("No se pudo guardar el paquete", error);
      }
    } else await app.loadVoices([new File([buffer], "sonidos.zip")], false);
  } catch (error) {
    console.warn("Paquete incluido no disponible", error);
  }
  for (const [key, buffer] of Object.entries(saved)) {
    if (key.startsWith("bundle:")) continue;
    try {
      if (key === "mmenu" || key === "mbattle") app.setMus(key, buffer);
      else if (key.startsWith("x:"))
        await app.addX(key.slice(2), buffer.slice(0));
      else app.VB[key] = await app.AC.decodeAudioData(buffer.slice(0));
    } catch (error) {
      console.warn("Audio guardado inválido", key, error);
    }
  }
  app.syncUI();
  app.musicSync();
}
