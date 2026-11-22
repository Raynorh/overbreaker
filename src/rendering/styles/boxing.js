// Estilo Boxeo: datos puros (sin DOM ni Canvas) para el sistema de poses.
//
// Las convenciones de ángulos y poses están en pose-tools.js. Aquí `arm1` es el
// brazo delantero (jab) y `arm2` el trasero (cross).
// - Cada animación es [duración en segundos, fotogramas, sostener?, metadatos].
//   Un fotograma es [fracción 0..1, pose parcial]; las claves ausentes vuelven
//   a la postura base. El último fotograma {} regresa a la guardia.
// - Fases por golpe: preparación -> aceleración -> impacto -> recuperación.
//   `meta.impact` es la fracción de tiempo en que el golpe conecta.

import { createPoseTools } from "./pose-tools.js";

export function createBoxingStyle(base) {
  const { pose, planted, knees } = createPoseTools(base);

  // Guardias: mano junto al mentón.
  const chinRear = [0.75, 2.6];
  const chinLead = [0.8, 2.7];

  // --- Poses clave ---------------------------------------------------------
  const jabPrep = pose({
    ln: 0.02, bn: 0, hx: -4,
    arm1: [0.7, 2.3], arm2: chinRear,
    c1: 0.6, d1: -0.05, c2: -0.5, d2: -0.15,
  });
  const jabHit = pose({
    ln: 0.28, bn: 0.14, hx: 15,
    arm1: [1.58, 1.65], arm2: chinRear,
    c1: 1.0, d1: -0.15, c2: -0.8, d2: -0.5,
  });

  const crossPrep = pose({
    ln: -0.3, bn: -0.1, hx: -9,
    arm1: chinLead, arm2: [0.5, 1.9],
    c1: 0.7, d1: -0.1, c2: -0.6, d2: -0.3,
  });
  const crossHit = pose({
    ln: 0.5, bn: 0.16, hx: 22,
    arm1: chinLead, arm2: [1.55, 1.6],
    c1: 1.05, d1: 0.1, c2: -1.1, d2: -0.9,
  });

  const hookPrep = pose({
    ln: -0.45, bn: -0.15, hx: -10,
    arm1: [-0.35, 0.6], arm2: chinRear,
    c1: 0.9, d1: -0.4, c2: -0.7, d2: -0.5,
  });
  const hookArc = pose({
    ln: 0.05, bn: 0, hx: 4,
    arm1: [1.2, 1.7], arm2: chinRear,
    c1: 0.85, d1: -0.4, c2: -0.7, d2: -0.5,
  });
  const hookHit = pose({
    ln: 0.55, bn: 0.22, hx: 14,
    arm1: [1.78, 2.3], arm2: chinRear,
    c1: 0.8, d1: -0.4, c2: -0.95, d2: -0.65,
  });

  // El uppercut se carga con una flexión profunda y sube con el cuerpo arqueado.
  const upperDip = pose({
    ln: -0.3, bn: -0.1, hx: -7,
    arm1: [0.3, 0.6], arm2: chinRear,
    c1: 1.1, d1: -0.8, c2: 0.9, d2: -0.9,
  });
  const upperScoop = pose({
    ln: 0.05, bn: -0.05, hx: 4,
    arm1: [0.9, 1.9], arm2: chinRear,
    c1: 0.85, d1: -0.45, c2: 0.3, d2: -0.6,
  });
  const upperHit = pose({
    ln: 0.1, bn: -0.3, hx: 9, hy: -8,
    arm1: [2.4, 2.9], arm2: chinRear,
    c1: 0.55, d1: 0.1, c2: -0.45, d2: -0.25,
    air: true,
  });

  const guardUp = pose({
    ln: 0.45, bn: 0.15, hx: -6,
    arm1: [0.7, 3.0], arm2: [1.0, 3.1],
    c1: 0.85, d1: -0.5, c2: -0.7, d2: -0.5,
  });

  // El desvío es un manotazo corto de la mano delantera: sube junto a la cara
  // y barre hacia abajo y afuera para apartar el golpe.
  const parryReady = pose({
    ln: 0.1, bn: 0, hx: 2,
    arm1: [1.1, 2.6], arm2: chinRear,
    c1: 0.6, d1: -0.05, c2: -0.5, d2: -0.15,
  });
  const parrySweep = pose({
    ln: 0.22, bn: 0.08, hx: 9,
    arm1: [1.45, 0.85], arm2: chinRear,
    c1: 0.85, d1: -0.2, c2: -0.6, d2: -0.3,
  });

  // Esquiva: la cabeza se hunde y se retira del golpe con el torso encogido.
  const dodgeLow = pose({
    ln: 0.62, bn: 0.4, hx: -14,
    arm1: [0.8, 2.7], arm2: [1.0, 2.8],
    c1: 0.95, d1: -0.55, c2: -0.75, d2: -0.55,
  });

  const animations = {
    jab: [
      0.24,
      [[0, {}], [0.18, jabPrep], [0.4, jabHit], [0.58, jabHit], [1, {}]],
      0,
      { trail: "arm1", impact: 0.4 },
    ],
    cross: [
      0.3,
      [[0, {}], [0.25, crossPrep], [0.48, crossHit], [0.62, crossHit], [1, {}]],
      0,
      { trail: "arm2", impact: 0.48 },
    ],
    hook: [
      0.36,
      [
        [0, {}], [0.24, hookPrep], [0.4, hookArc],
        [0.56, hookHit], [0.7, hookHit], [1, {}],
      ],
      0,
      { trail: "arm1", impact: 0.56 },
    ],
    uppercut: [
      0.4,
      [
        [0, {}], [0.28, upperDip], [0.42, upperScoop],
        [0.6, upperHit], [0.76, upperHit], [1, {}],
      ],
      0,
      { trail: "arm1", impact: 0.6 },
    ],
    box_block: [
      0.4,
      [[0, {}], [0.14, guardUp], [0.7, guardUp], [1, {}]],
      0,
    ],
    box_parry: [
      0.34,
      [[0, {}], [0.22, parryReady], [0.45, parrySweep], [0.7, parrySweep], [1, {}]],
      0,
      { trail: "arm1", impact: 0.45 },
    ],
    // Pendiente de decisión mecánica (Etapa 4): aún no está conectada a ninguna tecla.
    box_dodge: [
      0.38,
      [[0, {}], [0.25, dodgeLow], [0.6, dodgeLow], [1, {}]],
      0,
    ],
    // Anticipaciones del rival: sostienen la preparación hasta que llega el golpe.
    box_windJab: [0.4, [[0, {}], [1, jabPrep]], 1],
    box_windCross: [0.4, [[0, {}], [1, crossPrep]], 1],

    // Reacciones al impacto, una por golpe recibido.
    box_hurtJab: [
      0.3,
      [[0, {}], [0.12, { ln: -0.28, hx: -8, hy: 2, a1: 0.5, b1: 1.4 }], [1, {}]],
      0,
    ],
    box_hurtCross: [
      0.46,
      [
        [0, {}],
        [
          0.18,
          planted({
            ln: -0.62, bn: -0.25, hx: -22,
            a1: 0.3, b1: 0.6, a2: 0.2, b2: 0.5,
            c1: 0.9, d1: 0.2, c2: -0.2, d2: 0.2,
          }),
        ],
        [0.55, { ln: -0.5, bn: -0.15, hx: -17 }],
        [1, {}],
      ],
      0,
    ],
    box_hurtHook: [
      0.5,
      [
        [0, {}],
        [
          0.15,
          { hx: -26, hy: 6, ln: 0.55, bn: 0.3, a1: 2, b1: 2.4, a2: 1.9, b2: 2.2 },
        ],
        [0.6, { hx: -18, hy: 4, ln: 0.35, bn: 0.15 }],
        [1, {}],
      ],
      0,
    ],
    box_hurtUppercut: [
      0.58,
      [
        [0, {}],
        [
          0.18,
          knees({
            hy: -28, hx: -14, ln: -0.4, bn: -0.35, rt: -0.45,
            a1: 2.7, b1: 2.9, a2: 2.5, b2: 2.8,
            c1: 0.5, d1: 0.9, c2: -0.2, d2: 0.5,
          }),
        ],
        [0.45, { hy: -32, hx: -16, ln: -0.45, bn: -0.35, rt: -0.6 }],
        [0.8, { hy: 2, ln: -0.3, rt: -0.1, hx: -8 }],
        [1, {}],
      ],
      0,
    ],
  };

  return {
    name: "boxing",
    animations,
    // Traduce los nombres genéricos que usa el combate a poses de boxeo.
    // Carriles de ataque: A jab, S cross, D hook, F uppercut. Los nombres jab,
    // cross, hook y uppercut son los de app.MOVES y apuntan directo a su pose;
    // los antiguos (punch, kick...) se siguen traduciendo para el enemigo y la demo.
    alias: {
      punch: "jab",
      kick: "cross",
      gancho: "hook",
      heavy: "uppercut",
      block: "box_block",
      parry: "box_parry",
      windP: "box_windJab",
      windK: "box_windCross",
    },
    // Reacción del rival según el carril de ataque recibido (0..3).
    reactions: [
      "box_hurtJab",
      "box_hurtCross",
      "box_hurtHook",
      "box_hurtUppercut",
    ],
    names: ["¡JAB!", "¡CROSS!", "¡HOOK!", "¡UPPERCUT!"],
    // Nombres de las acciones defensivas; `dodge` solo es una animación de
    // práctica hasta que se decida su integración mecánica (Etapa 4).
    labels: { block: "BLOQUEO", parry: "PARRY", dodge: "ESQUIVA" },
    dodge: "box_dodge",
    glove: true,
    // Color de estelas y energía del estilo (el cuerpo conserva el del jugador).
    color: "#ffb21a",
  };
}
