import test from "node:test";
import assert from "node:assert/strict";
import { loadApplication, createRecordingContext } from "./helpers/browser-stub.js";

const app = await loadApplication();
const boxing = app.STYLES.boxing;
// Estas pruebas verifican el Boxeo dibujado con código; el estilo por defecto del
// juego es el Boxeador con GIF (ver sprites.test.js).
app.setFightStyles({ p: "boxing", e: "boxing" });

function startMatch() {
  app.newMatch();
  app.loop(16);
  app.R.intro = 0;
  app.R.notes = [];
  app.R.p.an = "idle";
  app.R.e.an = "idle";
}
// Coloca una nota y la pulsa en el instante exacto, como un acierto PERFECT.
function hit(lane, role) {
  const note = { l: lane, t: app.R.t + 1, T: 2, role };
  app.R.notes = [note];
  app.R.t = note.t;
  app.press(lane);
  return note;
}

test("cada animación de cada estilo es válida y usa solo articulaciones conocidas", () => {
  const all = Object.values(app.STYLES).flatMap((style) => Object.entries(style.animations));
  for (const [name, [duration, frames, hold, meta]] of all) {
    assert.ok(duration > 0, name);
    assert.equal(frames[0][0], 0, name + " empieza en 0");
    assert.equal(frames.at(-1)[0], 1, name + " termina en 1");
    frames.forEach(([time, pose], index) => {
      if (index) assert.ok(time > frames[index - 1][0], name + " fotogramas ordenados");
      for (const [key, value] of Object.entries(pose)) {
        assert.ok(app.PK.includes(key), name + " clave " + key);
        assert.ok(Number.isFinite(value), name + "." + key);
      }
    });
    if (meta && meta.impact !== undefined)
      assert.ok(meta.impact > 0 && meta.impact < 1, name + " impacto");
    if (!hold) assert.deepEqual(frames.at(-1)[1], {}, name + " regresa a la guardia");
  }
});

test("alias y reacciones de cada estilo apuntan a animaciones registradas", () => {
  for (const style of Object.values(app.STYLES)) {
    for (const target of Object.values(style.alias)) assert.ok(app.AN[target], target);
    assert.equal(style.reactions.length, 4);
    for (const target of style.reactions) assert.ok(app.AN[target], target);
    // Los estilos con sprites pueden reutilizar una reacción si falta un GIF propio.
    assert.ok(new Set(style.reactions).size >= (style.sprite ? 3 : 4), "reacciones distintas");
    for (const move of app.MOVES)
      assert.ok(app.AN[style.alias[move] || move], style.name + " cubre " + move);
    assert.equal(style.names.length, 4);
  }
});

test("las rodillas siempre se doblan hacia delante en todas las poses", () => {
  const legs = [["c1", "d1"], ["c2", "d2"]];
  for (const style of Object.values(app.STYLES))
    for (const [name, [, frames]] of Object.entries(style.animations))
      for (const [, pose] of frames)
        for (const [c, d] of legs)
          if (pose[c] !== undefined && pose[d] !== undefined)
            assert.ok(pose[c] >= pose[d] - 1e-9, name + " " + c + "/" + d);
  const base = app.BASE;
  assert.ok(base.c1 >= base.d1 && base.c2 >= base.d2, "postura base");
});

test("los pies tocan el suelo en las poses apoyadas", () => {
  const drop = (pose) => {
    const q = { ...app.BASE, ...pose };
    const ll = 26 + Math.min(14, Math.max(0, q.hy)) * 0.5;
    return q.hy + ll * Math.max(Math.cos(q.c1) + Math.cos(q.d1), Math.cos(q.c2) + Math.cos(q.d2));
  };
  const idle = drop(app.BASE);
  for (const name of ["jab", "cross", "hook", "uppercut", "box_block", "tkd_front", "tkd_side", "tkd_block"]) {
    const frames = app.AN[name][1];
    for (const [, pose] of frames)
      if (pose.hy !== undefined && pose.c1 !== undefined && pose.hy >= 0)
        assert.ok(Math.abs(drop(pose) - idle) < 0.6, name + " pie en el suelo");
  }
});

test("un acierto reproduce el golpe de su carril y la reacción propia del rival al impactar", () => {
  const expected = [
    ["jab", "box_hurtJab"],
    ["cross", "box_hurtCross"],
    ["hook", "box_hurtHook"],
    ["uppercut", "box_hurtUppercut"],
  ];
  expected.forEach(([move, reaction], lane) => {
    startMatch();
    hit(lane);
    assert.equal(app.animation(app.R.p), app.AN[move], "golpe carril " + lane);
    assert.equal(app.R.p.at, 0);
    // El rival aún no reacciona: el puño no ha llegado.
    assert.equal(app.R.e.an, "idle", "sin reacción antes del impacto");
    assert.equal(app.R.e.pend.an, reaction, "reacción programada carril " + lane);
    const delay = app.impactDelay(app.R.p);
    assert.ok(delay > 0.04 && delay < 0.3, "impacto en " + delay);
    app.stepFighter(app.R.e, delay - 0.01, 0);
    assert.equal(app.R.e.an, "idle", "todavía antes del impacto");
    app.stepFighter(app.R.e, 0.02, 0.02);
    assert.equal(app.R.e.an, reaction, "reacción en el impacto carril " + lane);
    assert.equal(app.R.e.pend, null);
  });
});

test("asignar otra animación cancela la reacción pendiente (p. ej. un KO)", () => {
  startMatch();
  hit(0);
  assert.ok(app.R.e.pend);
  app.R.e.an = "down";
  assert.equal(app.R.e.pend, null);
  app.stepFighter(app.R.e, 1, 1);
  assert.equal(app.R.e.an, "down");
});

test("bloqueo y parry validados usan las poses defensivas de boxeo", () => {
  startMatch();
  hit(4, "def");
  assert.equal(app.animation(app.R.p), app.AN.box_block);
  startMatch();
  hit(5, "def");
  assert.equal(app.animation(app.R.p), app.AN.box_parry);
});

test("una pulsación fallada no activa ninguna animación de éxito", () => {
  startMatch();
  const note = { l: 1, t: app.R.t + 1, T: 2 };
  app.R.notes = [note];
  const comboBefore = app.R.cb;
  // Dos errores (el tercero activaría el castigo del rival, que ya existía).
  app.press(0); // carril equivocado
  app.R.t = note.t - 0.9; // carril correcto pero fuera de ventana
  app.press(1);
  assert.equal(app.R.p.an, "idle");
  assert.equal(app.R.e.an, "idle");
  assert.equal(note.done, undefined);
  assert.equal(app.R.cb, comboBefore);
});

test("un golpe bloqueado por el rival conserva su pose defensiva", () => {
  startMatch();
  app.R.ai.guardLane = 0;
  app.R.ai.guardUntil = app.R.t + 5;
  const original = Math.random;
  Math.random = () => 0.99; // sin parry: bloqueo
  try {
    hit(0);
  } finally {
    Math.random = original;
  }
  assert.equal(app.R.e.an, "block");
  assert.equal(app.R.e.pend, null, "un golpe bloqueado no programa reacción");
});

test("la animación termina y vuelve a idle sin quedarse atascada", () => {
  startMatch();
  hit(1);
  for (let frame = 1; frame < 80; frame++) app.loop(16 + frame * 16);
  assert.equal(app.R.p.an, "idle");
});

test("el dibujo respeta orientación y color personalizados", () => {
  const draw = (face, color) => {
    const fighter = app.mkF(face, color, "#123456");
    fighter.x = 400;
    fighter.ph = 0; // misma fase de balanceo en reposo para comparar espejos
    fighter.an = "punch";
    for (let i = 0; i < 20; i++) {
      fighter.at += 0.01;
      app.spring(fighter, 0.01);
    }
    const ctx = createRecordingContext();
    app.drawF(fighter, 0, 300, 1, ctx);
    return ctx.fills;
  };
  const right = draw(1, "#ff00aa");
  const left = draw(-1, "#ff00aa");
  assert.equal(right.length, left.length);
  // El espejo invierte el orden de los vértices, así que se comparan como conjuntos.
  const key = ([x, y]) => [x.toFixed(4), y.toFixed(4)].join(",");
  right.forEach((shape, i) => {
    const mirrored = shape.points.map(([x, y]) => key([800 - x, y])).sort();
    assert.deepEqual(left[i].points.map(key).sort(), mirrored, "forma " + i);
  });
  assert.ok(right.some((s) => s.color === "#ff00aa"), "usa el color del jugador");
  assert.ok(right.some((s) => s.color === "#123456"), "usa el color oscuro");
});

test("el esqueleto respeta la inclinación del torso y el giro del cuerpo", () => {
  const fighter = app.mkF(1, "#fff", "#ccc");
  const upright = app.skeleton(fighter, 1);
  fighter.q.bn = 0.6;
  const bent = app.skeleton(fighter, 1);
  assert.ok(bent.head[0] > upright.head[0], "la flexión adelanta la cabeza");
  assert.deepEqual(bent.hip, [0, 0]);
  fighter.q.bn = 0;
  fighter.q.rt = Math.PI / 2;
  const turned = app.skeleton(fighter, 1);
  // Girado 90°, la cabeza (antes arriba) queda delante de la cadera.
  assert.ok(Math.abs(turned.head[1]) < 1e-9 + Math.abs(upright.head[0]) + 1);
  assert.ok(turned.head[0] > 30, "la cabeza cae hacia delante");
});

test("las estelas toman el color del estilo y se limpian al terminar el golpe", () => {
  const fighter = app.mkF(1, "#00ff88", "#003322");
  fighter.an = "punch";
  for (let i = 0; i < 12; i++) {
    fighter.at += 0.01;
    app.spring(fighter, 0.01);
  }
  assert.ok(fighter.tr.length > 1 && fighter.tr.length <= 10);
  const ctx = createRecordingContext();
  app.drawF(fighter, 0, 300, 1, ctx);
  assert.ok(ctx.strokes.some((s) => s.color.startsWith("rgba(255,178,26")));
  fighter.an = "idle";
  app.spring(fighter, 0.01);
  assert.equal(fighter.tr.length, 0);
});

test("el resplandor del aura nunca queda activo después de dibujar un luchador", () => {
  for (const an of ["idle", "jab", "tkd_jump"]) {
    const fighter = app.mkF(1, "#ff00aa", "#123456");
    fighter.an = an;
    fighter.at = 0.2;
    const ctx = createRecordingContext();
    app.drawF(fighter, 1, 300, 1, ctx);
    assert.equal(ctx.shadowBlur ?? 0, 0, "shadowBlur apagado con aura en " + an);
  }
});

test("el giro del cuerpo comprime y refleja el esqueleto", () => {
  const fighter = app.mkF(1, "#fff", "#ccc");
  const front = app.skeleton(fighter, 1);
  fighter.q.tw = 0;
  const edge = app.skeleton(fighter, 1);
  fighter.q.tw = -1;
  const back = app.skeleton(fighter, 1);
  assert.ok(Math.abs(edge.leg1[0]) < 1e-9 && Math.abs(edge.arm1[0]) < 1e-9);
  assert.ok(Math.abs(back.arm1[0] + front.arm1[0]) < 1e-9);
  assert.equal(back.arm1[1], front.arm1[1]);
});

test("el estilo de cada luchador se elige por separado y cambia el repertorio", () => {
  app.setFightStyles({ p: "taekwondo", e: "boxing" });
  try {
    startMatch();
    assert.equal(app.R.p.style, "taekwondo");
    assert.equal(app.R.e.style, "boxing");
    assert.equal(app.moveName(app.R.p, 0), "¡FRONTAL!");
    assert.equal(app.moveName(app.R.e, 0), "¡JAB!");
    hit(2);
    assert.equal(app.animation(app.R.p), app.AN.tkd_spin);
    assert.equal(app.R.e.pend.an, "box_hurtHook");
    app.setFightStyles({ p: "boxing", e: "taekwondo" });
    startMatch();
    hit(3);
    assert.equal(app.R.e.pend.an, "tkd_hurtJump");
  } finally {
    app.setFightStyles({ p: "boxing", e: "boxing" });
  }
});

test("un estilo desconocido vuelve al estilo por defecto", () => {
  app.setFightStyles({ p: "inexistente", e: undefined });
  assert.deepEqual(app.fightStyles, { p: app.DEFAULT_STYLE, e: app.DEFAULT_STYLE });
  app.setFightStyles({ p: "boxing", e: "boxing" });
});
