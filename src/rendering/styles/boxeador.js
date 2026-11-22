// Estilo Boxeador: animaciones dibujadas (GIF convertidos a atlas de sprites).
//
// Los GIF originales están en art/boxeador/ y `tools/build_sprites.py` genera el
// atlas de src/assets/boxeador/. Cada movimiento tiene 4 cuadros; aquí se decide
// qué cuadros se usan, cuánto dura cada uno dentro del juego (ajustable mediante
// pruebas), cuál es el cuadro de impacto y qué animación del juego usa cada clip.

import { BOXEADOR } from "../../assets/boxeador/manifest.js";
import { createSpriteSheets } from "../sprites.js";

// Cada clip:
//   row       movimiento de origen (nombre del GIF)
//   frames    cuadros del GIF a mostrar, en orden. Se omite el cuadro 0 (guardia) al
//             principio de los golpes: es igual al reposo y retrasaría el impacto.
//   times     segundo en que empieza cada cuadro; `duration` es la duración total
//   impact    posición (en `frames`) del cuadro en que el golpe conecta
//   loop      se repite mientras dure la animación
//   stay      al terminar se queda en el último cuadro hasta que otra animación lo cambie
const CLIPS = {
  gif_idle: { row: "guardia_idle", frames: [0, 1, 2, 3], times: [0, 0.16, 0.32, 0.48], duration: 0.64, loop: true },

  // Ataques del jugador (carriles A S D F) y del rival.
  gif_jab: { row: "jab", frames: [1, 2, 3], times: [0, 0.09, 0.2], duration: 0.28, impact: 0 },
  gif_cross: { row: "cross", frames: [1, 2, 3], times: [0, 0.07, 0.2], duration: 0.3, impact: 1 },
  gif_hook: { row: "gancho", frames: [1, 2, 3], times: [0, 0.08, 0.2], duration: 0.32, impact: 1 },
  gif_uppercut: { row: "uppercut", frames: [1, 2, 3], times: [0, 0.08, 0.22], duration: 0.34, impact: 1 },

  // Defensas (J bloqueo, K esquiva atrás). Solo ocurren ante un ataque del rival.
  gif_block: { row: "bloqueo", frames: [1, 2, 3], times: [0, 0.06, 0.22], duration: 0.34 },
  gif_parry: { row: "esquivar_atras", frames: [1, 2, 3], times: [0, 0.07, 0.2], duration: 0.32 },
  gif_dodge: { row: "esquivar_agachado", frames: [1, 2, 3], times: [0, 0.07, 0.2], duration: 0.34 },
  gif_move: { row: "desplazamiento", frames: [1, 2, 3], times: [0, 0.08, 0.2], duration: 0.32 },
  // Defensas perfectas: tras cubrirse, contraataque (el cuadro de golpe es el de impacto).
  gif_blockCounter: { row: "bloquea_esquiva_golpe", frames: [1, 2, 3, 0], times: [0, 0.08, 0.17, 0.32], duration: 0.38, impact: 2 },
  gif_dodgeCounter: { row: "esquiva_esquiva_golpe", frames: [1, 2, 3], times: [0, 0.09, 0.26], duration: 0.36, impact: 1 },

  // Reacciones a un golpe recibido, una por tipo de golpe.
  gif_hurtJab: { row: "recibir_golpe", frames: [1, 2, 3], times: [0, 0.07, 0.18], duration: 0.3 },
  gif_hurtCross: { row: "recibir_cross_prueba", frames: [1, 2, 3], times: [0, 0.08, 0.2], duration: 0.34 },
  gif_hurtHook: { row: "recibir_gancho", frames: [1, 2, 3], times: [0, 0.09, 0.22], duration: 0.36 },
  gif_hurtUppercut: { row: "recibir_golpe_uppercut", frames: [1, 2, 3], times: [0, 0.1, 0.24], duration: 0.38 },
  gif_stun: { row: "recibir_cross_prueba", frames: [1, 2, 2, 3], times: [0, 0.18, 0.4, 0.58], duration: 0.7 },

  // Momentos puntuales del combate.
  gif_greet: { row: "saludo_inicio_combate", frames: [0, 1, 2, 3], times: [0, 0.3, 0.6, 0.95], duration: 1.2, stay: true },
  gif_adren: { row: "activa_adrenalina", frames: [0, 1, 2, 3], times: [0, 0.2, 0.42, 0.7], duration: 0.95 },
  gif_tired: { row: "pose_de_cansancio", frames: [0, 1], times: [0, 0.4], duration: 0.8, loop: true },
  gif_win: { row: "celebracion_victoria", frames: [0, 1, 2, 3], times: [0, 0.25, 0.5, 0.8], duration: 1.1, stay: true },
  // Caída: solo la primera barra se levanta (gif_getup); la última se queda en el suelo.
  gif_fall: { row: "caer_derrotado_nocaut", frames: [0, 1, 2, 3], times: [0, 0.12, 0.26, 0.5], duration: 0.8, stay: true },
  gif_getup: { row: "levantarse_despues_de_caer", frames: [0, 1, 2, 3], times: [0, 0.2, 0.4, 0.58], duration: 0.7 },

  // Anticipaciones del rival: cuadro de preparación del cross y del gancho.
  gif_windCross: { row: "cross", frames: [1], times: [0], duration: 0.4, stay: true },
  gif_windHook: { row: "gancho", frames: [1], times: [0], duration: 0.4, stay: true },
};

// Desplazamiento horizontal continuo (en unidades de dibujo, 100 = altura del
// luchador; positivo = hacia el rival) para que el cuerpo avance y retroceda de forma
// fluida entre los cuatro cuadros de cada movimiento. [segundo, desplazamiento].
const SHIFT = {
  gif_jab: [[0, 0], [0.09, 5], [0.28, 0]],
  gif_cross: [[0, 0], [0.07, -3], [0.14, 10], [0.3, 0]],
  gif_hook: [[0, 0], [0.08, -3], [0.16, 9], [0.32, 0]],
  gif_uppercut: [[0, 0], [0.08, -2], [0.16, 6], [0.34, 0]],
  gif_block: [[0, 0], [0.06, -3], [0.34, 0]],
  gif_parry: [[0, 0], [0.07, -8], [0.2, -10], [0.32, 0]],
  gif_dodge: [[0, 0], [0.07, -4], [0.34, 0]],
  gif_move: [[0, 0], [0.1, 6], [0.32, 0]],
  gif_blockCounter: [[0, 0], [0.08, -2], [0.17, 10], [0.38, 0]],
  gif_dodgeCounter: [[0, 0], [0.09, -3], [0.26, 8], [0.36, 0]],
  gif_hurtJab: [[0, 0], [0.07, -5], [0.3, 0]],
  gif_hurtCross: [[0, 0], [0.08, -9], [0.2, -15], [0.34, 0]],
  gif_hurtHook: [[0, 0], [0.09, -10], [0.22, -16], [0.36, 0]],
  gif_hurtUppercut: [[0, 0], [0.1, -9], [0.24, -18], [0.38, 0]],
  gif_stun: [[0, 0], [0.18, -6], [0.4, -6], [0.7, 0]],
  // Al caer queda donde cayó (la caída es permanente hasta que se levanta).
  gif_fall: [[0, 0], [0.12, -3], [0.26, -10], [0.5, -20]],
  gif_getup: [[0, -20], [0.4, -12], [0.7, 0]],
};

// Desplazamiento del clip en el instante `t` (interpolación lineal).
export function spriteShift(clipName, t) {
  const table = SHIFT[clipName];
  if (!table) return 0;
  if (t <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (t <= table[i][0]) {
      const [t0, v0] = table[i - 1],
        [t1, v1] = table[i];
      return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
  }
  return table.at(-1)[1];
}

// A qué parte del cuerpo llega cada golpe (carriles A S D F): "head" o "torso".
export const HIT_TARGETS = ["head", "head", "head", "head"];

// Posición del cuadro (índice dentro de `clip.frames`) en el instante `t`.
export function spriteStep(clip, t) {
  const time = clip.loop ? t % clip.duration : Math.min(t, clip.duration);
  let index = 0;
  for (let i = 0; i < clip.times.length; i++) if (clip.times[i] <= time) index = i;
  return index;
}

export function createBoxeadorStyle() {
  const clips = Object.fromEntries(
    Object.entries(CLIPS).map(([name, clip]) => [
      name,
      { ...clip, source: BOXEADOR.clips[clip.row].frames },
    ]),
  );
  // Cuadro del atlas (con su posición y puntos de cabeza/torso) en el instante `t`.
  const frameAt = (clip, t) => clip.source[clip.frames[spriteStep(clip, t)]];
  const shiftAt = (name, t) => spriteShift(name, t);

  const frame = [[0, {}], [1, {}]];
  const animations = Object.fromEntries(
    Object.entries(clips).map(([name, clip]) => [
      name,
      [
        clip.duration,
        frame,
        clip.stay || clip.loop ? 1 : 0,
        clip.impact !== undefined ? { impact: clip.times[clip.impact] / clip.duration } : {},
      ],
    ]),
  );

  const sheets = createSpriteSheets({
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
      blockC: "gif_blockCounter",
      parryC: "gif_dodgeCounter",
      hurt: "gif_hurtJab",
      stun: "gif_stun",
      down: "gif_fall",
      getup: "gif_getup",
      windP: "gif_windCross",
      windK: "gif_windHook",
      adren: "gif_adren",
      tired: "gif_tired",
      win: "gif_win",
      pose1: "gif_greet",
      pose2: "gif_greet",
      open: "gif_idle",
      flip: "gif_idle",
    },
    // Reacción del rival según el golpe recibido (A S D F).
    reactions: ["gif_hurtJab", "gif_hurtCross", "gif_hurtHook", "gif_hurtUppercut"],
    hitTargets: HIT_TARGETS,
    names: ["¡JAB!", "¡CROSS!", "¡HOOK!", "¡UPPERCUT!"],
    labels: {
      block: "BLOQUEO",
      parry: "ESQUIVA ATRÁS",
      dodge: "ESQUIVA AGACHADO",
      move: "DESPLAZAMIENTO",
      states: {
        pose1: "SALUDO",
        adren: "ADRENALINA",
        tired: "CANSANCIO",
        win: "VICTORIA",
        down: "CAÍDA (KO)",
        getup: "LEVANTARSE",
      },
    },
    dodge: "gif_dodge",
    move: "gif_move",
    color: "#ffb21a",
    // Destello corto: las reacciones dibujadas son breves y deben verse.
    flash: 0.07,
    sprite: { clips, manifest: BOXEADOR, sheets, frameAt, shiftAt },
  };
}
