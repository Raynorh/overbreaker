import test from "node:test";
import assert from "node:assert/strict";
import { loadApplication } from "./helpers/browser-stub.js";

const app = await loadApplication();
app.recordMatchHistory = () => {};

function startFinale() {
  app.setFightStyles({});
  app.newMatch();
  app.loop(16);
  app.R.intro = 0;
  app.R.notes = [];
  app.R.e.bars = 1;
  app.startFin();
  return app.R.fin;
}
const record = (types) => {
  const seen = [];
  const off = types.map((type) => app.events.on(type, (...args) => seen.push([type, ...args])));
  return { seen, stop: () => off.forEach((fn) => fn()) };
};
const run = (seconds, until = () => false) => {
  for (let t = 0; t < seconds && !until(); t += 1 / 60) app.update(1 / 60);
};

test("en el Ultra una nota fallada no lo cancela: la ráfaga final siempre se completa", () => {
  const F = startFinale();
  let started = false;
  const original = app.startFrenzy;
  app.startFrenzy = () => ((started = true), original());
  try {
    run(30, () => !app.R.fin);
  } finally {
    app.startFrenzy = original;
  }
  assert.ok(started, "empezó la ráfaga final");
  assert.ok(F.miss > 0, "se contaron los fallos");
  assert.equal(app.R.fin, null, "el Ultra terminó");
  assert.equal(app.M.won, true, "y la partida se ganó");
});

test("se puede pulsar libremente: golpe visible, sin puntos y sin castigo", () => {
  const F = startFinale();
  const score = app.M.score, errors = app.R.badPresses || 0;
  app.R.notes = []; // ninguna nota cerca
  app.press(2);
  assert.equal(app.R.p.an, "hook", "el luchador golpea");
  assert.equal(app.M.score, score, "sin puntos por pulsar de más");
  assert.equal(app.R.badPresses || 0, errors, "sin error");
  assert.ok(!F.st, "no se interrumpe");
});

test("las teclas defensivas no hacen nada durante el Ultra", () => {
  const F = startFinale();
  app.R.p.an = "idle";
  app.press(4);
  app.press(5);
  assert.equal(app.R.p.an, "idle");
  assert.ok(!F.st);
  assert.ok(app.R.notes.every((n) => n.l <= 3), "no caen notas defensivas");
});

test("acertar una nota del Ultra sigue dando puntos", () => {
  startFinale();
  const note = { l: 1, t: app.R.t + 0.5, T: 0.8 };
  app.R.notes = [note];
  app.R.t = note.t;
  const score = app.M.score;
  app.press(1);
  assert.ok(note.done);
  assert.ok(app.M.score > score);
});

test("la ráfaga final es automática, muy rápida y solo suena a golpes potentes", () => {
  const F = startFinale();
  app.R.notes = [];
  const sounds = record(["sound:swing", "sound:hit", "sound:miss", "sound:perf", "sound:block", "sound:parry", "sound:hurt", "sound:ready", "sound:counter"]);
  let startTime = null, strikes = 0;
  const strike = app.finStrike;
  app.finStrike = (...args) => (strikes++, strike(...args));
  try {
    app.update(1 / 60); // todas las notas están hechas: arranca la ráfaga
    assert.ok(F.frenzy, "ráfaga iniciada");
    startTime = app.R.t;
    // Pulsar durante la ráfaga no la interrumpe ni añade golpes.
    app.press(0);
    app.press(4);
    run(10, () => !app.R.fin || F.ready);
  } finally {
    app.finStrike = strike;
    sounds.stop();
  }
  assert.equal(strikes, 22, "22 golpes automáticos");
  const duration = app.R.t - startTime;
  assert.ok(duration < 2.2, "muy rápida: " + duration.toFixed(2) + " s");
  const kinds = new Set(sounds.seen.map(([type]) => type));
  assert.ok(kinds.has("sound:hit"));
  for (const other of ["sound:swing", "sound:miss", "sound:perf", "sound:block", "sound:parry", "sound:hurt", "sound:ready"])
    assert.ok(!kinds.has(other), "no suena " + other);
  assert.ok(sounds.seen.filter(([type]) => type === "sound:hit").every((e) => e[3] === 99 && e[4] === true), "siempre golpes potentes");
});

test("la ráfaga no se interrumpe aunque no se acierte ninguna nota", () => {
  const F = startFinale();
  run(40, () => !app.R.fin);
  assert.equal(F.hit, 0);
  assert.equal(app.M.won, true);
});

test("si golpeas mientras el rival ataca y no aciertas, los golpes chocan", () => {
  app.setFightStyles({});
  app.newMatch();
  app.loop(16);
  app.R.intro = 0;
  const clashes = record(["sound:clash", "spark"]);
  try {
    // Ataque enemigo inminente (nota defensiva) y pulsación de un carril de ataque sin nota.
    app.R.notes = [{ l: 4, t: app.R.t + 0.2, T: 1, role: "def", ai: 1 }];
    app.wrongPress(0);
    assert.ok(clashes.seen.some(([type]) => type === "sound:clash"), "suena el choque");
    assert.ok(clashes.seen.some(([type]) => type === "spark"), "con chispa entre ambos");
    clashes.seen.length = 0;
    // Sin ataque enemigo cercano, es un error normal.
    app.R.notes = [];
    app.wrongPress(0);
    assert.ok(!clashes.seen.some(([type]) => type === "sound:clash"));
    // Una tecla defensiva equivocada tampoco es un choque de golpes.
    app.R.notes = [{ l: 4, t: app.R.t + 0.2, T: 1, role: "def", ai: 1 }];
    app.wrongPress(5);
    assert.ok(!clashes.seen.some(([type]) => type === "sound:clash"));
  } finally {
    clashes.stop();
  }
  assert.equal(typeof app.S.clash, "function", "el sonido existe");
});
