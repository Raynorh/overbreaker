// Estilo Boxeador: animaciones dibujadas (GIF convertidos a hojas de sprites).
//
// Los GIF originales están en art/boxeador/ y `tools/build_sprites.py` genera las
// hojas de src/assets/boxeador/. Cada movimiento tiene 4 cuadros; aquí se decide
// cuánto dura cada cuadro dentro del juego (ajustable mediante pruebas), cuál es
// el cuadro de impacto y qué animación del juego usa cada clip.

import { BOXEADOR } from "../../assets/boxeador/manifest.js";
import { createSpriteSheets } from "../sprites.js";

// Cada clip: fila de la hoja, cuadros en orden de reproducción, instante (s) en
// que empieza cada uno, duración total y, si golpea, el cuadro de impacto.
// `hold` mantiene un cuadro fijo (anticipaciones del rival); `loop` repite.
const CLIPS = {
  gif_idle: { row: "guardia_idle", frames: [0, 1, 2, 3], times: [0, 0.16, 0.32, 0.48], duration: 0.64, loop: true },
  gif_jab: { row: "jab", frames: [0, 1, 2, 3], times: [0, 0.07, 0.17, 0.25], duration: 0.34, impact: 1 },
  gif_cross: { row: "cross", frames: [0, 1, 2, 3], times: [0, 0.07, 0.13, 0.26], duration: 0.36, impact: 2 },
  gif_hook: { row: "gancho", frames: [0, 1, 2, 3], times: [0, 0.08, 0.15, 0.29], duration: 0.4, impact: 2 },
  gif_uppercut: { row: "uppercut", frames: [0, 1, 2, 3], times: [0, 0.08, 0.16, 0.3], duration: 0.42, impact: 2 },
  gif_block: { row: "bloqueo", frames: [0, 1, 2, 3], times: [0, 0.06, 0.12, 0.3], duration: 0.4 },
  // No hay GIF de parry: la tecla K usa «esquivar atrás» mientras se crea el parry.
  gif_parry: { row: "esquivar_atras", frames: [0, 1, 2, 3], times: [0, 0.07, 0.15, 0.3], duration: 0.38 },
  gif_dodge: { row: "esquivar_agachado", frames: [0, 1, 2, 3], times: [0, 0.07, 0.16, 0.32], duration: 0.4 },
  gif_move: { row: "desplazamiento", frames: [0, 1, 2, 3], times: [0, 0.07, 0.15, 0.27], duration: 0.36 },
  gif_hurtJab: { row: "recibir_golpe", frames: [0, 1, 2, 3], times: [0, 0.06, 0.14, 0.26], duration: 0.34 },
  gif_hurtCross: { row: "recibir_cross_prueba", frames: [0, 1, 2, 3], times: [0, 0.07, 0.16, 0.3], duration: 0.4 },
  gif_hurtHook: { row: "recibir_gancho", frames: [0, 1, 2, 3], times: [0, 0.08, 0.18, 0.34], duration: 0.46 },
  // Estados que el juego pide y no tienen GIF propio: se reutilizan los de recibir golpes.
  gif_stun: { row: "recibir_cross_prueba", frames: [1, 2, 2, 1], times: [0, 0.18, 0.4, 0.58], duration: 0.7 },
  gif_down: { row: "recibir_gancho", frames: [2], times: [0], duration: 1, hold: true },
  gif_getup: { row: "recibir_gancho", frames: [2, 1, 0], times: [0, 0.25, 0.5], duration: 0.7 },
  // Anticipaciones del rival: cuadro de preparación del cross y del gancho.
  gif_windCross: { row: "cross", frames: [1], times: [0], duration: 0.4, hold: true },
  gif_windHook: { row: "gancho", frames: [1], times: [0], duration: 0.4, hold: true },
};

// Cuadro a mostrar de un clip en el instante `t` desde que empezó.
export function spriteFrame(clip, t) {
  const time = clip.loop ? t % clip.duration : Math.min(t, clip.duration);
  let index = 0;
  for (let i = 0; i < clip.times.length; i++) if (clip.times[i] <= time) index = i;
  return clip.frames[index];
}

export function createBoxeadorStyle() {
  const rows = Object.fromEntries(Object.keys(BOXEADOR.clips).map((name) => [name, BOXEADOR.clips[name].row]));
  const clips = Object.fromEntries(
    Object.entries(CLIPS).map(([name, clip]) => [name, { ...clip, row: rows[clip.row] }]),
  );
  const frame = [[0, {}], [1, {}]];
  const animations = Object.fromEntries(
    Object.entries(clips).map(([name, clip]) => [
      name,
      [
        clip.duration,
        frame,
        clip.hold || clip.loop ? 1 : 0,
        clip.impact !== undefined ? { impact: clip.times[clip.impact] / clip.duration } : {},
      ],
    ]),
  );

  const sheets = createSpriteSheets({
    manifest: BOXEADOR,
    bodyUrl: new URL("../../assets/boxeador/body.png", import.meta.url).href,
    glovesUrl: new URL("../../assets/boxeador/gloves.png", import.meta.url).href,
  });

  return {
    name: "boxeador",
    animations,
    // Carriles de ataque: A jab, S cross, D gancho, F uppercut. Los nombres
    // antiguos (punch, kick...) los usan el rival y la demo del menú.
    alias: {
      idle: "gif_idle",
      jab: "gif_jab",
      cross: "gif_cross",
      hook: "gif_hook",
      uppercut: "gif_uppercut",
      punch: "gif_cross",
      kick: "gif_hook",
      gancho: "gif_hook",
      heavy: "gif_uppercut",
      block: "gif_block",
      parry: "gif_parry",
      hurt: "gif_hurtJab",
      stun: "gif_stun",
      down: "gif_down",
      getup: "gif_getup",
      windP: "gif_windCross",
      windK: "gif_windHook",
      open: "gif_idle",
      pose1: "gif_idle",
      pose2: "gif_idle",
      flip: "gif_idle",
    },
    // Reacción del rival según el golpe recibido; no hay una específica del uppercut.
    reactions: ["gif_hurtJab", "gif_hurtCross", "gif_hurtHook", "gif_hurtHook"],
    names: ["¡JAB!", "¡CROSS!", "¡HOOK!", "¡UPPERCUT!"],
    labels: { block: "BLOQUEO", parry: "ESQUIVA ATRÁS", dodge: "ESQUIVA AGACHADO", move: "DESPLAZAMIENTO" },
    dodge: "gif_dodge",
    move: "gif_move",
    color: "#ffb21a",
    // Destello corto: las reacciones dibujadas son breves y deben verse.
    flash: 0.07,
    sprite: { clips, manifest: BOXEADOR, sheets },
  };
}
