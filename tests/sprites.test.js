import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadApplication, createRecordingContext } from "./helpers/browser-stub.js";
import { BOXEADOR } from "../src/assets/boxeador/manifest.js";
import { spriteStep, spriteShift } from "../src/rendering/styles/boxeador.js";

const app = await loadApplication();
const style = app.STYLES.boxeador;

function pngSize(path) {
  const data = readFileSync(new URL(path, import.meta.url));
  assert.equal(data.subarray(1, 4).toString(), "PNG");
  return { w: data.readUInt32BE(16), h: data.readUInt32BE(20) };
}

function startMatch() {
  app.setFightStyles({});
  app.newMatch();
  app.loop(16);
  app.R.intro = 0;
  app.R.notes = [];
}
// Coloca una nota y la pulsa en el instante exacto, como un acierto PERFECT.
function hit(lane, extra = {}) {
  const note = { l: lane, t: app.R.t + 1, T: 2, ...extra };
  app.R.notes = [note];
  app.R.t = note.t;
  app.press(lane);
  return note;
}

test("el atlas existe, su tamaño coincide con el manifiesto y los cuadros caben dentro", () => {
  for (const file of ["body.png", "gloves.png"]) {
    const size = pngSize("../src/assets/boxeador/" + file);
    assert.equal(size.w, BOXEADOR.atlas.w, file + " ancho");
    assert.equal(size.h, BOXEADOR.atlas.h, file + " alto");
  }
  const boxes = [];
  for (const [name, clip] of Object.entries(BOXEADOR.clips)) {
    assert.equal(clip.frames.length, 4, name + " tiene 4 cuadros");
    for (const f of clip.frames) {
      assert.ok(f.x >= 0 && f.y >= 0 && f.x + f.w <= BOXEADOR.atlas.w && f.y + f.h <= BOXEADOR.atlas.h, name);
      boxes.push(f);
    }
  }
  assert.ok(BOXEADOR.atlas.w * BOXEADOR.atlas.h < 3_000_000, "atlas ligero para móviles");
  // Ningún cuadro pisa a otro.
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, "cuadros solapados");
    }
});

test("los 21 movimientos están incorporados y cada cuadro tiene cabeza y torso sobre el suelo", () => {
  assert.equal(Object.keys(BOXEADOR.clips).length, 21);
  const lying = (name) => name.includes("caer") || name.includes("levantarse");
  for (const [name, clip] of Object.entries(BOXEADOR.clips))
    clip.frames.forEach((f, index) => {
      // Tumbado, la cabeza y el torso quedan a ras del suelo (últimos cuadros de la caída
      // y primeros de levantarse).
      const onFloor = (name.includes("caer") && index === 3) || (name.includes("levantarse") && index === 0);
      if (onFloor) return;
      assert.ok(f.head[1] < 0 && f.torso[1] < 0, name + " " + index + ": cabeza y torso por encima de los pies");
      assert.ok(lying(name) || f.head[1] <= f.torso[1] + 1, name + " " + index + ": la cabeza no está bajo el torso");
    });
  // El uppercut ya no pierde el guante: el cuadro del golpe sube por encima de la cabeza.
  const strike = BOXEADOR.clips.uppercut.frames[2];
  assert.ok(strike.oy < BOXEADOR.clips.uppercut.frames[0].oy - 20, "el brazo levantado cabe en el cuadro");
});

test("cada clip apunta a un movimiento y cuadros reales, y está registrado como animación", () => {
  for (const [name, clip] of Object.entries(style.sprite.clips)) {
    assert.ok(BOXEADOR.clips[clip.row], name + " movimiento " + clip.row);
    assert.equal(clip.frames.length, clip.times.length, name);
    for (const frame of clip.frames) assert.ok(frame >= 0 && frame < 4, name + " cuadro");
    clip.times.forEach((time, i) => i && assert.ok(time > clip.times[i - 1], name + " tiempos"));
    assert.ok(clip.times.at(-1) < clip.duration, name + " dura más que su último cuadro");
    assert.ok(app.AN[name], name + " registrada como animación");
  }
});

test("el cuadro avanza con el tiempo, se repite en bucle y se mantiene al terminar", () => {
  const jab = style.sprite.clips.gif_jab;
  assert.equal(spriteStep(jab, 0), 0, "el jab ya está extendido al empezar");
  assert.equal(spriteStep(jab, 0.12), 1);
  assert.equal(spriteStep(jab, 99), 2, "no pasa del último cuadro");
  const idle = style.sprite.clips.gif_idle;
  assert.equal(spriteStep(idle, 0.7), spriteStep(idle, 0.7 - idle.duration), "bucle");
  const fall = style.sprite.clips.gif_fall;
  assert.equal(spriteStep(fall, 50), 3, "caído se queda en el suelo");
  assert.equal(app.AN.gif_fall[2], 1, "la caída no vuelve sola a reposo");
});

test("el golpe conecta en su cuadro de impacto y rápido", () => {
  for (const name of ["gif_jab", "gif_cross", "gif_hook", "gif_uppercut", "gif_blockCounter", "gif_dodgeCounter"]) {
    const clip = style.sprite.clips[name];
    const delay = app.AN[name][0] * app.AN[name][3].impact;
    assert.ok(Math.abs(delay - clip.times[clip.impact]) < 1e-9, name);
    assert.ok(delay < 0.2, name + " conecta rápido");
  }
});

test("todos los nombres de animación del juego se resuelven a una animación con sprite", () => {
  const needed = ["idle", "jab", "cross", "hook", "uppercut", "punch", "kick", "gancho", "heavy", "block", "parry", "blockC", "parryC", "hurt", "stun", "down", "getup", "windP", "windK", "adren", "tired", "win", "open", "pose1", "pose2", "flip"];
  for (const an of needed) {
    const fighter = app.mkF(1, "#fff", "#ccc");
    fighter.style = "boxeador";
    fighter.an = an;
    const name = app.animationName(fighter);
    assert.ok(style.sprite.clips[name], an + " -> " + name);
    assert.ok(app.animation(fighter), an + " tiene duración");
  }
});

// Sustituye la hoja por un espía para comprobar qué se dibujaría.
function spyDraw(fighter, aura = 0) {
  const calls = [];
  const original = style.sprite.sheets.draw;
  style.sprite.sheets.draw = (g, args) => (calls.push(args), true);
  try {
    const ctx = createRecordingContext();
    app.drawF(fighter, aura, 300, 2, ctx);
    return { calls, ctx };
  } finally {
    style.sprite.sheets.draw = original;
  }
}

test("el dibujo con sprites respeta orientación, color, destello y aura", () => {
  const fighter = app.mkF(-1, "#ff00aa", "#123456");
  fighter.style = "boxeador";
  fighter.x = 400;
  fighter.an = "jab";
  fighter.at = 0.12;
  let { calls } = spyDraw(fighter);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].face, -1, "mira a la izquierda");
  assert.equal(calls[0].tint, "#ff00aa", "color del jugador");
  assert.equal(calls[0].flat, null);
  assert.equal(calls[0].frame, style.sprite.clips.gif_jab.source[2], "cuadro de recuperación");
  assert.ok(Math.abs(calls[0].x - (400 - spriteShift("gif_jab", 0.12) * 2)) < 1e-9, "x incluye el avance, hacia la izquierda");
  assert.ok(calls[0].scale > 0.5 && calls[0].scale < 1.5);
  fighter.fl = 0.1;
  ({ calls } = spyDraw(fighter));
  assert.equal(calls[0].tint, "#fff", "destello blanco");
  assert.equal(calls[0].flat, "#ffffff");
  fighter.fl = 0;
  const result = spyDraw(fighter, 1);
  assert.equal(result.calls[0].tint, "#ffd23f", "aura dorada");
  assert.equal(result.ctx.shadowBlur ?? 0, 0, "sin resplandor residual");
});

test("sin navegador el estilo con sprites no falla al dibujar", () => {
  const fighter = app.mkF(1, "#69ff36", "#173d12");
  fighter.style = "boxeador";
  assert.doesNotThrow(() => app.drawF(fighter, 0, 300, 2, createRecordingContext()));
});

test("los puntos de impacto caen sobre el cuerpo dibujado, espejados según la orientación", () => {
  const right = app.mkF(1, "#fff", "#ccc"), left = app.mkF(-1, "#fff", "#ccc");
  for (const f of [right, left]) f.style = "boxeador", (f.x = 500);
  const gy = 400, s = 2;
  const head = app.bodyPoint(right, "head", gy, s), torso = app.bodyPoint(right, "torso", gy, s);
  assert.ok(head[1] < torso[1] && torso[1] < gy, "cabeza sobre el torso y ambos sobre el suelo");
  assert.ok(gy - head[1] > 70 * s * 0.6 && gy - head[1] < 105 * s, "altura de cabeza razonable");
  const mirrored = app.bodyPoint(left, "head", gy, s);
  assert.ok(Math.abs(head[0] - 500 + (mirrored[0] - 500)) < 1e-6, "espejo en x");
  assert.equal(head[1], mirrored[1]);
  assert.deepEqual(app.hitPoint(right, 0, gy, s), head, "los golpes van a la cabeza");
  // Un estilo sin sprites mantiene una altura fija razonable.
  const code = app.mkF(1, "#fff", "#ccc");
  code.style = "boxing";
  assert.ok(app.bodyPoint(code, "head", gy, s)[1] < gy);
});

test("las chispas, el número y el sonido del golpe llegan en el impacto y sobre el cuerpo", () => {
  startMatch();
  const seen = [];
  const off = ["spark", "sound:hit"].map((type) => app.events.on(type, (...args) => seen.push([type, ...args])));
  try {
    hit(1); // cross: conecta tras su preparación
    assert.equal(seen.length, 0, "nada ocurre antes de que el puño llegue");
    const delay = app.impactDelay(app.R.p);
    assert.ok(delay > 0.04);
    app.runLater(delay - 0.01);
    assert.equal(seen.length, 0, "todavía no");
    app.runLater(0.02);
    const spark = seen.find(([type]) => type === "spark");
    assert.ok(spark && seen.some(([type]) => type === "sound:hit"), "chispa y sonido en el impacto");
    const [, x, y] = spark;
    const [bx, by] = app.hitPoint(app.R.e, 1, app.gy(), app.sc());
    assert.ok(Math.abs(x - bx) < 1e-6 && Math.abs(y - by) < 1e-6, "sobre la cabeza del rival");
    assert.ok(y < app.gy() - 60 * app.sc(), "no a la altura de las piernas");
  } finally {
    off.forEach((fn) => fn());
  }
});

test("el rival golpea justo después del instante de la nota, para coincidir con tu defensa", () => {
  startMatch();
  app.R.ai = null;
  const note = { l: 4, t: app.R.t + 1.2, T: 2, role: "def" };
  app.R.notes = [note];
  let impactAt = null;
  for (let i = 0; i < 400 && impactAt === null; i++) {
    app.update(1 / 120);
    if (note.s) impactAt = app.R.t + app.impactDelayOf(app.R.e, "punch");
  }
  assert.ok(impactAt !== null, "el rival ataca");
  assert.ok(Math.abs(impactAt - (note.t + 0.09)) < 0.02, "impacto " + (impactAt - note.t).toFixed(3) + " s tras la nota");
});

test("estados puntuales: solo se aplican si el estilo tiene esa pose", () => {
  const sprite = app.mkF(1, "#fff", "#ccc"), code = app.mkF(1, "#fff", "#ccc");
  sprite.style = "boxeador";
  code.style = "boxing";
  for (const state of ["adren", "tired", "win"]) {
    assert.ok(app.playState(sprite, state), state);
    assert.equal(app.animationName(sprite), style.alias[state]);
    code.an = "idle";
    assert.equal(app.playState(code, state), false, state + " ignorado sin pose");
    assert.equal(code.an, "idle");
  }
  assert.equal(app.defenseAnimation(sprite, "block", true), "blockC");
  assert.equal(app.defenseAnimation(sprite, "parry", true), "parryC");
  assert.equal(app.defenseAnimation(sprite, "block", false), "block");
  assert.equal(app.defenseAnimation(code, "block", true), "block", "sin contraataque en otros estilos");
});

test("una defensa perfecta contraataca y el rival reacciona cuando conecta", () => {
  startMatch();
  app.R.e.an = "idle";
  const note = { l: 4, t: app.R.t + 1, T: 2, role: "def" };
  app.R.notes = [note];
  app.R.t = note.t;
  app.press(4);
  assert.equal(app.R.p.an, "blockC");
  assert.ok(app.R.e.pend, "reacción del rival programada para el contraataque");
});

test("las animaciones de otros luchadores y el destello corto no cambian los demás estilos", () => {
  const sprite = app.mkF(1, "#fff", "#ccc"), code = app.mkF(1, "#fff", "#ccc");
  sprite.style = "boxeador";
  code.style = "boxing";
  assert.ok(app.flashTime(sprite) <= 0.1);
  assert.equal(app.flashTime(code), 0.18);
});

test("el juego usa el Boxeador con GIF por defecto y la reacción llega al impactar", () => {
  assert.equal(app.DEFAULT_STYLE, "boxeador");
  startMatch();
  assert.equal(app.R.p.style, "boxeador");
  hit(1);
  assert.equal(app.animationName(app.R.p), "gif_cross");
  assert.equal(app.R.e.pend.an, "gif_hurtCross");
  app.stepFighter(app.R.e, app.impactDelay(app.R.p) + 0.01, 0.02);
  assert.equal(app.animationName(app.R.e), "gif_hurtCross");
});

test("el avance y el retroceso son continuos y terminan donde empieza el reposo", () => {
  assert.equal(spriteShift("gif_idle", 1), 0, "sin desplazamiento en reposo");
  for (const name of Object.keys(style.sprite.clips)) {
    const clip = style.sprite.clips[name];
    // Sin saltos bruscos: el desplazamiento entre dos instantes cercanos es pequeño.
    for (let t = 0; t < clip.duration; t += 0.01)
      assert.ok(Math.abs(spriteShift(name, t + 0.01) - spriteShift(name, t)) < 3, name + " salto en " + t.toFixed(2));
    // Los movimientos que vuelven a la guardia empiezan y terminan en 0, sin saltos.
    if (!clip.stay && !clip.loop) {
      assert.ok(Math.abs(spriteShift(name, clip.duration)) < 0.5, name + " termina en 0");
      if (name !== "gif_getup") assert.ok(Math.abs(spriteShift(name, 0)) < 0.5, name + " empieza en 0");
    }
  }
  assert.ok(spriteShift("gif_cross", 0.14) > 5, "el cross se lanza hacia delante");
  assert.ok(spriteShift("gif_hurtCross", 0.2) < -10, "el golpeado retrocede");
  assert.equal(spriteShift("gif_getup", 0), spriteShift("gif_fall", 99), "levantarse empieza donde cayó");
});

test("las chispas siguen al cuerpo aunque se desplace", () => {
  const f = app.mkF(1, "#fff", "#ccc");
  f.style = "boxeador";
  f.x = 300;
  f.an = "cross";
  f.at = 0.14;
  const moved = app.bodyPoint(f, "head", 400, 2);
  f.at = 0.0;
  const start = app.bodyPoint(f, "head", 400, 2);
  assert.ok(moved[0] > start[0] + 8, "la cabeza avanza con el golpe");
});

test("en el juego, una defensa perfecta evita que el rival complete su golpe y no te daña", () => {
  startMatch();
  app.R.ai = null;
  const note = { l: 4, t: app.R.t + 1.2, T: 2, role: "def" };
  app.R.notes = [note];
  const hp = app.R.hp;
  const seen = new Set();
  let pressed = false;
  // Solo se observa esta nota (el juego sigue generando notas después).
  for (let i = 0; i < 280; i++) {
    if (!pressed && app.R.t >= note.t) {
      app.press(4);
      pressed = true;
    }
    app.update(1 / 120);
    // Lo que hace el bucle de dibujo en cada cuadro.
    app.stepFighter(app.R.p, 1 / 120, 1 / 120);
    app.stepFighter(app.R.e, 1 / 120, 1 / 120);
    app.runLater(1 / 120);
    seen.add(app.animationName(app.R.e));
  }
  assert.ok(pressed && note.cr, "defensa perfecta con contraataque");
  assert.ok(!seen.has("gif_cross"), "el rival no llegó a completar su golpe");
  assert.ok(seen.has("gif_hurtJab"), "recibió el contraataque");
  assert.equal(app.R.hp, hp, "el jugador no recibió daño");
});
