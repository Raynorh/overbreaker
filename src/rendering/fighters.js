import { createBoxingStyle } from "./styles/boxing.js";
import { createTaekwondoStyle } from "./styles/taekwondo.js";
import { createBoxeadorStyle } from "./styles/boxeador.js";

// Installs this system into one application instance; initialization is deferred.
export function install(app) {
  app.mkF = function mkF(face, col, dk) {
    const q = {},
      v = {};
    for (const k of app.PK) {
      q[k] = app.BASE[k];
      v[k] = 0;
    }
    const styles = app.fightStyles || {};
    return {
      face,
      col,
      dk,
      hp: 100,
      bars: 2,
      style: (face === 1 ? styles.p : styles.e) || app.DEFAULT_STYLE,
      // Asignar una animación cancela cualquier reacción pendiente.
      _an: "idle",
      pend: null,
      get an() {
        return this._an;
      },
      set an(name) {
        this._an = name;
        this.pend = null;
      },
      at: 0,
      x: 0,
      ph: face * 1.3,
      q,
      v,
      tr: [],
      fl: 0,
      sb: {},
    };
  };
  app.tgt = function tgt(f) {
    const b = Object.assign({}, app.BASE, f.sb),
      A = app.animation(f);
    b.hy += Math.sin(app.clock * 7 + f.ph) * 2.5;
    b.hx += Math.sin(app.clock * 3.5 + f.ph) * 3;
    b.a1 += Math.sin(app.clock * 7 + f.ph + 1) * 0.06;
    b.rot = 0;
    if (!A) return b;
    const fr = A[1],
      p = Math.min(1, f.at / A[0]);
    let i = 0;
    while (i < fr.length - 2 && p > fr[i + 1][0]) i++;
    const t0 = fr[i][0],
      t1 = fr[i + 1][0],
      k0 = fr[i][1],
      k1 = fr[i + 1][1],
      w = t1 > t0 ? Math.max(0, Math.min(1, (p - t0) / (t1 - t0))) : 1,
      s = w * w * (3 - 2 * w),
      o = {};
    for (const k of app.PK) {
      const x = k0[k] !== undefined ? k0[k] : b[k],
        y = k1[k] !== undefined ? k1[k] : b[k];
      o[k] = x + (y - x) * s;
    }
    o.rot = f.an === "flip" ? -p * 6.283 : 0;
    return o;
  };
  // Versión oscura de un color (para los miembros traseros y los bordes).
  app.darken = function darken(hex, k = 0.45) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return "#173d12";
    return (
      "#" +
      [1, 3, 5]
        .map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0"))
        .join("")
    );
  };
  // Avanza un luchador un fotograma: tiempo de animación, destello, reacción
  // pendiente y resorte. `fd` es el tiempo visual y `dt` el real.
  app.stepFighter = function stepFighter(f, fd, dt) {
    f.at += fd;
    if (f.fl > 0) f.fl -= dt;
    if (f.pend) {
      f.pend.t -= fd;
      if (f.pend.t <= 0) {
        const { an } = f.pend;
        f.an = an;
        f.at = 0;
        f.fl = app.flashTime(f);
      }
    }
    const A = app.animation(f);
    if (A && !A[2] && f.at >= A[0]) f.an = "idle";
    app.spring(f, fd);
  };
  // Duración del destello blanco al recibir un golpe; cada estilo puede acortarlo
  // para que no tape su animación de reacción.
  app.flashTime = function flashTime(f) {
    const style = app.STYLES[f.style];
    return style && style.flash !== undefined ? style.flash : 0.18;
  };
  // Segundos después del instante de la nota (o de pulsar la defensa) en que el golpe
  // del rival conecta. Cae dentro de la ventana de defensa.
  app.ENEMY_IMPACT_OFFSET = 0.09;
  // Segundos que tarda el golpe en conectar desde que arranca su animación.
  app.impactDelayOf = function impactDelayOf(f, an) {
    const style = app.STYLES[f.style];
    const A = app.AN[(style && style.alias[an]) || an];
    return A && A[3] && A[3].impact ? A[0] * A[3].impact : 0;
  };
  app.impactDelay = function impactDelay(attacker) {
    return app.impactDelayOf(attacker, attacker.an);
  };
  // Cola de efectos que deben ocurrir en el instante del impacto (chispas, sonido,
  // sacudida). Avanza con el tiempo visual, así que respeta la pausa.
  app.pending = [];
  app.later = function later(delay, fn) {
    if (!(delay > 0)) return fn();
    app.pending.push({ t: delay, fn });
  };
  app.runLater = function runLater(fd) {
    if (!app.pending.length) return;
    const due = [];
    app.pending = app.pending.filter((item) => {
      item.t -= fd;
      if (item.t > 0) return true;
      due.push(item);
      return false;
    });
    for (const item of due) item.fn();
  };
  // Pone un estado puntual (adrenalina, cansancio, victoria...) solo si el estilo
  // del luchador tiene animación para él; si no, no cambia nada.
  app.playState = function playState(f, name) {
    const style = app.STYLES[f.style];
    if (!style || !style.alias[name]) return false;
    f.an = name;
    f.at = 0;
    return true;
  };
  // Defensa a mostrar: la perfecta usa el contraataque del estilo si lo tiene.
  app.defenseAnimation = function defenseAnimation(f, kind, perfect) {
    const style = app.STYLES[f.style];
    const counter = kind === "block" ? "blockC" : "parryC";
    return perfect && style && style.alias[counter] ? counter : kind;
  };
  // Punto del cuerpo ("head" o "torso") en pantalla, para colocar impactos y chispas
  // sobre el luchador y no en el aire. `gy` y `s` son el suelo y la escala del dibujo.
  app.bodyPoint = function bodyPoint(f, part, gy, s) {
    const style = app.STYLES[f.style];
    if (style && style.sprite) {
      const name = app.animationName(f),
        clip = style.sprite.clips[name] || style.sprite.clips.gif_idle;
      const point = style.sprite.frameAt(clip, f.at)[part === "torso" ? "torso" : "head"];
      const k = (100 * s) / style.sprite.manifest.height;
      const shift = style.sprite.shiftAt(name, f.at) * s;
      return [f.x + f.face * (point[0] * k + shift), gy - 2 * s + point[1] * k];
    }
    return [f.x, gy - (part === "torso" ? 55 : 85) * s];
  };
  // Punto de impacto de un golpe del carril indicado sobre el luchador `f`.
  app.hitPoint = function hitPoint(f, lane, gy, s) {
    const style = app.STYLES[f.style];
    const part = (style && style.hitTargets && style.hitTargets[lane]) || "head";
    return app.bodyPoint(f, part, gy, s);
  };
  // Programa la reacción del rival para el momento del impacto.
  app.scheduleReaction = function scheduleReaction(target, an, delay) {
    if (!(delay > 0)) {
      target.an = an;
      target.at = 0;
      target.fl = app.flashTime(target);
      return;
    }
    target.pend = { an, t: delay };
  };
  // Texto flotante del golpe, propio del estilo del luchador.
  app.moveName = function moveName(f, lane) {
    const style = app.STYLES[f.style];
    return (style && style.names && style.names[lane]) || app.NAMES[lane];
  };
  // Estilos de ambos luchadores: { p: jugador, e: rival }.
  app.setFightStyles = function setFightStyles(styles) {
    const valid = (name) => (app.STYLES[name] ? name : app.DEFAULT_STYLE);
    app.fightStyles = { p: valid(styles.p), e: valid(styles.e) };
  };
  // Resuelve la animación activa: el estilo del luchador traduce los nombres
  // genéricos del combate (punch, block...) a sus propias poses.
  app.animationName = function animationName(f) {
    const style = app.STYLES[f.style];
    return (style && style.alias[f.an]) || f.an;
  };
  app.animation = function animation(f) {
    return app.AN[app.animationName(f)];
  };
  // Animación de reacción del rival ante un golpe del carril indicado.
  app.reactionAnimation = function reactionAnimation(f, lane) {
    const style = app.STYLES[f.style];
    return (style && style.reactions[lane]) || "hurt";
  };
  // Miembro que deja estela: "arm1", "arm2", "leg" o null.
  app.trailSource = function trailSource(f) {
    if (["punch", "kick", "gancho", "heavy"].includes(f.an) && !app.STYLES[f.style])
      return f.an === "kick" || f.an === "heavy" ? "leg1" : "arm1";
    const A = app.animation(f);
    return (A && A[3] && A[3].trail) || null;
  };
  app.spring = function spring(f, dt) {
    const T = app.tgt(f),
      n = Math.max(1, Math.ceil(dt / 0.008)),
      h = dt / n;
    for (let j = 0; j < n; j++)
      for (const k of app.PK) {
        const K = k === "hx" || k === "hy" ? 450 : 650,
          C = 1.5 * Math.sqrt(K);
        f.v[k] += ((T[k] - f.q[k]) * K - f.v[k] * C) * h;
        f.q[k] += f.v[k] * h;
      }
    f.rot = T.rot;
    // Las estelas guardan la punta del miembro respecto al suelo bajo el
    // luchador (unidades sin escalar), para dibujarse en pantalla sin deformarse.
    if (dt > 0) {
      const source = app.trailSource(f);
      if (source) {
        const sk = app.skeleton(f, 1),
          tip = sk[source];
        f.tr.push([f.face * (f.q.hx + tip[0]), -52 + f.q.hy + tip[1]]);
        if (f.tr.length > 10) f.tr.shift();
      } else f.tr.length = 0;
    }
  };
  // Cinemática del luchador en coordenadas locales con origen en la cadera
  // (x hacia delante, y hacia abajo), sin espejo ni traslación. Compartida por
  // el dibujo y las estelas. Convención heredada: el ángulo de brazo es relativo
  // al pecho y gira en sentido contrario a la inclinación.
  app.skeleton = function skeleton(f, s) {
    const q = f.q,
      ll = (26 + Math.min(14, Math.max(0, q.hy)) * 0.5) * s,
      arm = 21 * s,
      chest = q.ln + (q.bn || 0),
      rot = (f.rot || 0) + (q.rt || 0);
    const turn = (x, y, a) => [
      x * Math.cos(a) - y * Math.sin(a),
      x * Math.sin(a) + y * Math.cos(a),
    ];
    const waist = turn(0, -12 * s, q.ln);
    const up = (d) => {
      const v = turn(0, -d * s, chest);
      return [waist[0] + v[0], waist[1] + v[1]];
    };
    const reach = (from, len, a, b) => {
      const k = [from[0] + len * Math.sin(a), from[1] + len * Math.cos(a)];
      return [k, [k[0] + len * Math.sin(b), k[1] + len * Math.cos(b)]];
    };
    const shoulder = up(13);
    const [elbow1, arm1] = reach(shoulder, arm, q.a1 - chest, q.b1 - chest);
    const [elbow2, arm2] = reach(shoulder, arm, q.a2 - chest, q.b2 - chest);
    const [knee1, ankle1] = reach([0, 0], ll, q.c1, q.d1);
    const [knee2, ankle2] = reach([0, 0], ll, q.c2, q.d2);
    // El pie queda perpendicular a la espinilla, con la punta hacia delante.
    const toe = (ankle, d) => [
      ankle[0] + 8 * s * Math.cos(d),
      ankle[1] - 8 * s * Math.sin(d),
    ];
    const joints = {
      hip: [0, 0],
      waist,
      shoulder,
      neck: up(17),
      head: up(27),
      eye: (() => {
        const v = turn(4 * s, -1 * s, chest);
        const h = up(27);
        return [h[0] + v[0], h[1] + v[1]];
      })(),
      elbow1,
      arm1,
      elbow2,
      arm2,
      knee1,
      ankle1,
      knee2,
      ankle2,
      leg1: toe(ankle1, q.d1),
      leg2: toe(ankle2, q.d2),
    };
    // Giro sobre el eje del cuerpo: comprime en x (y refleja al pasar de 0).
    const twist = q.tw === undefined ? 1 : q.tw;
    if (twist !== 1)
      for (const k of Object.keys(joints)) joints[k] = [joints[k][0] * twist, joints[k][1]];
    if (rot)
      for (const k of Object.keys(joints)) joints[k] = turn(joints[k][0], joints[k][1], rot);
    return joints;
  };
  const rgba = (hex, alpha) =>
    "rgba(" +
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",") +
    "," +
    alpha +
    ")";
  app.drawF = function drawF(f, aura, gy, s, g) {
    const q = f.q,
      style = app.STYLES[f.style],
      source = app.trailSource(f),
      glove = !!(style && style.glove);
    g.fillStyle = "#0006";
    g.beginPath();
    g.ellipse(f.x, gy, 30 * s, 5 * s, 0, 0, 6.29);
    g.fill();
    if (aura) {
      g.shadowColor = "#ffd23f";
      g.shadowBlur = 14;
    }
    const fl = f.fl > 0,
      c = fl ? "#fff" : aura ? "#ffd23f" : f.col,
      dk = fl ? "#ddd" : aura ? "#d9a800" : f.dk;
    if (style && style.sprite) {
      const name = app.animationName(f),
        clip = style.sprite.clips[name] || style.sprite.clips.gif_idle;
      style.sprite.sheets.draw(g, {
        frame: style.sprite.frameAt(clip, f.at),
        x: f.x + f.face * style.sprite.shiftAt(name, f.at) * s,
        y: gy - 2 * s,
        scale: (100 * s) / style.sprite.manifest.height,
        face: f.face,
        tint: c,
        flat: fl ? "#ffffff" : null,
      });
      g.shadowBlur = 0;
      return;
    }
    const sk = app.skeleton(f, s);
    const ox = f.x + f.face * q.hx * s,
      oy = gy - 52 * s + q.hy * s;
    const P = (name) => [ox + f.face * sk[name][0], oy + sk[name][1]];
    const dot = (p, r, col) => {
      g.fillStyle = col;
      g.beginPath();
      g.arc(p[0], p[1], r, 0, 6.29);
      g.fill();
    };
    // Segmento que se estrecha: relleno con un borde oscuro para separar capas.
    const RIM = "rgba(0,0,0,0.38)";
    const cap = (a, ra, b, rb, color, grow) => {
      const dx = b[0] - a[0],
        dy = b[1] - a[1],
        len = Math.hypot(dx, dy) || 1,
        nx = -dy / len,
        ny = dx / len,
        r0 = ra * s + grow,
        r1 = rb * s + grow;
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(a[0] + nx * r0, a[1] + ny * r0);
      g.lineTo(b[0] + nx * r1, b[1] + ny * r1);
      g.lineTo(b[0] - nx * r1, b[1] - ny * r1);
      g.lineTo(a[0] - nx * r0, a[1] - ny * r0);
      g.fill();
      dot(a, r0, color);
      dot(b, r1, color);
    };
    // Primero el contorno de toda la cadena y luego su relleno: sin aro en las
    // articulaciones interiores, solo en la silueta.
    const limb = (names, radii, col) => {
      for (const [grow, color] of [[1.1 * s, RIM], [0, col]])
        for (let i = 0; i < names.length - 1; i++)
          cap(P(names[i]), radii[i], P(names[i + 1]), radii[i + 1], color, grow);
    };
    const hand = (name, col) => {
      const p = P(name),
        r = (glove ? 6.4 : 3.8) * s;
      dot(p, r + 1.1 * s, RIM);
      dot(p, r, col);
    };
    const foot = (ankle, toeName, col) => {
      cap(P(ankle), 3, P(toeName), 2.4, RIM, 1.1 * s);
      cap(P(ankle), 3, P(toeName), 2.4, col, 0);
    };

    // Capas, de atrás hacia delante: pierna y brazo traseros, tronco, delanteros.
    limb(["hip", "knee2", "ankle2"], [5, 3.9, 3], dk);
    foot("ankle2", "leg2", dk);
    limb(["hip", "knee1", "ankle1"], [5, 3.9, 3], c);
    foot("ankle1", "leg1", c);
    limb(["shoulder", "elbow2", "arm2"], [3.8, 3.2, 2.6], dk);
    hand("arm2", dk);
    limb(["hip", "waist", "shoulder", "neck"], [4.6, 4.3, 5.4, 3.2], c);
    dot(P("head"), 9.6 * s + 1.1 * s, RIM);
    dot(P("head"), 9.6 * s, c);
    dot(P("eye"), 1.8 * s, "#000");
    limb(["shoulder", "elbow1", "arm1"], [3.8, 3.2, 2.6], c);
    hand("arm1", c);

    // El resplandor del aura solo afecta al cuerpo: se apaga siempre al terminar
    // para no teñir el resto de la escena.
    g.shadowBlur = 0;
    // Estela del miembro que golpea, con el color del estilo.
    if (source && f.tr.length > 1) {
      g.lineCap = "round";
      g.lineJoin = "round";
      const color = (style && style.color) || "#ffffff";
      const at = (point) => [f.x + point[0] * s, gy + point[1] * s];
      for (let i = 1; i < f.tr.length; i++) {
        const a = at(f.tr[i - 1]),
          b = at(f.tr[i]),
          k = i / f.tr.length;
        for (const [width, alpha, tint] of [
          [14, 0.28, color],
          [6, 0.85, "#ffffff"],
        ]) {
          g.strokeStyle = tint === color ? rgba(color, alpha * k) : "rgba(255,255,255," + alpha * k + ")";
          g.lineWidth = width * s * k;
          g.beginPath();
          g.moveTo(a[0], a[1]);
          g.lineTo(b[0], b[1]);
          g.stroke();
        }
      }
    }
  };
  return function initialize() {
    // bn: flexión del torso superior; rt: inclinación del cuerpo entero alrededor de
    // la cadera; tw: giro sobre su eje (1 de frente, 0 de canto, -1 de espaldas).
    app.PK = ["hx", "hy", "ln", "bn", "rt", "a1", "b1", "a2", "b2", "c1", "d1", "c2", "d2", "tw"];
    app.BASE = {
      hx: 0,
      hy: 0,
      ln: 0.1,
      bn: 0,
      rt: 0,
      tw: 1,
      a1: 1,
      b1: 1.9,
      a2: 0.5,
      b2: 1.5,
      c1: 0.45,
      d1: -0.1,
      // Pierna trasera con la rodilla hacia delante (muslo menos atrás que la espinilla).
      c2: -0.2,
      d2: -0.45,
    };
    app.GU = { a1: 1.5, b1: 2.9, a2: 1.3, b2: 2.8, ln: -0.1, hy: 9, hx: -4 };
    app.DN0 = {
      ln: -1.45,
      hy: 42,
      hx: -22,
      a1: 0.6,
      b1: 0.3,
      a2: 0.5,
      b2: 0.3,
      c1: 1.2,
      d1: 0.5,
      c2: 1,
      d2: 0.3,
    };
    app.P1 = {
      a1: 2.6,
      b1: 2.9,
      a2: 0.9,
      b2: 1.5,
      ln: 0.05,
      hy: 6,
      c1: 0.7,
      d1: -0.1,
      c2: -0.6,
      d2: -0.1,
    };
    app.P2 = {
      a1: 1.7,
      b1: 1.7,
      a2: -1.7,
      b2: -1.7,
      ln: -0.1,
      hy: 5,
      c1: 0.75,
      d1: -0.05,
      c2: -0.75,
      d2: -0.05,
    };
    app.AN = {
      pose1: [
        1,
        [
          [0, {}],
          [0.5, app.P1],
          [1, app.P1],
        ],
        1,
      ],
      pose2: [
        1,
        [
          [0, {}],
          [0.5, app.P2],
          [1, app.P2],
        ],
        1,
      ],
      down: [
        1,
        [
          [0, {}],
          [0.25, app.DN0],
          [1, app.DN0],
        ],
        1,
      ],
      getup: [
        0.7,
        [
          [0, app.DN0],
          [0.6, { ln: 0.3, hy: 12 }],
          [1, {}],
        ],
      ],
      punch: [
        0.28,
        [
          [0, {}],
          [0.2, { a1: 0.4, b1: 0.9, ln: -0.1, hx: -5 }],
          [0.4, { a1: 1.57, b1: 1.57, ln: 0.4, hx: 16, a2: 1, b2: 2.4 }],
          [1, {}],
        ],
      ],
      kick: [
        0.4,
        [
          [0, {}],
          [0.25, { c1: 0.9, d1: -0.8, ln: -0.2, hx: -2, a1: 1.4, b1: 2.2 }],
          [0.45, { c1: 1.5, d1: 1.5, ln: -0.35, hx: 12 }],
          [1, {}],
        ],
      ],
      gancho: [
        0.42,
        [
          [0, {}],
          [0.22, { a1: -0.1, b1: 0.5, ln: -0.3, hy: 12, hx: -4 }],
          [0.5, { a1: 2.5, b1: 2.9, ln: 0.3, hy: -9, hx: 12, c1: 0.6 }],
          [1, {}],
        ],
      ],
      heavy: [
        0.55,
        [
          [0, {}],
          [
            0.28,
            {
              ln: -0.55,
              a1: 0.3,
              b1: 0.6,
              a2: 0.3,
              b2: 0.6,
              c1: 0.9,
              d1: -0.3,
              hx: -8,
            },
          ],
          [
            0.55,
            {
              c1: 1.7,
              d1: 1.7,
              ln: -0.6,
              a1: 2.3,
              b1: 2.3,
              a2: -0.9,
              b2: -0.9,
              hx: 20,
            },
          ],
          [1, {}],
        ],
      ],
      block: [
        0.4,
        [
          [0, {}],
          [0.15, app.GU],
          [0.7, app.GU],
          [1, {}],
        ],
      ],
      parry: [
        0.32,
        [
          [0, {}],
          [0.2, { a1: 2, b1: 2.7, ln: 0.2, hx: 6 }],
          [0.6, { a1: 2, b1: 2.7, ln: 0.2, hx: 6 }],
          [1, {}],
        ],
      ],
      hurt: [
        0.42,
        [
          [0, {}],
          [
            0.15,
            { ln: -0.6, hx: -16, a1: 0.2, b1: 0.4, a2: 0.1, b2: 0.3, hy: 3 },
          ],
          [1, {}],
        ],
      ],
      stun: [
        0.7,
        [
          [0, {}],
          [
            0.2,
            { ln: 0.55, hy: 10, a1: 0.2, b1: 0.2, a2: 0.3, b2: 0.2, hx: -4 },
          ],
          [
            0.8,
            { ln: 0.55, hy: 10, a1: 0.2, b1: 0.2, a2: 0.3, b2: 0.2, hx: -4 },
          ],
          [1, {}],
        ],
      ],
      flip: [
        0.9,
        [
          [0, {}],
          [0.2, { hy: 14, ln: 0.2 }],
          [
            0.5,
            {
              hy: -60,
              a1: 2,
              b1: 2.4,
              a2: 2,
              b2: 2.4,
              c1: 0.8,
              d1: 1.5,
              c2: 0.6,
              d2: 1.4,
            },
          ],
          [1, {}],
        ],
      ],
      windP: [
        0.4,
        [
          [0, {}],
          [1, { a1: 0.4, b1: 0.9, ln: -0.2, hx: -6, hy: 3 }],
        ],
        1,
      ],
      windK: [
        0.4,
        [
          [0, {}],
          [1, { c1: 0.9, d1: -0.8, ln: -0.3, hx: -3, a1: 1.4, b1: 2.2 }],
        ],
        1,
      ],
      open: [
        0.4,
        [
          [0, {}],
          [1, { ln: -0.35, a1: 0.3, b1: 0.5, a2: 0.2, b2: 0.4, hy: 5, hx: -6 }],
        ],
        1,
      ],
    };
    app.SB = {
      atk: { ln: 0.24, hx: 4 },
      def: app.GU,
      con: { a1: 1.7, b1: 2.3, ln: 0.05, c1: 0.6 },
    };
    // Estilos de lucha: cada uno aporta animaciones propias a la tabla común.
    app.STYLES = {
      boxeador: createBoxeadorStyle(),
      boxing: createBoxingStyle(app.BASE),
      taekwondo: createTaekwondoStyle(app.BASE),
    };
    // Estilo por defecto: el Boxeador animado con los GIF.
    app.DEFAULT_STYLE = "boxeador";
    // Empieza a cargar las hojas de sprites ya, para que no tarden en aparecer.
    for (const style of Object.values(app.STYLES))
      if (style.sprite) style.sprite.sheets.ready();
    // Estilo elegido por la dirección web, p. ej. ?jugador=taekwondo&rival=boxing
    // (o ?estilo=taekwondo para ambos). Sin parámetros, ambos son Boxeo.
    const query =
      typeof location !== "undefined" && location.search
        ? new URLSearchParams(location.search)
        : null;
    const both = query && query.get("estilo");
    app.setFightStyles({
      p: (query && query.get("jugador")) || both,
      e: (query && query.get("rival")) || both,
    });
    for (const style of Object.values(app.STYLES))
      Object.assign(app.AN, style.animations);
    app.tx = (s, x, y, sz, c, al) => {
      app.g.font = "bold " + sz + "px system-ui,sans-serif";
      app.g.fillStyle = c;
      app.g.textAlign = al || "center";
      app.g.fillText(s, x, y);
    };
  };
}
