// Estilo Taekwondo: datos puros (sin DOM ni Canvas).
//
// Las convenciones de ángulos y poses están en pose-tools.js. La pierna 1 es la
// que patea; la pierna 2 sostiene el cuerpo. Se prioriza el alcance, la
// elevación de la pierna, la inclinación atrás del torso para equilibrarse y el
// giro del cuerpo (`tw`) en las patadas giratorias.

import { createPoseTools } from "./pose-tools.js";

export function createTaekwondoStyle(base) {
  const { pose, planted, knees } = createPoseTools(base);

  // Guardia alta y abierta, propia del Taekwondo.
  const guardLead = [0.9, 2.7];
  const guardRear = [0.55, 2.3];
  // Pierna de apoyo casi recta, con la rodilla apenas flexionada.
  const post = { c2: 0.12, d2: -0.12 };

  // --- Patada frontal: la rodilla sube y la pierna se extiende al frente ------
  const frontChamber = pose({
    ln: -0.12, bn: 0, hx: 3,
    arm1: guardLead, arm2: guardRear,
    c1: 1.35, d1: -0.3, ...post,
  });
  const frontHit = pose({
    ln: -0.42, bn: -0.1, hx: 12,
    arm1: [0.6, 1.2], arm2: [1.0, 2.7],
    c1: 1.55, d1: 1.6, c2: 0.05, d2: -0.14,
  });

  // --- Patada lateral: gran inclinación atrás y pierna horizontal -------------
  const sideChamber = pose({
    ln: -0.45, bn: -0.1, hx: -2,
    arm1: [0.5, 0.2], arm2: [2.0, 2.4],
    c1: 1.25, d1: -0.55, c2: 0.25, d2: -0.15,
  });
  const sideHit = pose({
    ln: -0.82, bn: -0.14, hx: 8,
    arm1: [0.1, -0.35], arm2: [2.2, 2.8],
    c1: 1.57, d1: 1.6, c2: 0.3, d2: -0.22,
  });

  // --- Patada giratoria: el cuerpo gira 360° (`tw` 1 -> 0 -> -1 -> 0 -> 1) -----
  const spinWind = pose({
    ln: 0.12, bn: 0.05, hx: -7,
    arm1: guardLead, arm2: guardRear,
    c1: 0.7, d1: -0.3, c2: -0.3, d2: -0.55,
  });
  const spinEdge = pose({
    ln: 0.08, hx: -4, tw: 0.08,
    arm1: [1.2, 2.2], arm2: [0.8, 2.4],
    c1: 0.9, d1: -0.45, c2: 0.05, d2: -0.2,
  });
  const spinBack = pose({
    ln: 0.2, bn: 0.06, hx: 0, tw: -1,
    arm1: [1.0, 2.3], arm2: [0.9, 2.5],
    c1: 1.25, d1: -0.6, c2: 0.1, d2: -0.25,
  });
  const spinEdge2 = pose({
    ln: 0.05, hx: 6, tw: -0.1,
    arm1: [1.2, 2.2], arm2: [0.8, 2.4],
    c1: 1.45, d1: 0.5, c2: 0.1, d2: -0.25,
  });
  const spinHit = pose({
    ln: -0.52, bn: -0.1, hx: 16, tw: 1,
    arm1: [0.5, 0.9], arm2: [2.0, 2.6],
    c1: 1.55, d1: 1.62, c2: 0.2, d2: -0.2,
  });

  // --- Patada saltando: impulso vertical y patada aérea ----------------------
  const jumpDip = pose({
    ln: 0.22, bn: 0.08, hx: -7,
    arm1: [0.5, 1.4], arm2: [0.3, 1.2],
    c1: 1.0, d1: -0.7, c2: 0.9, d2: -0.9,
  });
  const jumpRise = pose({
    ln: -0.1, hx: 8, hy: -22,
    arm1: [2.0, 2.6], arm2: [1.6, 2.4],
    c1: 1.25, d1: -0.55, c2: 0.95, d2: -0.7,
    air: true,
  });
  const jumpHit = pose({
    ln: -0.35, bn: -0.12, hx: 22, hy: -30,
    arm1: [0.6, 1.0], arm2: [2.0, 2.7],
    c1: 1.56, d1: 1.6, c2: 1.0, d2: -0.8,
    air: true,
  });
  const jumpFall = pose({
    ln: 0.05, hx: 26, hy: -10,
    arm1: [0.9, 2.5], arm2: [0.6, 2.2],
    c1: 0.9, d1: -0.3, c2: 0.5, d2: -0.4,
    air: true,
  });

  // --- Defensas --------------------------------------------------------------
  const highBlock = pose({
    ln: 0.14, bn: 0.06, hx: -5,
    arm1: [2.35, 3.05], arm2: [1.0, 2.9],
    c1: 0.85, d1: -0.4, c2: -0.35, d2: -0.85,
  });
  // Desvío evasivo: el cuerpo se retira, la mano barre y sale una patada corta.
  const deflectLean = pose({
    ln: -0.55, bn: 0.08, hx: -16,
    arm1: [1.4, 1.0], arm2: guardRear,
    c1: 0.35, d1: 0.1, c2: -0.3, d2: -0.55,
  });
  const deflectKick = pose({
    ln: -0.34, bn: -0.08, hx: 6,
    arm1: [0.8, 2.4], arm2: [0.6, 1.0],
    c1: 1.25, d1: 1.4, c2: 0.1, d2: -0.15,
  });

  const animations = {
    tkd_front: [
      0.34,
      [[0, {}], [0.3, frontChamber], [0.52, frontHit], [0.7, frontHit], [1, {}]],
      0,
      { trail: "leg1", impact: 0.52 },
    ],
    tkd_side: [
      0.42,
      [[0, {}], [0.34, sideChamber], [0.56, sideHit], [0.74, sideHit], [1, {}]],
      0,
      { trail: "leg1", impact: 0.56 },
    ],
    tkd_spin: [
      0.7,
      [
        [0, {}], [0.14, spinWind], [0.3, spinEdge], [0.44, spinBack],
        [0.58, spinEdge2], [0.72, spinHit], [0.84, spinHit], [1, {}],
      ],
      0,
      { trail: "leg1", impact: 0.72 },
    ],
    tkd_jump: [
      0.62,
      [
        [0, {}], [0.2, jumpDip], [0.38, jumpRise], [0.56, jumpHit],
        [0.7, jumpHit], [0.86, jumpFall], [1, {}],
      ],
      0,
      { trail: "leg1", impact: 0.56 },
    ],
    tkd_block: [
      0.42,
      [[0, {}], [0.14, highBlock], [0.7, highBlock], [1, {}]],
      0,
    ],
    tkd_deflect: [
      0.46,
      [
        [0, {}], [0.22, deflectLean], [0.4, deflectLean],
        [0.6, deflectKick], [0.74, deflectKick], [1, {}],
      ],
      0,
      { trail: "leg1", impact: 0.6 },
    ],
    // Anticipaciones del rival: sostienen la preparación hasta que llega el golpe.
    tkd_windFront: [0.4, [[0, {}], [1, frontChamber]], 1],
    tkd_windSide: [0.4, [[0, {}], [1, sideChamber]], 1],

    // Reacciones al impacto, una por patada recibida.
    tkd_hurtFront: [
      0.42,
      [
        [0, {}],
        [
          0.16,
          planted({
            ln: 0.48, bn: 0.32, hx: -15,
            a1: 0.4, b1: 0.9, a2: 0.3, b2: 0.8,
            c1: 0.7, d1: -0.2, c2: -0.2, d2: -0.6,
          }),
        ],
        [0.6, { ln: 0.3, bn: 0.18, hx: -9 }],
        [1, {}],
      ],
      0,
    ],
    tkd_hurtSide: [
      0.58,
      [
        [0, {}],
        [
          0.14,
          planted({
            ln: -0.55, bn: -0.2, hx: -36,
            a1: 0.1, b1: -0.25, a2: 0.2, b2: -0.1,
            c1: 0.9, d1: 0.3, c2: -0.1, d2: -0.5,
          }),
        ],
        [0.55, { ln: -0.4, hx: -30 }],
        [1, {}],
      ],
      0,
    ],
    tkd_hurtSpin: [
      0.66,
      [
        [0, {}],
        [
          0.16,
          planted({
            ln: -0.75, bn: -0.25, hx: -32, rt: -0.3, tw: 0.45,
            a1: 2.4, b1: 2.7, a2: 2.0, b2: 2.4,
            c1: 0.8, d1: 0.2, c2: -0.2, d2: -0.7,
          }),
        ],
        [0.55, { ln: -0.5, hx: -26, rt: -0.15, tw: 0.8 }],
        [1, {}],
      ],
      0,
    ],
    tkd_hurtJump: [
      0.62,
      [
        [0, {}],
        [
          0.18,
          knees({
            hy: -24, hx: -28, ln: -0.4, bn: -0.3, rt: -0.55,
            a1: 2.6, b1: 2.9, a2: 2.4, b2: 2.7,
            c1: 0.9, d1: 0.2, c2: 0.3, d2: -0.3,
          }),
        ],
        [0.5, { hy: -28, hx: -34, ln: -0.5, rt: -0.65 }],
        [0.82, { hy: 2, hx: -20, ln: -0.3, rt: -0.1 }],
        [1, {}],
      ],
      0,
    ],
  };

  return {
    name: "taekwondo",
    animations,
    // Carriles de ataque: A frontal, S lateral, D giratoria, F saltando.
    alias: {
      jab: "tkd_front",
      cross: "tkd_side",
      hook: "tkd_spin",
      uppercut: "tkd_jump",
      punch: "tkd_front",
      kick: "tkd_side",
      gancho: "tkd_spin",
      heavy: "tkd_jump",
      block: "tkd_block",
      parry: "tkd_deflect",
      windP: "tkd_windFront",
      windK: "tkd_windSide",
    },
    reactions: [
      "tkd_hurtFront",
      "tkd_hurtSide",
      "tkd_hurtSpin",
      "tkd_hurtJump",
    ],
    names: ["¡FRONTAL!", "¡LATERAL!", "¡GIRATORIA!", "¡SALTO!"],
    labels: { block: "BLOQUEO ALTO", parry: "DESVÍO + PATADA" },
    glove: false,
    color: "#3fa9ff",
  };
}
