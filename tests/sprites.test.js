import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadApplication, createRecordingContext } from "./helpers/browser-stub.js";
import { BOXEADOR } from "../src/assets/boxeador/manifest.js";
import { spriteFrame } from "../src/rendering/styles/boxeador.js";

const app = await loadApplication();
const style = app.STYLES.boxeador;

function pngSize(path) {
  const data = readFileSync(new URL(path, import.meta.url));
  assert.equal(data.subarray(1, 4).toString(), "PNG");
  return { w: data.readUInt32BE(16), h: data.readUInt32BE(20) };
}

test("las hojas de sprites existen y su tamaño coincide con el manifiesto", () => {
  const rows = Object.keys(BOXEADOR.clips).length;
  for (const file of ["body.png", "gloves.png"]) {
    const size = pngSize("../src/assets/boxeador/" + file);
    assert.equal(size.w, BOXEADOR.cell.w * 4, file + " ancho");
    assert.equal(size.h, BOXEADOR.cell.h * rows, file + " alto");
  }
  assert.ok(BOXEADOR.anchor.y <= BOXEADOR.cell.h && BOXEADOR.anchor.x < BOXEADOR.cell.w);
});

test("cada clip apunta a una fila real y a cuadros que existen", () => {
  for (const [name, clip] of Object.entries(style.sprite.clips)) {
    assert.ok(Number.isInteger(clip.row) && clip.row >= 0, name + " fila");
    assert.equal(clip.frames.length, clip.times.length, name);
    for (const frame of clip.frames) assert.ok(frame >= 0 && frame < 4, name + " cuadro");
    clip.times.forEach((time, i) => i && assert.ok(time > clip.times[i - 1], name + " tiempos"));
    assert.ok(clip.times.at(-1) < clip.duration, name + " dura más que su último cuadro");
    assert.ok(app.AN[name], name + " registrada como animación");
  }
});

test("el cuadro mostrado avanza con el tiempo, se repite en bucle y se mantiene en pausa", () => {
  const jab = style.sprite.clips.gif_jab;
  assert.equal(spriteFrame(jab, 0), 0);
  assert.equal(spriteFrame(jab, 0.1), 1, "cuadro de impacto");
  assert.equal(spriteFrame(jab, 0.2), 2);
  assert.equal(spriteFrame(jab, 99), 3, "no pasa del último cuadro");
  const idle = style.sprite.clips.gif_idle;
  assert.equal(spriteFrame(idle, 0.7), spriteFrame(idle, 0.7 - idle.duration), "bucle");
  const wind = style.sprite.clips.gif_windCross;
  assert.equal(spriteFrame(wind, 0), spriteFrame(wind, 5), "anticipación fija");
});

test("el impacto de cada golpe cae en su cuadro de impacto", () => {
  for (const [lane, name] of [["jab", "gif_jab"], ["cross", "gif_cross"], ["hook", "gif_hook"], ["uppercut", "gif_uppercut"]]) {
    const clip = style.sprite.clips[name];
    const fraction = app.AN[name][3].impact;
    assert.ok(Math.abs(fraction * clip.duration - clip.times[clip.impact]) < 1e-9, lane);
    assert.ok(fraction * clip.duration < 0.2, lane + " conecta rápido");
  }
});

test("todos los nombres de animación del juego se resuelven a una animación con sprite", () => {
  const needed = ["idle", "jab", "cross", "hook", "uppercut", "punch", "kick", "gancho", "heavy", "block", "parry", "hurt", "stun", "down", "getup", "windP", "windK", "open", "pose1", "pose2", "flip"];
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
  fighter.at = 0.1;
  let { calls } = spyDraw(fighter);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].face, -1, "mira a la izquierda");
  assert.equal(calls[0].tint, "#ff00aa", "color del jugador");
  assert.equal(calls[0].flat, null);
  assert.equal(calls[0].column, 1);
  assert.equal(calls[0].x, 400);
  assert.ok(calls[0].scale > 0.5 && calls[0].scale < 1.5);
  fighter.fl = 0.1;
  ({ calls } = spyDraw(fighter));
  assert.equal(calls[0].tint, "#fff", "destello blanco");
  assert.equal(calls[0].flat, "#ffffff");
  fighter.fl = 0;
  let result = spyDraw(fighter, 1);
  assert.equal(result.calls[0].tint, "#ffd23f", "aura dorada");
  assert.equal(result.ctx.shadowBlur ?? 0, 0, "sin resplandor residual");
});

test("sin navegador el estilo con sprites no falla al dibujar", () => {
  const fighter = app.mkF(1, "#69ff36", "#173d12");
  fighter.style = "boxeador";
  assert.doesNotThrow(() => app.drawF(fighter, 0, 300, 2, createRecordingContext()));
});

test("el juego usa el Boxeador con GIF por defecto y la reacción llega al impactar", () => {
  assert.equal(app.DEFAULT_STYLE, "boxeador");
  app.setFightStyles({});
  app.newMatch();
  app.loop(16);
  app.R.intro = 0;
  app.R.notes = [];
  assert.equal(app.R.p.style, "boxeador");
  const note = { l: 1, t: app.R.t + 1, T: 2 };
  app.R.notes = [note];
  app.R.t = note.t;
  app.press(1);
  assert.equal(app.animationName(app.R.p), "gif_cross");
  assert.equal(app.R.e.pend.an, "gif_hurtCross");
  app.stepFighter(app.R.e, app.impactDelay(app.R.p) + 0.01, 0.02);
  assert.equal(app.animationName(app.R.e), "gif_hurtCross");
});

test("el destello de impacto de los sprites es corto y el de los demás estilos no cambia", () => {
  const sprite = app.mkF(1, "#fff", "#ccc");
  sprite.style = "boxeador";
  const code = app.mkF(1, "#fff", "#ccc");
  code.style = "boxing";
  assert.ok(app.flashTime(sprite) <= 0.1);
  assert.equal(app.flashTime(code), 0.18);
  app.scheduleReaction(sprite, "gif_hurtJab", 0);
  assert.equal(sprite.fl, app.flashTime(sprite));
});
