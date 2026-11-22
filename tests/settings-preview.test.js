import test from "node:test";
import assert from "node:assert/strict";
import { loadApplication } from "./helpers/browser-stub.js";

const app = await loadApplication();

// Captura los cuadros de animación que los paneles piden al navegador.
function captureFrames() {
  const queue = [];
  const original = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (fn) => (queue.push(fn), queue.length);
  return {
    queue,
    restore: () => (globalThis.requestAnimationFrame = original),
    step(ms) {
      const callbacks = queue.splice(0);
      for (const fn of callbacks) fn(performance.now() + ms);
    },
  };
}

test("darken devuelve una versión oscura válida y tolera colores inválidos", () => {
  assert.equal(app.darken("#ffffff"), "#737373");
  assert.equal(app.darken("#000000"), "#000000");
  assert.equal(app.darken("rojo"), "#173d12");
});

test("el color libre acepta cualquier #rrggbb y rechaza el resto", () => {
  app.setFightStyles({});
  app.newMatch();
  assert.ok(app.setPlayerColor("#12abef"));
  assert.equal(app.playerColor, "#12abef");
  assert.equal(app.R.p.col, "#12abef");
  assert.equal(app.R.p.dk, app.darken("#12abef"));
  assert.equal(app.DM.p.col, "#12abef");
  assert.equal(app.$("colorPick").value, "#12abef");
  for (const bad of ["#12abe", "12abef", "#gggggg", "", null, undefined, "#12abef; x"]) {
    assert.equal(app.setPlayerColor(bad), false, String(bad));
    assert.equal(app.playerColor, "#12abef", "no cambia con " + String(bad));
  }
  app.setPlayerColor("#69ff36");
});

test("la vista previa de edición anima a los luchadores reales y respeta el color elegido", () => {
  const frames = captureFrames();
  const drawn = [];
  const original = app.drawF;
  app.drawF = (f, ...rest) => (drawn.push(f), original(f, ...rest));
  try {
    app.setPlayerColor("#ff8800");
    app.$("editPanel").classList.add("show");
    app.stickPreview();
    for (let i = 0; i < 40; i++) frames.step(i * 40);
    assert.ok(drawn.length >= 2, "dibuja ambos luchadores");
    assert.equal(app.PV.p.style, app.DEFAULT_STYLE, "mismo estilo que el juego");
    assert.equal(app.PV.p.col, "#ff8800", "color elegido en vivo");
    assert.equal(app.PV.p.dk, app.darken("#ff8800"));
    assert.ok(drawn.includes(app.PV.p) && drawn.includes(app.PV.e));
    // Las animaciones usan el sistema nuevo: terminan y vuelven a reposo.
    app.PV.p.an = "jab";
    app.PV.p.at = 0;
    for (let i = 0; i < 40; i++) frames.step(2000 + i * 40);
    assert.ok(app.animationName(app.PV.p) !== "gif_jab" || app.PV.p.at < 0.4, "el golpe no se queda atascado");
  } finally {
    app.drawF = original;
    app.$("editPanel").classList.remove("show");
    frames.restore();
    app.setPlayerColor("#69ff36");
  }
});

test("la vista previa de ARENA dibuja los luchadores del juego, no figuras aparte", () => {
  const frames = captureFrames();
  const drawn = [];
  const original = app.drawF;
  app.drawF = (f, aura, gy, s) => drawn.push({ f, gy, s });
  try {
    app.setPlayerColor("#00c8ff");
    const canvas = app.$("arenaPrev");
    canvas.isConnected = true;
    canvas.width = 320;
    canvas.height = 120;
    app.cfgKind = "arena";
    app.environment = "off";
    app.$("configHub").classList.add("show");
    app.arenaPreview();
    for (let i = 0; i < 10; i++) frames.step(i * 100);
    assert.ok(drawn.length >= 2, "se dibujaron luchadores");
    const players = drawn.filter((d) => d.f.face === 1), rivals = drawn.filter((d) => d.f.face === -1);
    assert.ok(players.length && rivals.length);
    assert.equal(players[0].f.col, "#00c8ff", "con el color del jugador");
    assert.equal(players[0].f.style, app.DEFAULT_STYLE);
    assert.ok(players[0].f.x < rivals[0].f.x, "cara a cara");
    assert.ok(players[0].s > 0.4 && players[0].gy > 60 && players[0].gy < 120, "escala y suelo dentro del recuadro");
  } finally {
    app.drawF = original;
    app.cfgKind = "";
    app.$("configHub").classList.remove("show");
    frames.restore();
    app.setPlayerColor("#69ff36");
  }
});
